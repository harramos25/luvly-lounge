"use client";

import { useEffect, useState, useRef, KeyboardEvent } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import {
    Zap as ZapIcon,
    Loader2,
    X,
    Plus,
    Instagram,
    Twitter,
    Facebook,
    MessageCircle,
    Search
} from "lucide-react";

export default function MatchLobby() {
    const [inputValue, setInputValue] = useState("");
    const [myInterests, setMyInterests] = useState<string[]>([]);
    const [userId, setUserId] = useState("");
    const [status, setStatus] = useState<'idle' | 'searching' | 'matched'>('idle');
    const [searchInterval, setSearchInterval] = useState<NodeJS.Timeout | null>(null);
    const hasRedirected = useRef(false);

    // Refs for Cleanup
    const userIdRef = useRef(userId);
    const intervalRef = useRef(searchInterval);

    const supabase = createClient();
    const router = useRouter();

    useEffect(() => { userIdRef.current = userId; }, [userId]);
    useEffect(() => { intervalRef.current = searchInterval; }, [searchInterval]);

    // 1. SETUP & CLEANUP
    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push('/login');
                return;
            }
            setUserId(user.id);

            const { data } = await supabase.from("profiles").select("interests, match_status").eq("id", user.id).single();
            if (data?.interests) setMyInterests(data.interests);

            // If was searching, reset to online
            if (data?.match_status === 'searching') {
                await supabase.from("profiles").update({ match_status: 'online' }).eq("id", user.id);
            }
        };
        init();

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
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
                    if (status === 'searching' && !hasRedirected.current) {
                        console.log("Someone matched ME! Redirecting...");
                        hasRedirected.current = true;
                        if (searchInterval) clearInterval(searchInterval);
                        router.push(`/dashboard/chats/${payload.new.conversation_id}`);
                    }
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [userId, status, searchInterval]);

    // --- INTERESTS HANDLERS ---

    const handleAddInterest = async () => {
        const tag = inputValue.trim().toLowerCase();
        if (!tag) return;
        if (myInterests.includes(tag)) {
            setInputValue(""); return;
        }

        // LIMIT: Max 3 tags
        if (myInterests.length >= 3) {
            alert("Free users can add up to 3 interests. Upgrade for more!");
            return;
        }

        const newInterests = [...myInterests, tag];
        setMyInterests(newInterests);
        setInputValue("");
        if (userId) await supabase.from("profiles").update({ interests: newInterests }).eq("id", userId);
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddInterest();
        }
    };

    const handleRemoveInterest = async (tagToRemove: string) => {
        const newInterests = myInterests.filter(tag => tag !== tagToRemove);
        setMyInterests(newInterests);
        if (userId) await supabase.from("profiles").update({ interests: newInterests }).eq("id", userId);
    };

    // --- MATCHING LOGIC ---

    const startSearch = async () => {
        if (myInterests.length === 0) {
            alert("Please add at least one interest to start matching!");
            return;
        }

        let currentUserId = userId;
        if (!currentUserId) {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                currentUserId = user.id;
                setUserId(user.id);
            } else {
                return;
            }
        }

        setStatus('searching');
        hasRedirected.current = false;

        // 1. Update Profile
        await supabase.from("profiles").update({
            interests: myInterests,
            match_status: 'searching'
        }).eq("id", currentUserId);

        // 2. Start Polling Loop
        const interval = setInterval(async () => {
            await performMatchAttempt(currentUserId);
        }, 3000);
        setSearchInterval(interval);
        intervalRef.current = interval;

        // Try immediately
        await performMatchAttempt(currentUserId);
    };

    const performMatchAttempt = async (overrideId?: string) => {
        const uid = overrideId || userId;
        if (!uid || hasRedirected.current) return;

        // 🔍 CHECK 1: DID SOMEONE FIND ME? (Passive Check)
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

        if (data && data.length > 0) {
            const match = data[0];
            console.log("MATCH FOUND!", match);
            hasRedirected.current = true;
            if (searchInterval) clearInterval(searchInterval);
            await createMatchConversation(match.matched_user_id, match.common_interest, uid);
        }
    };

    const createMatchConversation = async (partnerId: string, commonInterest: string | null, uid: string) => {
        const { data: newConv } = await supabase.from("conversations").insert({}).select().single();
        if (!newConv) return;

        await supabase.from("conversation_participants").insert([
            { conversation_id: newConv.id, user_id: uid },
            { conversation_id: newConv.id, user_id: partnerId }
        ]);

        let greeting = "You are chatting with a stranger. Say hi! 👋";
        if (commonInterest) {
            greeting = `You matched based on ${commonInterest}! 🌟`;
        }

        await supabase.from("direct_messages").insert({
            conversation_id: newConv.id,
            sender_id: uid,
            content: `[SYSTEM] ${greeting}`
        });

        router.push(`/dashboard/chats/${newConv.id}`);
    };

    const cancelSearch = async () => {
        setStatus('idle');
        if (searchInterval) clearInterval(searchInterval);
        await supabase.from("profiles").update({ match_status: 'online' }).eq("id", userId);
    };

    return (
        <div className="min-h-screen bg-yankees-blue text-white p-4 flex flex-col items-center relative overflow-hidden font-sans">

            {/* Main Content Container */}
            <div className="flex-1 flex flex-col items-center justify-center w-full max-w-md space-y-8 z-10 pb-24">

                {/* Branding & Socials */}
                <div className="text-center space-y-4">
                    <div className="w-20 h-20 mx-auto bg-gradient-to-tr from-pictorial-carmine to-razzmatazz rounded-3xl flex items-center justify-center shadow-lg shadow-razzmatazz/20">
                        <MessageCircle size={40} className="text-white" />
                    </div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-queen-pink bg-clip-text text-transparent">
                        Luvly Lounge
                    </h1>
                    <div className="flex items-center justify-center gap-4 text-queen-pink/50">
                        <button className="p-2 hover:text-razzmatazz transition-colors"><Instagram size={20} /></button>
                        <button className="p-2 hover:text-white transition-colors"><Twitter size={20} /></button>
                        <button className="p-2 hover:text-razzmatazz transition-colors"><Facebook size={20} /></button>
                    </div>
                </div>

                {/* Interests Section */}
                <div className="w-full space-y-3">
                    <div className="flex justify-between items-center px-1">
                        <h2 className="text-sm font-bold text-queen-pink/70">Your Interests <span className="text-razzmatazz">(Max 3)</span></h2>
                        <span className="text-xs text-queen-pink/50">{myInterests.length}/3</span>
                    </div>

                    <div className="bg-black/20 border border-white/10 rounded-2xl p-3 flex flex-wrap gap-2 min-h-[60px]">
                        {myInterests.map((tag) => (
                            <span key={tag} className="px-3 py-1.5 bg-white/5 rounded-full text-sm text-queen-pink flex items-center gap-2 border border-white/5 group">
                                {tag}
                                <button onClick={() => handleRemoveInterest(tag)} className="text-queen-pink/50 hover:text-razzmatazz">
                                    <X size={14} />
                                </button>
                            </span>
                        ))}
                        {myInterests.length < 3 && (
                            <div className="flex-1 min-w-[120px] flex items-center gap-2 px-2">
                                <Plus size={16} className="text-queen-pink/30" />
                                <input
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Type & Enter..."
                                    className="bg-transparent outline-none text-sm text-white placeholder-queen-pink/30 w-full"
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Gender Filter (Locked for now) */}
                <div className="w-full space-y-3 opacity-60 cursor-not-allowed" title="This app is for women only.">
                    <h2 className="text-sm font-bold text-queen-pink/70 px-1">Gender Filter</h2>
                    <div className="bg-black/20 border border-white/10 rounded-2xl p-1 flex">
                        <div className="flex-1 py-3 text-center bg-white/5 text-queen-pink/50 rounded-xl font-medium text-sm">
                            Women Only
                        </div>
                    </div>
                </div>

            </div>

            {/* Bottom Action Button */}
            <div className="fixed bottom-0 left-0 w-full p-4 bg-gradient-to-t from-yankees-blue to-transparent z-20">
                <div className="max-w-md mx-auto flex gap-3">
                    <button className="p-4 bg-white/5 text-queen-pink rounded-2xl hover:bg-white/10 transition-colors border border-white/5">
                        <ZapIcon size={24} />
                    </button>
                    {status !== 'searching' ? (
                        <button
                            onClick={startSearch}
                            className="flex-1 py-4 bg-gradient-to-r from-pictorial-carmine to-razzmatazz text-white font-bold text-lg rounded-2xl shadow-lg shadow-razzmatazz/20 hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
                        >
                            <MessageCircle fill="currentColor" size={20} /> Start Text Chat
                        </button>
                    ) : (
                        <button
                            onClick={cancelSearch}
                            className="flex-1 py-4 bg-white/10 text-white font-bold text-lg rounded-2xl flex items-center justify-center gap-2 hover:bg-white/15 transition-colors border border-white/10"
                        >
                            <Loader2 className="animate-spin text-razzmatazz" size={20} /> Searching...
                        </button>
                    )}
                </div>
                <p className="text-center text-[10px] text-queen-pink/30 mt-3">
                    Be respectful and follow our chat rules.
                </p>
            </div>

        </div>
    );
}
