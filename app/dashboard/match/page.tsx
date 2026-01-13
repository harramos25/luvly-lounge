"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import {
    Zap, Loader2, X, Plus, Instagram, Twitter, Facebook, MessageCircle,
    Send, ShieldAlert, Sparkles, Smile, Image as ImageIcon, HeartOff, Menu, MoreVertical
} from "lucide-react";
import { useSidebar } from "../sidebar-context";

export default function SmartMatchPage() {
    const supabase = createClient();
    const router = useRouter();
    const { toggle } = useSidebar();

    // --- STATES ---
    const [view, setView] = useState<"LOBBY" | "CHAT">("LOBBY");
    const [userId, setUserId] = useState("");

    // LOBBY STATE
    const [myInterests, setMyInterests] = useState<string[]>([]);
    const [inputValue, setInputValue] = useState("");
    const [finding, setFinding] = useState(false);
    const [statusText, setStatusText] = useState("");

    // CHAT STATE
    const [activeConvId, setActiveConvId] = useState<string | null>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [partner, setPartner] = useState<any>(null);
    const [isSkipped, setIsSkipped] = useState(false);
    const [skipReason, setSkipReason] = useState("");
    const [skipConfirm, setSkipConfirm] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const searchIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // 1. INITIAL LOAD & RESUME CHECK
    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            setUserId(user.id);

            // A. Load Interests
            const { data: profile } = await supabase.from("profiles").select("interests, status").eq("id", user.id).single();
            if (profile?.interests) setMyInterests(profile.interests);

            // B. RESUME CHECK: Is there an active match from before?
            // We look for a conversation updated recently (last 5 mins) where I didn't skip yet.
            // (This is a simplified check. For robust resume, we'd check a 'status' flag on the participant row).
            const storedConvId = localStorage.getItem("active_match_id");

            if (storedConvId) {
                // Verify if it's still valid
                const { data: conv } = await supabase.from("conversations").select("id").eq("id", storedConvId).single();
                if (conv) {
                    if (confirm("Resume your active chat?")) {
                        loadChat(storedConvId, user.id);
                    } else {
                        localStorage.removeItem("active_match_id"); // User chose to start new
                    }
                }
            }
        };
        init();

        return () => {
            if (searchIntervalRef.current) clearInterval(searchIntervalRef.current);
        };
    }, []);


    // --- VIEW 1: LOBBY LOGIC ---

    const handleAddInterest = async () => {
        const tag = inputValue.trim().toLowerCase();
        if (!tag) return;
        if (myInterests.includes(tag)) { setInputValue(""); return; }
        if (myInterests.length >= 3) { alert("Max 3 interests for Free tier."); return; }

        const newInterests = [...myInterests, tag];
        setMyInterests(newInterests);
        setInputValue("");
        await supabase.from("profiles").update({ interests: newInterests }).eq("id", userId);
    };

    const handleRemoveInterest = async (tag: string) => {
        const newInterests = myInterests.filter(t => t !== tag);
        setMyInterests(newInterests);
        await supabase.from("profiles").update({ interests: newInterests }).eq("id", userId);
    };

    const startMatch = async () => {
        if (myInterests.length === 0) return alert("Add an interest first!");

        setFinding(true);
        setStatusText("Entering the lounge...");
        await supabase.from("profiles").update({ status: 'searching' }).eq("id", userId);

        let attempts = 0;
        const maxAttempts = 60;

        const interval = setInterval(async () => {
            attempts++;
            setStatusText(attempts % 2 === 0 ? "Scanning for vibes..." : "Looking for a partner...");

            // 1. SEEKER
            const { data: matchData } = await supabase.rpc('search_for_match', { my_id: userId, my_interests: myInterests });

            if (matchData && matchData.length > 0) {
                clearInterval(interval);
                const partner = matchData[0];

                // Create/Find Room
                const { data: existingRoom } = await supabase.rpc('find_conversation_with_user', { other_user_id: partner.partner_id });
                let convId = existingRoom;
                if (!convId) {
                    const { data: newRoom } = await supabase.from("conversations").insert({}).select().single();
                    convId = newRoom.id;
                    await supabase.from("conversation_participants").insert([
                        { conversation_id: convId, user_id: userId },
                        { conversation_id: convId, user_id: partner.partner_id }
                    ]);
                }

                // Send System Msg
                let sysMsg = partner.shared_interest
                    ? `✨ You both like **${partner.shared_interest}**`
                    : `You are now chatting with **${partner.partner_name}**. Say hi!`;

                await supabase.from("direct_messages").insert({
                    conversation_id: convId, sender_id: userId, content: `[SYSTEM]: ${sysMsg}`
                });

                // SWITCH TO CHAT VIEW
                loadChat(convId, userId);
            }

            // 2. TARGET
            const { data: myProfile } = await supabase.from("profiles").select("status").eq("id", userId).single();
            if (myProfile?.status === 'busy') {
                const { data: recentChat } = await supabase.from("conversation_participants")
                    .select("conversation_id, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).single();

                if (recentChat && (Date.now() - new Date(recentChat.created_at).getTime() < 60000)) {
                    clearInterval(interval);
                    loadChat(recentChat.conversation_id, userId);
                }
            }

            if (attempts >= maxAttempts) {
                clearInterval(interval);
                setFinding(false);
                await supabase.from("profiles").update({ status: 'online' }).eq("id", userId);
                alert("No match found. Try again.");
            }
        }, 2000);
        searchIntervalRef.current = interval;
    };

    const cancelSearch = async () => {
        if (searchIntervalRef.current) clearInterval(searchIntervalRef.current);
        setFinding(false);
        await supabase.from("profiles").update({ status: 'online' }).eq("id", userId);
    };


    // --- VIEW 2: CHAT LOGIC ---

    const loadChat = async (convId: string, currentUserId: string) => {
        setActiveConvId(convId);
        setView("CHAT");
        setFinding(false);
        setIsSkipped(false);
        localStorage.setItem("active_match_id", convId); // SAVE FOR RESUME

        // Fetch Partner
        const { data: conv } = await supabase.from("conversations")
            .select(`*, conversation_participants(user_id, profiles(full_name, avatar_url))`)
            .eq("id", convId).single();

        if (conv) {
            const other = conv.conversation_participants.find((p: any) => p.user_id !== currentUserId);
            if (other) setPartner(other.profiles);
        }

        // Load Messages
        const { data: msgs } = await supabase.from("direct_messages").select("*").eq("conversation_id", convId).order("created_at", { ascending: true });
        if (msgs) {
            setMessages(msgs);
            const last = msgs[msgs.length - 1];
            if (last && last.content.startsWith("[SYSTEM]: SKIP")) {
                setIsSkipped(true);
                setSkipReason(last.sender_id === currentUserId ? "You have skipped." : "Partner skipped.");
            }
        }

        // Subscribe
        const channel = supabase.channel(`chat-${convId}`)
            .on("postgres_changes", { event: "INSERT", schema: "public", table: "direct_messages", filter: `conversation_id=eq.${convId}` }, (payload) => {
                setMessages(prev => [...prev, payload.new]);
                if (payload.new.content.startsWith("[SYSTEM]: SKIP")) {
                    setIsSkipped(true);
                    setSkipReason(payload.new.sender_id === currentUserId ? "You have skipped." : "Partner skipped.");
                }
            })
            .subscribe();

        return () => supabase.removeChannel(channel);
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || isSkipped || !activeConvId) return;
        const text = newMessage;
        setNewMessage("");
        setSkipConfirm(false);
        await supabase.from("direct_messages").insert({ conversation_id: activeConvId, sender_id: userId, content: text });
    };

    const handleSkip = async () => {
        if (!skipConfirm) { setSkipConfirm(true); setTimeout(() => setSkipConfirm(false), 3000); return; }
        if (!activeConvId) return;

        await supabase.from("direct_messages").insert({ conversation_id: activeConvId, sender_id: userId, content: "[SYSTEM]: SKIP" });
        setIsSkipped(true);
        setSkipReason("You have skipped.");
        setSkipConfirm(false);
        localStorage.removeItem("active_match_id"); // Clear resume state
    };

    const resetToLobby = () => {
        setView("LOBBY");
        setActiveConvId(null);
        setMessages([]);
        setPartner(null);
        localStorage.removeItem("active_match_id");
    };

    // --- SCROLL EFFECT ---
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);


    // ================= RENDER =================

    if (view === "LOBBY") {
        // --- RENDER LOBBY ---
        return (
            <div className="min-h-screen bg-[#0a0a0a] text-white p-4 flex flex-col items-center relative overflow-hidden font-sans">
                {/* HAMBURGER FOR SIDEBAR */}
                <div className="absolute top-4 left-4 z-50 md:hidden">
                    <button onClick={toggle}><Menu className="text-zinc-400" /></button>
                </div>

                <div className="flex-1 flex flex-col items-center justify-center w-full max-w-md space-y-8 z-10 pb-24">
                    <div className="text-center space-y-4">
                        <div className="w-20 h-20 mx-auto bg-gradient-to-tr from-[#FF6B91] to-[#A67CFF] rounded-3xl flex items-center justify-center shadow-lg shadow-purple-500/20">
                            <MessageCircle size={40} className="text-white" />
                        </div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">Luvly Lounge</h1>
                    </div>

                    <div className="w-full space-y-3">
                        <div className="flex justify-between items-center px-1">
                            <h2 className="text-sm font-bold text-zinc-300">Your Interests <span className="text-[#FF6B91]">(Max 3)</span></h2>
                            <span className="text-xs text-zinc-500">{myInterests.length}/3</span>
                        </div>
                        <div className="bg-[#111] border border-zinc-800 rounded-2xl p-3 flex flex-wrap gap-2 min-h-[60px]">
                            {myInterests.map(tag => (
                                <span key={tag} className="px-3 py-1.5 bg-zinc-800 rounded-full text-sm text-white flex items-center gap-2 border border-zinc-700">
                                    {tag} <button onClick={() => handleRemoveInterest(tag)}><X size={14} /></button>
                                </span>
                            ))}
                            {myInterests.length < 3 && (
                                <div className="flex-1 min-w-[120px] flex items-center gap-2 px-2">
                                    <Plus size={16} className="text-zinc-500" />
                                    <input value={inputValue} onChange={(e) => setInputValue(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddInterest()}
                                        placeholder="Add interest..." className="bg-transparent outline-none text-sm text-white w-full" />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="fixed bottom-0 left-0 w-full p-4 bg-gradient-to-t from-black to-transparent z-20">
                    <div className="max-w-md mx-auto">
                        {!finding ? (
                            <button onClick={startMatch} className="w-full py-4 bg-gradient-to-r from-[#FF6B91] to-[#A67CFF] text-white font-bold text-lg rounded-2xl shadow-lg flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform">
                                <Zap fill="currentColor" size={20} /> Start Text Chat
                            </button>
                        ) : (
                            <button onClick={cancelSearch} className="w-full py-4 bg-zinc-800 text-white font-bold text-lg rounded-2xl flex items-center justify-center gap-2">
                                <Loader2 className="animate-spin" size={20} /> Searching... (Cancel)
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // --- RENDER CHAT ---
    return (
        <div className="fixed inset-0 flex flex-col h-[100dvh] bg-[#18181b] text-white font-sans overflow-hidden">
            {/* HEADER */}
            <div className="flex-none h-16 flex items-center justify-between px-4 bg-[#111] border-b border-zinc-800 z-50">
                <div className="flex items-center gap-4">
                    <button onClick={toggle}><Menu size={24} className="text-zinc-400" /></button>
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-zinc-800 overflow-hidden border border-zinc-700">
                            {partner?.avatar_url && <img src={partner.avatar_url} className="w-full h-full object-cover" />}
                        </div>
                        <div>
                            <h2 className="font-bold text-sm text-zinc-100">{partner?.full_name || "..."}</h2>
                            <div className="flex items-center gap-1.5">
                                <div className={`w-2 h-2 rounded-full ${isSkipped ? 'bg-red-500' : 'bg-green-500'} animate-pulse`} />
                                <span className="text-[10px] text-zinc-500">{isSkipped ? "Disconnected" : "Online"}</span>
                            </div>
                        </div>
                    </div>
                </div>
                <button className="text-zinc-400"><MoreVertical size={24} /></button>
            </div>

            {/* MESSAGES */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#18181b] w-full" onClick={() => setSkipConfirm(false)}>
                {messages.map((msg) => {
                    if (msg.content === "[SYSTEM]: SKIP") return null;
                    if (msg.content.startsWith("[SYSTEM]:")) {
                        return (
                            <div key={msg.id} className="text-center my-6 animate-in fade-in zoom-in">
                                <div className="inline-flex items-center gap-2 text-[#A67CFF] font-medium text-sm bg-[#A67CFF]/10 px-4 py-1 rounded-full border border-[#A67CFF]/20 shadow-sm">
                                    <Sparkles size={14} fill="currentColor" /> {msg.content.replace("[SYSTEM]: ", "")}
                                </div>
                            </div>
                        );
                    }
                    const isMe = msg.sender_id === userId;
                    return (
                        <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"} animate-in slide-in-from-bottom-2`}>
                            {!isMe && <div className="w-8 h-8 rounded-full bg-zinc-800 overflow-hidden mr-2 mt-1">{partner?.avatar_url && <img src={partner.avatar_url} className="w-full h-full object-cover" />}</div>}
                            <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-[15px] shadow-sm leading-relaxed ${isMe ? "bg-[#6366f1] text-white rounded-tr-sm" : "bg-[#27272a] text-zinc-100 rounded-tl-sm"}`}>
                                {msg.content}
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* FOOTER */}
            <div className="flex-none z-50 bg-[#111]">
                {!isSkipped ? (
                    <div className="p-3 border-t border-zinc-800 flex items-end gap-2 pb-safe">
                        <button onClick={handleSkip} className={`h-12 px-5 font-bold text-sm rounded-xl transition-all shadow-lg min-w-[80px] ${skipConfirm ? "bg-red-600 animate-pulse text-white" : "bg-[#ea580c] text-white"}`}>
                            {skipConfirm ? "CONFIRM" : "SKIP"}
                        </button>
                        <div className="flex-1 bg-[#27272a] rounded-xl flex items-center px-2 min-h-[48px]">
                            <button className="p-2 text-zinc-500"><ImageIcon size={20} /></button>
                            <form onSubmit={handleSendMessage} className="flex-1 flex">
                                <input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Send a message" className="w-full bg-transparent text-white px-2 outline-none text-sm" />
                                <button type="submit" disabled={!newMessage.trim()} className="p-2 text-zinc-500 hover:text-[#A67CFF]"><Send size={20} /></button>
                            </form>
                        </div>
                    </div>
                ) : (
                    <div className="p-6 border-t border-red-900/30 flex flex-col gap-4 animate-in slide-in-from-bottom-10 pb-safe">
                        <div className="flex items-center gap-3">
                            <HeartOff className="text-[#FF6B91]" size={24} />
                            <div><p className="font-bold text-white text-lg">{skipReason}</p><p className="text-xs text-zinc-500">The conversation has ended.</p></div>
                        </div>
                        <div className="flex gap-3">
                            <button className="flex items-center gap-2 px-4 py-3 bg-[#27272a] rounded-xl text-zinc-300 font-bold text-sm"><ShieldAlert size={16} /> Report</button>
                            {/* CHANGE: This button now just resets the view to LOBBY instead of routing */}
                            <button onClick={resetToLobby} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-[#FF6B91] to-[#A67CFF] text-white font-bold text-sm rounded-xl hover:scale-[1.02]">
                                <Zap size={18} fill="currentColor" /> Find New Match
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
