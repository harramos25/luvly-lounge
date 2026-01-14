"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { useParams, useRouter } from "next/navigation";
import { useSidebar } from "../../sidebar-context";
import { Send, ShieldAlert, Menu, MoreVertical, Sparkles, Smile, Image as ImageIcon, HeartOff, Zap } from "lucide-react";

export default function ChatRoom() {
    const { id } = useParams();
    const { toggle } = useSidebar();

    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [partner, setPartner] = useState<any>(null);
    const [userId, setUserId] = useState("");
    const [myTier, setMyTier] = useState("FREE");

    const [isSkipped, setIsSkipped] = useState(false);
    const [skipReason, setSkipReason] = useState("");
    const [skipConfirm, setSkipConfirm] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const supabase = createClient();
    const router = useRouter();

    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            setUserId(user.id);

            // Check Tier
            const { data: profile } = await supabase.from("profiles").select("tier").eq("id", user.id).single();
            const tier = profile?.tier || "FREE";
            setMyTier(tier);

            const { data: conv } = await supabase.from("conversations").select(`*, conversation_participants(user_id, profiles(full_name, avatar_url))`).eq("id", id).single();
            if (conv) {
                const other = conv.conversation_participants.find((p: any) => p.user_id !== user.id);
                if (other) setPartner(other.profiles);
            }

            // LOAD MESSAGES (WITH 24H FILTER)
            let query = supabase.from("direct_messages").select("*").eq("conversation_id", id).order("created_at", { ascending: true });

            if (tier === 'FREE') {
                // Filter out messages older than 24 hours
                const oneDayAgo = new Date();
                oneDayAgo.setHours(oneDayAgo.getHours() - 24);
                query = query.gt('created_at', oneDayAgo.toISOString());
            }

            const { data: msgs } = await query;

            if (msgs) {
                setMessages(msgs);
                const lastMsg = msgs[msgs.length - 1];
                if (lastMsg && lastMsg.content.includes("[SYSTEM]") && lastMsg.content.includes("SKIP")) {
                    setIsSkipped(true);
                    setSkipReason(lastMsg.sender_id === user.id ? "You have skipped this chat." : "Your match skipped.");
                }
            }

            const channel = supabase.channel(`chat-${id}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "direct_messages", filter: `conversation_id=eq.${id}` }, (payload) => {
                setMessages((prev) => [...prev, payload.new]);
                if (payload.new.content.includes("[SYSTEM]") && payload.new.content.includes("SKIP")) {
                    setIsSkipped(true);
                    setSkipReason(payload.new.sender_id === user.id ? "You have skipped this chat." : "Your match skipped.");
                }
            }).subscribe();

            return () => { supabase.removeChannel(channel); };
        };
        init();
    }, [id]);

    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || isSkipped) return;
        const text = newMessage; setNewMessage(""); setSkipConfirm(false);
        await supabase.from("direct_messages").insert({ conversation_id: id, sender_id: userId, content: text });
        await supabase.from("conversations").update({ updated_at: new Date() }).eq("id", id);
    };

    const handleSkip = async () => {
        if (!skipConfirm) { setSkipConfirm(true); setTimeout(() => setSkipConfirm(false), 3000); return; }
        await supabase.from("direct_messages").insert({ conversation_id: id, sender_id: userId, content: "[SYSTEM]: SKIP" });
        setIsSkipped(true); setSkipReason("You have skipped this chat."); setSkipConfirm(false);
    };

    const handleReport = async () => {
        const reason = prompt("Why are you reporting this user?");
        if (reason && partner) {
            await supabase.from("reports").insert({ reporter_id: userId, reported_id: partner.id, reason: reason });
            alert("Report submitted."); router.push('/dashboard/match');
        }
    };

    return (
        <div className="fixed inset-0 flex flex-col h-[100dvh] bg-[#18181b] text-white font-sans overflow-hidden">
            {/* (Same Header Code as before, omitted for brevity but standard layout) */}
            <div className="flex-none h-16 flex items-center justify-between px-4 bg-[#111] border-b border-zinc-800 shadow-sm z-50">
                <div className="flex items-center gap-4">
                    <button onClick={toggle}><Menu size={24} className="text-zinc-400 hover:text-white transition-colors" /></button>
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-zinc-800 overflow-hidden border border-zinc-700">{partner?.avatar_url && <img src={partner.avatar_url} className="w-full h-full object-cover" />}</div>
                        <div>
                            <h2 className="font-bold text-sm text-zinc-100">{partner?.full_name || "..."}</h2>
                            <div className="flex items-center gap-1.5"><div className={`w-2 h-2 rounded-full ${isSkipped ? 'bg-red-500' : 'bg-green-500'} animate-pulse`} /><span className="text-[10px] text-zinc-500">{isSkipped ? "Disconnected" : "Online"}</span></div>
                        </div>
                    </div>
                </div>
                <button className="text-zinc-400 hover:text-white"><MoreVertical size={24} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#18181b] w-full" onClick={() => setSkipConfirm(false)}>
                {messages.map((msg) => {
                    if (msg.content.includes("SKIP") && msg.content.includes("[SYSTEM]")) return null;
                    if (msg.content.startsWith("[SYSTEM]")) {
                        const displayText = msg.content.replace(/\[SYSTEM\]:? /, "");
                        return (<div key={msg.id} className="text-center my-6 animate-in fade-in zoom-in"><div className="inline-flex items-center gap-2 text-[#A67CFF] font-medium text-sm bg-[#A67CFF]/10 px-4 py-1 rounded-full border border-[#A67CFF]/20 shadow-sm"><Sparkles size={14} fill="currentColor" />{displayText}</div></div>);
                    }
                    const isMe = msg.sender_id === userId;
                    return (<div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"} animate-in slide-in-from-bottom-2`}>{!isMe && (<div className="w-8 h-8 rounded-full bg-zinc-800 overflow-hidden mr-2 mt-1 flex-shrink-0">{partner?.avatar_url && <img src={partner.avatar_url} className="w-full h-full object-cover" />}</div>)}<div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-[15px] shadow-sm leading-relaxed ${isMe ? "bg-[#6366f1] text-white rounded-tr-sm" : "bg-[#27272a] text-zinc-100 rounded-tl-sm"}`}>{msg.content}</div></div>);
                })}
                <div ref={messagesEndRef} />
            </div>

            <div className="flex-none z-50 bg-[#111]">
                {!isSkipped ? (
                    <div className="p-3 border-t border-zinc-800 flex items-end gap-2 pb-safe">
                        <button onClick={handleSkip} className={`h-12 px-5 font-bold text-sm rounded-xl transition-all shadow-lg min-w-[80px] ${skipConfirm ? "bg-red-600 hover:bg-red-700 text-white animate-pulse" : "bg-[#ea580c] hover:bg-[#c2410c] text-white shadow-orange-900/10"}`}>{skipConfirm ? "CONFIRM" : "SKIP"}</button>
                        <div className="flex-1 bg-[#27272a] rounded-xl flex items-center px-2 min-h-[48px]">
                            <button className="p-2 text-zinc-500 hover:text-white transition-colors"><ImageIcon size={20} /></button>
                            <form onSubmit={handleSendMessage} className="flex-1 flex"><input id="friend-message-input" name="friend-message" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Send a message" className="w-full bg-transparent text-white px-2 outline-none text-sm placeholder-zinc-500" autoComplete="off" /><button type="submit" disabled={!newMessage.trim()} className="p-2 text-zinc-500 hover:text-[#A67CFF] disabled:opacity-50 transition-colors"><Send size={20} /></button></form><button className="p-2 text-zinc-500 hover:text-yellow-400 transition-colors"><Smile size={20} /></button>
                        </div>
                    </div>
                ) : (
                    <div className="p-6 border-t border-red-900/30 flex flex-col gap-4 animate-in slide-in-from-bottom-10 pb-safe">
                        <div className="flex items-center gap-3"><HeartOff className="text-[#FF6B91]" size={24} /><div><p className="font-bold text-white text-lg">{skipReason}</p><p className="text-xs text-zinc-500">The conversation has ended.</p></div></div>
                        <div className="flex gap-3"><button onClick={handleReport} className="flex items-center gap-2 px-4 py-3 bg-[#27272a] hover:bg-red-900/50 hover:text-red-400 rounded-xl text-zinc-300 font-bold text-sm transition-colors"><ShieldAlert size={16} /> Report</button><button onClick={() => router.push('/dashboard/match')} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-[#FF6B91] to-[#A67CFF] text-white font-bold text-sm rounded-xl hover:scale-[1.02] transition-transform shadow-lg shadow-purple-500/20"><Zap size={18} fill="currentColor" /> Find New Match</button></div>
                    </div>
                )}
            </div>
        </div>
    );
}
