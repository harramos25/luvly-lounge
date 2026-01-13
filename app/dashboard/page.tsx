"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { Zap as ZapIcon, Search, Loader2, XCircle } from "lucide-react";

const INTEREST_TAGS = [
    "Tech", "Art", "Gaming", "Fashion", "Beauty", "Books",
    "Fitness", "Travel", "Music", "Movies", "Cooking",
    "Astrology", "Business", "Mental Health", "DIY", "Politics"
];

export default function MatchLobby() {
    const [loading, setLoading] = useState(false);
    const [myInterests, setMyInterests] = useState<string[]>([]);
    const [userId, setUserId] = useState("");

    const supabase = createClient();
    const router = useRouter();

    const [status, setStatus] = useState<'idle' | 'searching' | 'matched'>('idle');
    const [searchInterval, setSearchInterval] = useState<NodeJS.Timeout | null>(null);
    const hasRedirected = useRef(false);

    // Refs for Cleanup (to avoid dependency cycle causing premature 'offline' status)
    const userIdRef = useRef(userId);
    const intervalRef = useRef(searchInterval);

    useEffect(() => { userIdRef.current = userId; }, [userId]);
    useEffect(() => { intervalRef.current = searchInterval; }, [searchInterval]);

    // 🛑 CLEANUP: Only on UNMOUNT
    useEffect(() => {
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
            // We need to construct a new client or use the existing one? Existing is fine in closure?
            // Actually 'supabase' const is stable? Yes.
            if (userIdRef.current) {
                supabase.from("profiles").update({ match_status: 'offline' }).eq("id", userIdRef.current).then(() => { });
            }
        };
    }, []);

    // 👂 PASSIVE LISTENER: Did someone pick ME?
    useEffect(() => {
        if (!userId) return;

        const channel = supabase
            .channel(`match-listener-${userId}`)
            .on(
                "postgres_changes",
                { event: "INSERT", schema: "public", table: "conversation_participants", filter: `user_id=eq.${userId}` },
                async (payload) => {
                    // Only react if we are searching (or idle, technically someone could add us as friend, but we treat new convs as matches contextually in lobby)
                    // Actually, friend requests create conversations only after ACCEPT. 
                    // New conversations strictly mean a Match (or accepted friend).
                    // If we are 'searching', this is definitely a match.
                    if (status === 'searching' && !hasRedirected.current) {
                        console.log("Someone matched ME! Redirecting...");
                        hasRedirected.current = true;
                        if (searchInterval) clearInterval(searchInterval);

                        // Wait a sec for the system message to populate?
                        // Actually, just go.
                        router.push(`/dashboard/chats/${payload.new.conversation_id}`);
                    }
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [userId, status, searchInterval]);

    const toggleInterest = (tag: string) => {
        console.log("Toggling interest:", tag);
        if (myInterests.includes(tag)) {
            setMyInterests(prev => prev.filter(t => t !== tag));
        } else {
            setMyInterests(prev => [...prev, tag]);
        }
    };

    const startSearch = async () => {
        let currentUserId = userId;

        // 🛡️ SELF-HEALING: If state is missing, fetch fresh from Supabase
        if (!currentUserId) {
            console.warn("State userId missing. Fetching fresh...");
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                currentUserId = user.id;
                setUserId(user.id); // Update state for next time
            } else {
                alert("⚠️ Session expired. Please login again.");
                router.push('/login');
                return;
            }
        }

        if (!currentUserId) {
            alert("⚠️ SYSTEM ERROR: User ID is truly missing.");
            return;
        }

        setStatus('searching');
        hasRedirected.current = false;

        // 1. Update Profile (Interests + Searching Status)
        await supabase.from("profiles").update({
            interests: myInterests,
            match_status: 'searching'
        }).eq("id", currentUserId);

        // 2. Start Polling Loop (Active Search)
        const interval = setInterval(async () => {
            await performMatchAttempt(currentUserId);
        }, 3000);
        setSearchInterval(interval);
        intervalRef.current = interval;

        // Try immediately once
        await performMatchAttempt(currentUserId);
    };

    const performMatchAttempt = async (overrideId?: string) => {
        const uid = overrideId || userId;
        if (!uid || hasRedirected.current) return;

        // 🔍 CHECK 1: DID SOMEONE FIND ME? (Passive Check)
        // If my status changed to 'busy' while I was sleeping, someone grabbed me.
        const { data: myProfile } = await supabase
            .from("profiles")
            .select("match_status")
            .eq("id", uid)
            .single();

        if (myProfile?.match_status === 'busy') {
            console.log("Status changed to BUSY! Someone found me. Redirecting...");
            hasRedirected.current = true;
            if (searchInterval) clearInterval(searchInterval);

            // Find the room they created for me
            const { data: parts } = await supabase
                .from("conversation_participants")
                .select("conversation_id")
                .eq("user_id", uid)
                .order("created_at", { ascending: false })
                .limit(1)
                .single();

            if (parts) {
                router.push(`/dashboard/chats/${parts.conversation_id}`);
            }
            return;
        }

        // 🔍 CHECK 2: CAN I FIND SOMEONE? (Active Search)
        console.log("Attempting to find match for:", uid);
        const { data, error } = await supabase.rpc('find_match', {
            p_user_id: uid,
            p_interests: myInterests
        });

        if (error) {
            console.error("Match error:", error);
            return;
        }

        // FOUND SOMEONE?
        if (data && data.length > 0) {
            const match = data[0]; // { matched_user_id, common_interest }
            console.log("MATCH FOUND!", match);
            hasRedirected.current = true;

            // Stop polling
            if (searchInterval) clearInterval(searchInterval);

            await createMatchConversation(match.matched_user_id, match.common_interest, uid);
        } else {
            console.log("No match yet... waiting.");
        }
    };

    const createMatchConversation = async (partnerId: string, commonInterest: string | null, uid: string) => {
        // 1. Create Conversation
        const { data: newConv } = await supabase.from("conversations").insert({}).select().single();
        if (!newConv) return;

        // 2. Add Participants
        await supabase.from("conversation_participants").insert([
            { conversation_id: newConv.id, user_id: uid },
            { conversation_id: newConv.id, user_id: partnerId }
        ]);

        // 3. Greeting Message
        let greeting = "You are chatting with a stranger. Say hi! 👋";
        if (commonInterest) {
            greeting = `You matched based on ${commonInterest}! 🌟`;
        }

        await supabase.from("direct_messages").insert({
            conversation_id: newConv.id,
            sender_id: uid, // Use passed UID
            content: `[SYSTEM] ${greeting}`
        });

        // 4. Redirect
        router.push(`/dashboard/chats/${newConv.id}`);
    };

    const cancelSearch = async () => {
        setStatus('idle');
        if (searchInterval) clearInterval(searchInterval);
        await supabase.from("profiles").update({ match_status: 'online' }).eq("id", userId);
    };

    return (
        <div className="min-h-screen bg-yankees-blue text-white p-6 md:p-12">
            <div className="max-w-4xl mx-auto text-center space-y-12">

                {/* Header */}
                <div>
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-tr from-pictorial-carmine to-razzmatazz mb-6 shadow-lg shadow-razzmatazz/40">
                        <ZapIcon size={32} className="text-white" />
                    </div>
                    <h1 className="text-4xl md:text-5xl font-serif font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-queen-pink">
                        Chat with Strangers
                    </h1>
                    <p className="text-queen-pink/70 mt-4 text-lg">
                        Select your interests and connect instantly with a random stranger.
                    </p>
                </div>

                {/* Interest Selector */}
                <div className="bg-black/20 border border-white/10 rounded-3xl p-8 relative z-40">
                    <h3 className="text-sm font-bold text-queen-pink/50 uppercase tracking-widest mb-6">Current Interests</h3>
                    <div className="flex flex-wrap justify-center gap-3">
                        {INTEREST_TAGS.map((tag) => (
                            <button
                                key={tag}
                                onClick={() => toggleInterest(tag)}
                                className={`px-6 py-3 rounded-full text-sm font-medium transition-all relative z-50 cursor-pointer active:scale-95 ${myInterests.includes(tag)
                                    ? "bg-razzmatazz text-white shadow-lg shadow-razzmatazz/20 scale-105"
                                    : "bg-white/5 text-queen-pink/60 border border-white/5 hover:border-queen-pink/30 hover:bg-white/10"
                                    }`}
                            >
                                {tag}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Big Action Button */}
                {status === 'searching' ? (
                    <button
                        onClick={cancelSearch}
                        className="group relative z-50 inline-flex items-center justify-center px-8 py-5 text-lg font-bold text-white transition-all duration-200 bg-pictorial-carmine/20 border border-pictorial-carmine rounded-full hover:bg-pictorial-carmine hover:text-white w-full md:w-auto min-w-[300px]"
                    >
                        <span className="flex items-center gap-2">
                            <XCircle size={20} /> Cancel Search
                        </span>
                        <span className="absolute -bottom-8 text-xs text-queen-pink/50 animate-pulse">
                            Searching for a match...
                        </span>
                    </button>
                ) : (
                    <button
                        onClick={startSearch}
                        className="group relative z-50 inline-flex items-center justify-center px-8 py-5 text-lg font-bold text-yankees-blue transition-all duration-200 bg-white rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white hover:bg-queen-pink shadow-[0_0_20px_rgba(255,255,255,0.3)] w-full md:w-auto min-w-[300px] active:scale-95"
                    >
                        <span className="flex items-center gap-2">
                            <Search size={20} /> Start New Chat
                        </span>
                    </button>
                )}

                {/* DEBUG PANEL (Temporary) */}
                <div className="mt-12 p-4 bg-zinc-900/50 rounded-xl text-xs font-mono text-left text-zinc-500 overflow-hidden">
                    <p className="font-bold text-zinc-300 mb-2">🚧 DEBUG PANEL</p>
                    <p>User ID: {userId || "MISSING"}</p>
                    <p>Status: {status}</p>
                    <p>Interests: {myInterests.join(", ") || "None"}</p>
                    <p>Has Redirected: {hasRedirected.current ? "YES" : "NO"}</p>
                </div>

            </div>
        </div>
    );
}
