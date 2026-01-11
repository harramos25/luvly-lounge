"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { useParams, useRouter } from "next/navigation";
import { Send, MoreVertical, ShieldAlert, UserPlus, ArrowLeft, XCircle } from "lucide-react";

export default function ChatRoom() {
    const { id } = useParams(); // Get conversation ID from URL
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [partner, setPartner] = useState<any>(null);
    const [friendStatus, setFriendStatus] = useState<string | null>(null);
    const [userId, setUserId] = useState("");

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const supabase = createClient();
    const router = useRouter();

    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            setUserId(user.id);

            // 1. Fetch Chat Info & Partner Profile
            const { data: conv } = await supabase
                .from("conversations")
                .select(`
          *,
          conversation_participants (
            user_id,
            profiles ( id, full_name, avatar_url )
          )
        `)
                .eq("id", id)
                .single();

            if (conv) {
                // Find the OTHER person
                const otherParticipant = conv.conversation_participants.find((p: any) => p.user_id !== user.id);
                if (otherParticipant) {
                    setPartner(otherParticipant.profiles);
                    checkFriendStatus(user.id, otherParticipant.user_id);
                }
            }

            // 2. Load Messages
            const { data: msgs } = await supabase
                .from("direct_messages")
                .select("*")
                .eq("conversation_id", id)
                .order("created_at", { ascending: true });

            if (msgs) setMessages(msgs);

            // 3. Realtime Listener
            const channel = supabase
                .channel(`chat-${id}`)
                .on(
                    "postgres_changes",
                    { event: "INSERT", schema: "public", table: "direct_messages", filter: `conversation_id=eq.${id}` },
                    (payload) => {
                        setMessages((prev) => [...prev, payload.new]);
                    }
                )
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        };

        init();
    }, [id]);

    // Auto-scroll
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const checkFriendStatus = async (myId: string, theirId: string) => {
        const { data } = await supabase
            .from("friends")
            .select("status")
            .or(`and(user_a.eq.${myId},user_b.eq.${theirId}),and(user_a.eq.${theirId},user_b.eq.${myId})`)
            .single();
        if (data) setFriendStatus(data.status);
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        const text = newMessage;
        setNewMessage("");

        await supabase.from("direct_messages").insert({
            conversation_id: id,
            sender_id: userId,
            content: text
        });

        // Update conversation timestamp (so it goes to top of list)
        await supabase.from("conversations").update({ updated_at: new Date() }).eq("id", id);
    };

    const handleAddFriend = async () => {
        if (!partner) return;
        await supabase.from("friends").insert({ user_a: userId, user_b: partner.id, status: 'pending' });
        setFriendStatus('pending');
        alert("Friend request sent!");
    };

    const handleReport = async () => {
        if (!partner) return;
        const reason = prompt("Why are you reporting this user? (Harassment, Fake, etc)");
        if (reason) {
            await supabase.from("reports").insert({
                reporter_id: userId,
                reported_id: partner.id,
                reason: reason
            });
            alert("Report submitted. An admin will review this.");
            router.push('/dashboard/match'); // Leave chat immediately
        }
    };

    const handleSkip = () => {
        if (confirm("Are you sure you want to leave?")) {
            router.push('/dashboard/match');
        }
    };

    return (
        <div className="flex flex-col h-screen bg-black text-white">

            {/* HEADER */}
            <div className="h-16 border-b border-zinc-800 flex items-center justify-between px-4 bg-[#111]">
                <div className="flex items-center gap-3">
                    <button onClick={() => router.back()} className="p-2 hover:bg-zinc-800 rounded-full">
                        <ArrowLeft size={20} />
                    </button>

                    <div className="w-10 h-10 rounded-full bg-zinc-800 overflow-hidden">
                        {partner?.avatar_url && <img src={partner.avatar_url} className="w-full h-full object-cover" />}
                    </div>
                    <div>
                        <h2 className="font-bold text-sm">{partner?.full_name || "Loading..."}</h2>
                        {friendStatus === 'pending' && <span className="text-[10px] text-zinc-500">Request Sent</span>}
                        {friendStatus === 'accepted' && <span className="text-[10px] text-green-500">Friend</span>}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {!friendStatus && (
                        <button onClick={handleAddFriend} className="p-2 bg-[#FF6B91]/10 text-[#FF6B91] rounded-full hover:bg-[#FF6B91]/20" title="Add Friend">
                            <UserPlus size={18} />
                        </button>
                    )}
                    <button onClick={handleReport} className="p-2 text-zinc-500 hover:text-red-500 transition-colors" title="Report">
                        <ShieldAlert size={18} />
                    </button>
                    <button onClick={handleSkip} className="px-3 py-1.5 bg-zinc-800 text-xs rounded-lg hover:bg-zinc-700 ml-2">
                        Skip
                    </button>
                </div>
            </div>

            {/* MESSAGES */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg) => {
                    const isMe = msg.sender_id === userId;
                    return (
                        <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                            <div className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm ${isMe ? "bg-[#FF6B91] text-black" : "bg-[#1A1A1A] border border-zinc-800"
                                }`}>
                                {msg.content}
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* INPUT */}
            <form onSubmit={handleSendMessage} className="p-4 bg-black border-t border-zinc-800 flex gap-2">
                <input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Say something nice..."
                    className="flex-1 bg-[#111] border border-zinc-800 rounded-full px-4 py-3 focus:border-[#FF6B91] outline-none"
                />
                <button type="submit" disabled={!newMessage.trim()} className="p-3 bg-[#FF6B91] rounded-full text-black hover:scale-105 transition-transform">
                    <Send size={20} />
                </button>
            </form>

        </div>
    );
}
