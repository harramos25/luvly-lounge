"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import {
    Zap, Loader2, X, Plus, MessageCircle,
    Send, ShieldAlert, Sparkles, Smile, Image as ImageIcon, HeartOff, Menu, MoreVertical, Crown
} from "lucide-react";
import { useSidebar } from "../sidebar-context";

export default function SmartMatchPage() {
    const supabase = createClient();
    const router = useRouter();
    const { toggle } = useSidebar();

    // VIEW STATES
    // "LOBBY" = The initial big dashboard.
    // "CHAT" = The active chat screen (which also handles the 'Skipped' state internally)
    const [view, setView] = useState<"LOBBY" | "CHAT">("LOBBY");
    const [showResumeModal, setShowResumeModal] = useState(false);
    const [resumeId, setResumeId] = useState<string | null>(null);

    // DATA
    const [userId, setUserId] = useState("");
    const [myInterests, setMyInterests] = useState<string[]>([]);
    const [inputValue, setInputValue] = useState("");
    const [finding, setFinding] = useState(false);
    const [statusText, setStatusText] = useState("");

    // CHAT SPECIFIC
    const [activeConvId, setActiveConvId] = useState<string | null>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [partner, setPartner] = useState<any>(null);
    const [isSkipped, setIsSkipped] = useState(false);
    const [skipReason, setSkipReason] = useState("");
    const [skipConfirm, setSkipConfirm] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const searchIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // 1. INITIAL SETUP
    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            setUserId(user.id);

            // Load Interests
            const { data: profile } = await supabase.from("profiles").select("interests").eq("id", user.id).single();
            if (profile?.interests) setMyInterests(profile.interests);

            // Check Resume
            const storedConvId = localStorage.getItem("active_match_id");
            if (storedConvId) {
                const { data: conv } = await supabase.from("conversations").select("id").eq("id", storedConvId).single();
                if (conv) {
                    setResumeId(storedConvId);
                    setShowResumeModal(true);
                } else {
                    localStorage.removeItem("active_match_id");
                }
            }
        };
        init();
        return () => { if (searchIntervalRef.current) clearInterval(searchIntervalRef.current); };
    }, []);

    // --- LOGIC: INTERESTS ---
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

    // --- LOGIC: MATCHMAKING ---
    const startMatch = async () => {
        if (myInterests.length === 0) return alert("Add an interest first!");

        // RESET STATE FOR NEW SEARCH
        setFinding(true);
        setIsSkipped(false);
        setMessages([]); // Clear old messages immediately
        setPartner(null);
        setActiveConvId(null);
        setView("CHAT"); // Ensure we are in the "Chat" layout structure
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

                // Connect
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

                // System Msg
                let sysMsg = partner.shared_interest
                    ? `✨ You both like **${partner.shared_interest}**`
                    : `You are now chatting with **${partner.partner_name}**. Say hi!`;

                await supabase.from("direct_messages").insert({
                    conversation_id: convId, sender_id: userId, content: `[SYSTEM]: ${sysMsg}`
                });

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
                // If failed, we stay in CHAT view but skipped state effectively
                setIsSkipped(true);
                setSkipReason("No partner found.");
            }
        }, 2000);
        searchIntervalRef.current = interval;
    };

    const cancelSearch = async () => {
        if (searchIntervalRef.current) clearInterval(searchIntervalRef.current);
        setFinding(false);
        await supabase.from("profiles").update({ status: 'online' }).eq("id", userId);
        // Go back to skipped state controls if we were there
        if (view === 'CHAT') setIsSkipped(true);
    };

    // --- LOGIC: ACTIVE CHAT ---
    const loadChat = async (convId: string, currentUserId: string) => {
        setActiveConvId(convId);
        setFinding(false);
        setIsSkipped(false);
        localStorage.setItem("active_match_id", convId);

        const { data: conv } = await supabase.from("conversations")
            .select(`*, conversation_participants(user_id, profiles(full_name, avatar_url))`)
            .eq("id", convId).single();
        if (conv) {
            const other = conv.conversation_participants.find((p: any) => p.user_id !== currentUserId);
            if (other) setPartner(other.profiles);
        }

        const { data: msgs } = await supabase.from("direct_messages").select("*").eq("conversation_id", convId).order("created_at", { ascending: true });
        if (msgs) {
            setMessages(msgs);
            const last = msgs[msgs.length - 1];
            if (last && last.content.startsWith("[SYSTEM]: SKIP")) {
                setIsSkipped(true);
                setSkipReason(last.sender_id === currentUserId ? "You have skipped this chat." : "Partner skipped.");
            }
        }

        const channel = supabase.channel(`chat-${convId}`)
            .on("postgres_changes", { event: "INSERT", schema: "public", table: "direct_messages", filter: `conversation_id=eq.${convId}` }, (payload) => {
                setMessages(prev => [...prev, payload.new]);
                if (payload.new.content.startsWith("[SYSTEM]: SKIP")) {
                    setIsSkipped(true);
                    setSkipReason(payload.new.sender_id === currentUserId ? "You have skipped this chat." : "Partner skipped.");
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
        setSkipReason("You have skipped this chat.");
        setSkipConfirm(false);
        localStorage.removeItem("active_match_id");
    };

    const handleResume = () => {
        if (resumeId) {
            loadChat(resumeId, userId);
            setShowResumeModal(false);
        }
    };

    const handleStartNew = () => {
        localStorage.removeItem("active_match_id");
        setResumeId(null);
        setShowResumeModal(false);
        setView("LOBBY"); // If they click Start New from Modal, go to Lobby.
    };

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);


    // ================= RENDER =================

    if (showResumeModal) {
        return (
            <div className="h-full flex items-center justify-center p-4 bg-[#0a0a0a]">
                <div className="bg-[#111] border border-zinc-800 p-8 rounded-2xl max-w-sm w-full text-center space-y-6">
                    <Zap size={48} className="mx-auto text-[#FF6B91]" />
                    <div><h2 className="text-xl font-bold text-white mb-2">Active Match Found</h2><p className="text-zinc-400 text-sm">Resume previous chat?</p></div>
                    <div className="flex gap-3">
                        <button onClick={handleStartNew} className="flex-1 py-3 bg-zinc-800 rounded-xl font-bold text-white text-sm">Start New</button>
                        <button onClick={handleResume} className="flex-1 py-3 bg-gradient-to-r from-[#FF6B91] to-[#A67CFF] rounded-xl font-bold text-white text-sm">Resume</button>
                    </div>
                </div>
            </div>
        );
    }

    // --- INITIAL LOBBY VIEW (Only seen on first load) ---
    if (view === "LOBBY") {
        return (
            <div className="h-full bg-[#0a0a0a] text-white flex flex-col items-center relative font-sans overflow-hidden">
                <div className="absolute top-4 left-4 z-50 md:hidden">
                    <button onClick={toggle} className="p-2 bg-black/50 rounded-full"><Menu className="text-zinc-400" /></button>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center w-full max-w-md mx-auto space-y-8 p-4">
                    <div className="text-center space-y-4">
                        <div className="w-20 h-20 mx-auto bg-gradient-to-tr from-[#FF6B91] to-[#A67CFF] rounded-3xl flex items-center justify-center shadow-lg shadow-purple-500/20">
                            <MessageCircle size={40} className="text-white" />
                        </div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">Luvly Lounge</h1>
                    </div>
                    <div className="w-full space-y-4">
                        <div className="bg-[#111] border border-zinc-800 rounded-2xl p-3 flex flex-wrap gap-2 min-h-[60px]">
                            {myInterests.map(tag => (
                                <span key={tag} className="px-3 py-1.5 bg-zinc-800 rounded-full text-sm text-white flex items-center gap-2 border border-zinc-700">{tag} <button onClick={() => handleRemoveInterest(tag)}><X size={14} /></button></span>
                            ))}
                            {myInterests.length < 3 && (
                                <div className="flex-1 min-w-[120px] flex items-center gap-2 px-2"><Plus size={16} className="text-zinc-500" /><input id="interest-lobby" name="interest" value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddInterest()} placeholder="Add interest..." className="bg-transparent outline-none text-sm text-white w-full" autoComplete="off" /></div>
                            )}
                        </div>
                    </div>
                </div>
                <div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-black via-black/90 to-transparent z-20">
                    <div className="max-w-md mx-auto">
                        {!finding ? (
                            <button onClick={startMatch} className="w-full py-4 bg-gradient-to-r from-[#FF6B91] to-[#A67CFF] text-white font-bold text-lg rounded-2xl shadow-lg flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform"><Zap fill="currentColor" size={20} /> Start Matching</button>
                        ) : (
                            <button onClick={cancelSearch} className="w-full py-4 bg-zinc-800 text-white font-bold text-lg rounded-2xl flex items-center justify-center gap-2"><Loader2 className="animate-spin" size={20} /> Searching...</button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // --- CHAT VIEW (Used for both Active Chat AND Skipped State) ---
    return (
        <div className="absolute inset-0 flex flex-col bg-[#18181b] text-white font-sans overflow-hidden">

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
                {/* If finding, show big loader in middle of chat area */}
                {finding && (
                    <div className="h-full flex flex-col items-center justify-center space-y-4 text-zinc-500">
                        <Loader2 size={48} className="animate-spin text-[#FF6B91]" />
                        <p>{statusText}</p>
                        <button onClick={cancelSearch} className="text-xs underline hover:text-white">Cancel</button>
                    </div>
                )}

                {!finding && messages.map((msg) => {
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

            {/* FOOTER - DYNAMIC */}
            <div className="flex-none z-50 bg-[#111]">
                {!isSkipped && !finding ? (
                    // ACTIVE CHAT FOOTER
                    <div className="p-3 border-t border-zinc-800 flex items-end gap-2 pb-safe">
                        <button onClick={handleSkip} className={`h-12 px-5 font-bold text-sm rounded-xl transition-all shadow-lg min-w-[80px] ${skipConfirm ? "bg-red-600 animate-pulse text-white" : "bg-[#ea580c] text-white"}`}>
                            {skipConfirm ? "CONFIRM" : "SKIP"}
                        </button>
                        <div className="flex-1 bg-[#27272a] rounded-xl flex items-center px-2 min-h-[48px]">
                            <button className="p-2 text-zinc-500"><ImageIcon size={20} /></button>
                            <form onSubmit={handleSendMessage} className="flex-1 flex">
                                <input id="chat-input" name="message" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Send a message" className="w-full bg-transparent text-white px-2 outline-none text-sm" autoComplete="off" />
                                <button type="submit" disabled={!newMessage.trim()} className="p-2 text-zinc-500 hover:text-[#A67CFF]"><Send size={20} /></button>
                            </form>
                        </div>
                    </div>
                ) : isSkipped ? (
                    // SKIPPED STATE - THE "MINI LOBBY" FOOTER
                    <div className="p-4 border-t border-red-900/30 flex flex-col gap-4 animate-in slide-in-from-bottom-10 pb-safe bg-[#0d0d0d]">

                        {/* Status Line */}
                        <div className="flex items-center gap-3">
                            <HeartOff className="text-[#FF6B91]" size={20} />
                            <p className="font-bold text-white text-md">{skipReason}</p>
                            <button className="ml-auto flex items-center gap-1 bg-red-900/30 text-red-400 px-3 py-1 rounded-lg text-xs font-bold"><ShieldAlert size={12} /> Report</button>
                        </div>

                        {/* Interest Editor (Inline) */}
                        <div className="bg-[#1a1a1a] rounded-xl p-3 border border-zinc-800">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-xs font-bold text-zinc-400 flex items-center gap-1"><Zap size={12} className="text-green-500" /> Interests (ON)</span>
                                <span className="text-[10px] text-zinc-500">{myInterests.length}/3</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {myInterests.map(tag => (
                                    <span key={tag} className="px-2 py-1 bg-zinc-800 rounded-lg text-xs text-white border border-zinc-700 flex items-center gap-1">
                                        {tag} <button onClick={() => handleRemoveInterest(tag)}><X size={10} /></button>
                                    </span>
                                ))}
                                {myInterests.length < 3 && (
                                    <input
                                        id="mini-interest"
                                        name="interest"
                                        value={inputValue}
                                        onChange={(e) => setInputValue(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddInterest()}
                                        placeholder="Add..."
                                        className="bg-transparent text-xs text-white w-20 outline-none placeholder-zinc-600"
                                        autoComplete="off"
                                    />
                                )}
                            </div>
                        </div>

                        {/* Gender Filter (Visual) */}
                        <div className="flex justify-between items-center px-2 py-2 bg-[#1a1a1a] rounded-xl border border-zinc-800 opacity-60">
                            <div className="flex items-center gap-2">
                                <Crown size={14} className="text-[#FF6B91]" />
                                <span className="text-xs text-zinc-400 font-bold">Gender Filter</span>
                            </div>
                            <span className="text-xs text-[#FF6B91]">Women Only</span>
                        </div>

                        {/* BIG START BUTTON */}
                        <button onClick={startMatch} className="w-full py-3 bg-gradient-to-r from-[#6366f1] to-[#a855f7] text-white font-bold text-md rounded-xl shadow-lg hover:scale-[1.01] flex items-center justify-center gap-2">
                            <MessageCircle fill="currentColor" size={18} /> START
                        </button>
                    </div>
                ) : null}
            </div>
        </div>
    );
}
