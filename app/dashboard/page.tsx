"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { Send, Image as ImageIcon, User, MoreVertical } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Types now include the "profiles" data (the join)
type Message = {
    id: string;
    content: string;
    user_id: string;
    created_at: string;
    profiles: {
        full_name: string | null;
        avatar_url: string | null;
    } | null;
};

export default function Dashboard() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [userId, setUserId] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const supabase = createClient();

    // 1. Load User & Initial Messages
    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) setUserId(user.id);
        };
        getUser();

        // Fetch existing messages (MANUAL JOIN FIX)
        const fetchMessages = async () => {
            // 1. Fetch raw messages first
            const { data: rawMessages, error } = await supabase
                .from("messages")
                .select("*")
                .order("created_at", { ascending: true });

            if (error || !rawMessages) {
                console.error("Error fetching messages:", error);
                return;
            }

            // 2. Collect all unique User IDs from the messages
            const userIds = Array.from(new Set(rawMessages.map((m) => m.user_id)));

            if (userIds.length === 0) {
                setMessages(rawMessages as any);
                return;
            }

            // 3. Fetch profiles for those users
            const { data: profiles } = await supabase
                .from("profiles")
                .select("id, full_name, avatar_url")
                .in("id", userIds);

            // 4. Create a quick lookup map (User ID -> Profile Data)
            const profileMap = new Map();
            profiles?.forEach((p) => profileMap.set(p.id, p));

            // 5. Merge messages with their profile data
            const mergedMessages = rawMessages.map((msg) => ({
                ...msg,
                profiles: profileMap.get(msg.user_id) || null,
            }));

            setMessages(mergedMessages);
        };

        fetchMessages();

        // 2. Realtime Listener (With "Who is this?" Logic)
        const channel = supabase
            .channel("realtime messages")
            .on(
                "postgres_changes",
                { event: "INSERT", schema: "public", table: "messages" },
                async (payload) => {
                    // When a new message comes, we only have the ID. 
                    // We must quickly fetch the sender's face.
                    const { data: profileData } = await supabase
                        .from('profiles')
                        .select('full_name, avatar_url')
                        .eq('id', payload.new.user_id)
                        .single();

                    const newMsg = {
                        ...payload.new,
                        profiles: profileData
                    } as Message;

                    setMessages((current) => [...current, newMsg]);
                }
            )
            .subscribe();

        // 3. LISTEN FOR PROFILE UPDATES (The "Live Change" Logic)
        const profileChannel = supabase
            .channel("realtime profiles")
            .on(
                "postgres_changes",
                { event: "UPDATE", schema: "public", table: "profiles" },
                (payload) => {
                    const updatedProfile = payload.new;
                    setMessages((current) =>
                        current.map((msg) => {
                            if (msg.user_id === updatedProfile.id) {
                                return {
                                    ...msg,
                                    profiles: {
                                        full_name: updatedProfile.full_name,
                                        avatar_url: updatedProfile.avatar_url,
                                    },
                                };
                            }
                            return msg;
                        })
                    );
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
            supabase.removeChannel(profileChannel);
        };
    }, []);

    // 3. Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        const textToSend = newMessage;
        setNewMessage(""); // Clear input immediately

        const { error } = await supabase.from("messages").insert({
            content: textToSend,
            user_id: userId,
        });

        if (error) console.error("Error sending:", error);
    };

    return (
        <div className="flex flex-col h-screen bg-[#0a0a0a] text-white font-sans">

            {/* HEADER */}
            <div className="h-16 border-b border-zinc-800 flex items-center justify-between px-6 bg-[#0a0a0a]/80 backdrop-blur-md sticky top-0 z-10">
                <div>
                    <h1 className="font-serif text-2xl bg-gradient-to-r from-[#FF6B91] to-[#A67CFF] bg-clip-text text-transparent">
                        Luvly Lounge
                    </h1>
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                        <p className="text-xs text-zinc-500 font-medium">Global Chat • {messages.length} msgs</p>
                    </div>
                </div>
                <button className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
                    <MoreVertical size={20} className="text-zinc-400" />
                </button>
            </div>

            {/* CHAT AREA */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                <AnimatePresence initial={false}>
                    {messages.map((msg, index) => {
                        const isMe = msg.user_id === userId;
                        // Check if previous message was same user (to group bubbles)
                        const isSequence = index > 0 && messages[index - 1].user_id === msg.user_id;

                        return (
                            <motion.div
                                key={msg.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`flex gap-3 ${isMe ? "justify-end" : "justify-start"}`}
                            >
                                {/* AVATAR (Only show for others, and only if not a sequence) */}
                                {!isMe && (
                                    <div className={`w-8 h-8 flex-shrink-0 ${isSequence ? "opacity-0" : ""}`}>
                                        {msg.profiles?.avatar_url ? (
                                            <img
                                                src={msg.profiles.avatar_url}
                                                className="w-full h-full rounded-full object-cover border border-zinc-800"
                                                alt="Avatar"
                                            />
                                        ) : (
                                            <div className="w-full h-full rounded-full bg-zinc-800 flex items-center justify-center">
                                                <User size={14} className="text-zinc-500" />
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className={`flex flex-col ${isMe ? "items-end" : "items-start"} max-w-[75%]`}>
                                    {/* Name Label (Only if not me and not sequence) */}
                                    {!isMe && !isSequence && (
                                        <span className="text-[10px] text-zinc-500 mb-1 ml-1 uppercase tracking-wider font-bold">
                                            {msg.profiles?.full_name || "Anonymous"}
                                        </span>
                                    )}

                                    {/* Bubble */}
                                    <div
                                        className={`px-4 py-2 text-sm leading-relaxed shadow-sm ${isMe
                                            ? "bg-[#FF6B91] text-black font-medium rounded-2xl rounded-tr-sm"
                                            : "bg-[#1A1A1A] border border-zinc-800 text-zinc-200 rounded-2xl rounded-tl-sm"
                                            }`}
                                    >
                                        {msg.content}
                                    </div>

                                    {/* Timestamp (Optional: Could add later) */}
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
                <div ref={messagesEndRef} />
            </div>

            {/* INPUT AREA */}
            <div className="p-4 bg-[#0a0a0a] border-t border-zinc-800">
                <form onSubmit={handleSendMessage} className="flex gap-3 max-w-4xl mx-auto items-end">
                    <button type="button" className="p-3 text-zinc-500 hover:text-[#FF6B91] transition-colors rounded-full hover:bg-zinc-900">
                        <ImageIcon size={22} />
                    </button>

                    <div className="flex-1 bg-[#161616] border border-zinc-800 rounded-2xl px-4 py-3 focus-within:border-[#FF6B91]/50 transition-colors flex items-center">
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Type something..."
                            className="bg-transparent w-full text-white placeholder-zinc-600 focus:outline-none"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={!newMessage.trim()}
                        className="bg-[#FF6B91] disabled:bg-zinc-800 disabled:text-zinc-600 hover:bg-[#ff5580] text-black p-3 rounded-full transition-all shadow-lg shadow-[#FF6B91]/20"
                    >
                        <Send size={20} className={newMessage.trim() ? "ml-0.5" : ""} />
                    </button>
                </form>
            </div>
        </div>
    );
}
