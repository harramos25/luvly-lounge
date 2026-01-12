"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { MessageCircle, Search, UserPlus, Check, X, User } from "lucide-react";
import Link from "next/link";

type Conversation = {
    id: string;
    updated_at: string;
    participants: {
        user_id: string;
        profiles: {
            full_name: string;
            avatar_url: string;
        };
    }[];
};

type FriendRequest = {
    id: string;
    user_a: string; // The person who sent the request
    profiles: {
        full_name: string;
        avatar_url: string;
    };
};

export default function ChatsPage() {
    const [activeTab, setActiveTab] = useState<"inbox" | "requests">("inbox");
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [requests, setRequests] = useState<FriendRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState("");
    const supabase = createClient();

    useEffect(() => {
        loadData();
    }, [activeTab]); // Reload when switching tabs

    const loadData = async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        setUserId(user.id);

        if (activeTab === "inbox") {
            // 1. GET FRIEND IDS FIRST (We only want to show chats with Accepted Friends)
            const { data: friendsA } = await supabase.from("friends").select("user_b").eq("user_a", user.id).eq("status", "accepted");
            const { data: friendsB } = await supabase.from("friends").select("user_a").eq("user_b", user.id).eq("status", "accepted");

            const friendIds = new Set([
                ...(friendsA?.map(f => f.user_b) || []),
                ...(friendsB?.map(f => f.user_a) || [])
            ]);

            // 2. LOAD CHATS
            const { data: myChats } = await supabase.from("conversation_participants").select("conversation_id").eq("user_id", user.id);

            if (myChats && myChats.length > 0) {
                const chatIds = myChats.map(c => c.conversation_id);
                const { data: fullChats } = await supabase
                    .from("conversations")
                    .select(`
            id, updated_at,
            conversation_participants ( user_id, profiles ( full_name, avatar_url ) )
          `)
                    .in("id", chatIds)
                    .order("updated_at", { ascending: false });

                if (fullChats) {
                    // Filter: Only keep chats where the OTHER participant is in 'friendIds'
                    const formatted = fullChats
                        .map((chat: any) => {
                            const participants = chat.conversation_participants.filter((p: any) => p.user_id !== user.id);
                            return {
                                id: chat.id,
                                updated_at: chat.updated_at,
                                participants: participants,
                                otherUserId: participants[0]?.user_id
                            };
                        })
                        .filter(chat => chat.otherUserId && friendIds.has(chat.otherUserId)); // <--- THE FILTER

                    setConversations(formatted);
                }
            }
        } else {
            // 2. LOAD FRIEND REQUESTS
            // We look for rows where user_b is ME and status is 'pending'
            // We also need the profile of user_a (the sender)
            const { data: rawRequests } = await supabase
                .from("friends")
                .select(`
          id, user_a,
          profiles:user_a ( full_name, avatar_url )
        `)
                .eq("user_b", user.id)
                .eq("status", "pending");

            if (rawRequests) {
                // @ts-ignore (Supabase types can be tricky with joins, this simplifies it)
                setRequests(rawRequests);
            }
        }
        setLoading(false);
    };

    const handleAccept = async (requestId: string, senderId: string) => {
        // 1. Accept Friend
        await supabase.from("friends").update({ status: 'accepted' }).eq("id", requestId);

        // 2. Remove from UI
        setRequests(prev => prev.filter(r => r.id !== requestId));

        // 3. Ensure Conversation Exists (So they appear in Inbox immediately)
        const { data: myChats } = await supabase
            .from('conversation_participants')
            .select('conversation_id')
            .eq('user_id', userId);

        const myChatIds = myChats?.map(c => c.conversation_id) || [];

        if (myChatIds.length > 0) {
            const { data: existing } = await supabase
                .from('conversation_participants')
                .select('conversation_id')
                .eq('user_id', senderId)
                .in('conversation_id', myChatIds)
                .single();

            if (existing) {
                alert("Friend Added! Chat available in Inbox. 🎉");
                return;
            }
        }

        // If no existing chat, create one!
        const { data: newChat } = await supabase.from('conversations').insert({}).select().single();
        if (newChat) {
            await supabase.from('conversation_participants').insert([
                { conversation_id: newChat.id, user_id: userId },
                { conversation_id: newChat.id, user_id: senderId }
            ]);
        }

        alert("Friend Added! New chat created in Inbox. 🎉");
    };

    const handleDecline = async (requestId: string) => {
        await supabase.from("friends").delete().eq("id", requestId);
        setRequests(prev => prev.filter(r => r.id !== requestId));
    };

    return (
        <div className="h-full flex flex-col bg-black text-white p-6">
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-3xl font-serif text-[#FF6B91]">Messages</h1>
            </div>

            {/* TABS */}
            <div className="flex gap-4 mb-6 border-b border-zinc-800 pb-1">
                <button
                    onClick={() => setActiveTab("inbox")}
                    className={`pb-3 text-sm font-bold transition-colors relative ${activeTab === "inbox" ? "text-white" : "text-zinc-500 hover:text-zinc-300"
                        }`}
                >
                    Inbox
                    {activeTab === "inbox" && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[#FF6B91]" />}
                </button>
                <button
                    onClick={() => setActiveTab("requests")}
                    className={`pb-3 text-sm font-bold transition-colors relative ${activeTab === "requests" ? "text-white" : "text-zinc-500 hover:text-zinc-300"
                        }`}
                >
                    Requests
                    {requests.length > 0 && <span className="ml-2 bg-[#FF6B91] text-black text-[10px] px-1.5 rounded-full">{requests.length}</span>}
                    {activeTab === "requests" && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[#FF6B91]" />}
                </button>
            </div>

            {/* SEARCH BAR (Only for Inbox) */}
            {activeTab === "inbox" && (
                <div className="relative mb-6">
                    <Search className="absolute left-4 top-3.5 text-zinc-500" size={18} />
                    <input
                        placeholder="Search messages..."
                        className="w-full bg-[#111] border border-zinc-800 rounded-xl py-3 pl-12 pr-4 text-white focus:border-[#FF6B91] outline-none"
                    />
                </div>
            )}

            {/* CONTENT AREA */}
            <div className="flex-1 overflow-y-auto space-y-2">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-40">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#FF6B91]"></div>
                    </div>
                ) : activeTab === "inbox" ? (
                    // --- INBOX VIEW ---
                    conversations.length === 0 ? (
                        <div className="text-center mt-20 opacity-50">
                            <MessageCircle size={48} className="mx-auto mb-4 text-zinc-600" />
                            <p className="text-zinc-400">No messages yet.</p>
                        </div>
                    ) : (
                        conversations.map((chat) => {
                            const partner = chat.participants[0]?.profiles;
                            return (
                                <Link key={chat.id} href={`/dashboard/chats/${chat.id}`}>
                                    <div className="flex items-center gap-4 p-4 rounded-2xl hover:bg-[#111] transition-colors cursor-pointer group">
                                        <div className="w-12 h-12 rounded-full bg-zinc-800 overflow-hidden border border-zinc-700 group-hover:border-zinc-500 transition-colors shrink-0">
                                            {partner?.avatar_url ? (
                                                <img src={partner.avatar_url} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-zinc-600"><User size={20} /></div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold text-white truncate">{partner?.full_name || "Unknown"}</h3>
                                            <p className="text-xs text-zinc-500 truncate">Tap to chat</p>
                                        </div>
                                        <div className="text-xs text-zinc-600">
                                            {new Date(chat.updated_at).toLocaleDateString()}
                                        </div>
                                    </div>
                                </Link>
                            );
                        })
                    )
                ) : (
                    // --- REQUESTS VIEW ---
                    requests.length === 0 ? (
                        <div className="text-center mt-20 opacity-50">
                            <UserPlus size={48} className="mx-auto mb-4 text-zinc-600" />
                            <p className="text-zinc-400">No pending requests.</p>
                        </div>
                    ) : (
                        requests.map((req: any) => (
                            <div key={req.id} className="flex items-center justify-between p-4 bg-[#111] rounded-2xl border border-zinc-800">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-zinc-800 overflow-hidden shrink-0">
                                        {req.profiles?.avatar_url ? (
                                            <img src={req.profiles.avatar_url} className="w-full h-full object-cover" />
                                        ) : (
                                            <User className="w-5 h-5 m-2.5 text-zinc-500" />
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-sm text-white">{req.profiles?.full_name}</h3>
                                        <p className="text-[10px] text-zinc-500">Wants to connect</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => handleDecline(req.id)} className="p-2 bg-zinc-800 rounded-full hover:bg-red-900/50 text-zinc-400 hover:text-red-400 transition-colors">
                                        <X size={18} />
                                    </button>
                                    <button onClick={() => handleAccept(req.id, req.user_a)} className="p-2 bg-[#FF6B91] rounded-full hover:bg-[#ff5580] text-black transition-colors">
                                        <Check size={18} />
                                    </button>
                                </div>
                            </div>
                        ))
                    )
                )}
            </div>
        </div>
    );
}
