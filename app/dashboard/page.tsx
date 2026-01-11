"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { Zap as ZapIcon, Search, Loader2 } from "lucide-react";

const INTEREST_TAGS = [
    "Tech", "Art", "Gaming", "Fashion", "Beauty", "Books",
    "Fitness", "Travel", "Music", "Movies", "Cooking",
    "Astrology", "Business", "Mental Health", "DIY", "Politics"
];

export default function MatchLobby() {
    const [loading, setLoading] = useState(false);
    const [finding, setFinding] = useState(false);
    const [myInterests, setMyInterests] = useState<string[]>([]);
    const [userId, setUserId] = useState("");

    const supabase = createClient();
    const router = useRouter();

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUserId(user.id);
                const { data } = await supabase.from("profiles").select("interests").eq("id", user.id).single();
                if (data?.interests) setMyInterests(data.interests);
            }
            setLoading(false);
        };
        init();
    }, []);

    const toggleInterest = (tag: string) => {
        if (myInterests.includes(tag)) {
            setMyInterests(prev => prev.filter(t => t !== tag));
        } else {
            setMyInterests(prev => [...prev, tag]);
        }
    };

    const findMatch = async () => {
        setFinding(true);

        // Save latest interests first
        await supabase.from("profiles").update({ interests: myInterests }).eq("id", userId);

        try {
            // Strategy: 
            // 1. Get all users who are NOT me.
            // 2. Pick one.
            // 3. Create conversation.
            // 4. Go there.

            // Fetch a random profile (Simple client-side matching for MVP)
            const { data: profiles } = await supabase
                .from("profiles")
                .select("id")
                .neq("id", userId)
                .limit(20);

            if (!profiles || profiles.length === 0) {
                alert("No other users found in the lounge yet. Invite a friend!");
                setFinding(false);
                return;
            }

            const randomPartner = profiles[Math.floor(Math.random() * profiles.length)];

            // Create or Get Conversation
            // Check if exists
            const { data: existingConvs } = await supabase
                .from("conversation_participants")
                .select("conversation_id, user_id")
                .eq("user_id", userId);

            // Fallback: Create new
            const { data: newConv, error: convError } = await supabase
                .from("conversations")
                .insert({})
                .select()
                .single();

            if (convError) throw convError;

            await supabase.from("conversation_participants").insert([
                { conversation_id: newConv.id, user_id: userId },
                { conversation_id: newConv.id, user_id: randomPartner.id }
            ]);

            router.push(`/dashboard/chats/${newConv.id}`);

        } catch (e) {
            console.error(e);
            alert("Error finding match. Please try again.");
            setFinding(false);
        }
    };

    return (
        <div className="min-h-screen bg-black text-white p-6 md:p-12">
            <div className="max-w-4xl mx-auto text-center space-y-12">

                {/* Header */}
                <div>
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-tr from-[#FF6B91] to-[#A67CFF] mb-6 shadow-[0_0_30px_rgba(255,107,145,0.4)]">
                        <ZapIcon size={32} className="text-white" />
                    </div>
                    <h1 className="text-4xl md:text-5xl font-serif font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-500">
                        Chat with Strangers
                    </h1>
                    <p className="text-zinc-400 mt-4 text-lg">
                        Select your interests and connect instantly with a random stranger.
                    </p>
                </div>

                {/* Interest Selector */}
                <div className="bg-[#111] border border-zinc-800 rounded-3xl p-8">
                    <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-6">Current Interests</h3>
                    <div className="flex flex-wrap justify-center gap-3">
                        {INTEREST_TAGS.map((tag) => (
                            <button
                                key={tag}
                                onClick={() => toggleInterest(tag)}
                                className={`px-6 py-3 rounded-full text-sm font-medium transition-all ${myInterests.includes(tag)
                                    ? "bg-[#FF6B91] text-black shadow-lg shadow-[#FF6B91]/20 scale-105"
                                    : "bg-[#1A1A1A] text-zinc-400 border border-zinc-800 hover:border-zinc-600"
                                    }`}
                            >
                                {tag}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Big Action Button */}
                <button
                    onClick={findMatch}
                    disabled={finding || loading}
                    className="group relative inline-flex items-center justify-center px-8 py-5 text-lg font-bold text-black transition-all duration-200 bg-white rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white hover:bg-zinc-200 disabled:opacity-70 disabled:cursor-not-allowed w-full md:w-auto min-w-[300px]"
                >
                    {finding ? (
                        <span className="flex items-center gap-2">
                            <Loader2 className="animate-spin" /> Looking for stranger...
                        </span>
                    ) : (
                        <span className="flex items-center gap-2">
                            <Search size={20} /> Chat with Stranger
                        </span>
                    )}
                    <div className="absolute -inset-3 rounded-full bg-white/20 blur-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>

            </div>
        </div>
    );
}
