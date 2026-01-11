"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { Send, Image as ImageIcon, Smile } from "lucide-react";
import { motion } from "framer-motion";

type Message = {
    id: string;
    content: string;
    user_id: string;
    created_at: string;
    profile_id: string;
};

export default function Dashboard() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [userId, setUserId] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const supabase = createClient();

    // 1. Load Initial Data & Subscribe to Realtime
    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) setUserId(user.id);
        };
        getUser();

        // Fetch existing messages
        const fetchMessages = async () => {
            const { data } = await supabase
                .from("messages")
                .select("*")
                .order("created_at", { ascending: true });
            if (data) setMessages(data);
        };
        fetchMessages();

        // LISTEN FOR NEW MESSAGES (The Magic Part)
        const channel = supabase
            .channel("realtime messages")
            .on(
                "postgres_changes",
                { event: "INSERT", schema: "public", table: "messages" },
                (payload) => {
                    setMessages((current) => [...current, payload.new as Message]);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    // Auto-scroll to bottom when message arrives
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // 2. Send Message Function
    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        // Optimistic UI: Clear input immediately
        const textToSend = newMessage;
        setNewMessage("");

        const { error } = await supabase.from("messages").insert({
            content: textToSend,
            user_id: userId,
        });

        if (error) console.error("Error sending:", error);
    };

    return (
        <div className="flex flex-col h-screen bg-[#0a0a0a] text-white">
            {/* HEADER */}
            <div className="h-16 border-b border-zinc-800 flex items-center px-6 bg-[#0a0a0a]/50 backdrop-blur-md sticky top-0 z-10">
                <div>
                    <h1 className="font-serif text-xl bg-gradient-to-r from-[#FF6B91] to-[#A67CFF] bg-clip-text text-transparent">
                        General Lounge
                    </h1>
                    <p className="text-xs text-zinc-500">
                        <span className="w-2 h-2 bg-green-500 rounded-full inline-block mr-1"></span>
                        {messages.length} messages loaded
                    </p>
                </div>
            </div>

            {/* CHAT AREA */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {messages.map((msg) => {
                    const isMe = msg.user_id === userId;
                    return (
                        <motion.div
                            key={msg.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                        >
                            <div
                                className={`max-w-[70%] p-4 rounded-2xl text-sm leading-relaxed ${isMe
                                        ? "bg-gradient-to-br from-[#FF6B91] to-[#FF8E72] text-black font-medium rounded-tr-none"
                                        : "bg-[#1A1A1A] border border-zinc-800 text-zinc-200 rounded-tl-none"
                                    }`}
                            >
                                {msg.content}
                            </div>
                        </motion.div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* INPUT AREA */}
            <div className="p-4 bg-[#0a0a0a] border-t border-zinc-800">
                <form onSubmit={handleSendMessage} className="flex gap-2 max-w-4xl mx-auto">
                    <button type="button" className="p-3 text-zinc-400 hover:text-[#FF6B91] transition-colors">
                        <ImageIcon size={20} />
                    </button>

                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 bg-[#111] border border-zinc-800 rounded-full px-6 py-3 text-white focus:outline-none focus:border-[#FF6B91] transition-colors"
                    />

                    <button
                        type="submit"
                        className="bg-[#FF6B91] hover:bg-[#ff5580] text-black p-3 rounded-full transition-transform active:scale-95"
                    >
                        <Send size={20} />
                    </button>
                </form>
            </div>
        </div>
    );
}
