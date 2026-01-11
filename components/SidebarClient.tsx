"use client";

import { useState } from "react";
import Link from "next/link";
import { User, Settings, MessageSquare, History, Crown, Menu, X } from "lucide-react";

type SidebarClientProps = {
    username: string;
    avatarUrl?: string; // We will pass the full URL or just the path
    tier: string;
    isPremium: boolean;
};

export default function SidebarClient({ username, avatarUrl, tier, isPremium }: SidebarClientProps) {
    const [isOpen, setIsOpen] = useState(false);

    const fullAvatarUrl = avatarUrl
        ? `https://sunqgymbfsenkkvoobqc.supabase.co/storage/v1/object/public/avatars/${avatarUrl}`
        : null;

    return (
        <>
            {/* MOBILE HEADER (Visible only on small screens) */}
            <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-[#111] border-b border-zinc-800 flex items-center justify-between px-4 z-50">
                <span className="font-serif text-xl text-transparent bg-clip-text bg-gradient-to-r from-[#FF6B91] to-[#A67CFF]">
                    Luvly Lounge.
                </span>
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="text-white p-2 hover:bg-zinc-800 rounded-lg"
                >
                    {isOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            {/* OVERLAY (For mobile when menu is open) */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/80 z-40 md:hidden"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* SIDEBAR CONTAINER */}
            <aside className={`
        fixed left-0 top-0 h-screen bg-[#111] border-r border-zinc-800 
        transition-transform duration-300 ease-in-out z-50
        w-72 p-6 flex flex-col overflow-y-auto 
        [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-zinc-800
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
        md:translate-x-0
      `}>
                {/* LOGO (Hidden on mobile inside drawer to avoid dup, or keep it) */}
                <div className="mb-8 hidden md:block">
                    <h2 className="text-2xl font-serif text-transparent bg-clip-text bg-gradient-to-r from-[#FF6B91] to-[#A67CFF]">
                        Luvly Lounge.
                    </h2>
                </div>

                {/* User Profile Snippet */}
                <Link href="/dashboard/profile" onClick={() => setIsOpen(false)}>
                    <div className="mb-8 p-4 bg-zinc-900/50 rounded-xl border border-zinc-800 flex items-center gap-4 cursor-pointer hover:bg-zinc-900 transition-colors group">
                        <div className={`
                w-12 h-12 rounded-full overflow-hidden border-2 flex-shrink-0 bg-zinc-800 group-hover:border-[#FF6B91] transition-colors
                ${tier === 'plus' ? 'border-[#FFD700] shadow-[0_0_10px_#FFD700]' :
                                tier === 'pro' ? 'border-[#C0C0C0] shadow-[0_0_10px_#C0C0C0]' :
                                    'border-zinc-700'}
            `}>
                            {fullAvatarUrl ? (
                                <img src={fullAvatarUrl} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-zinc-500">
                                    <User size={20} />
                                </div>
                            )}
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-white font-bold truncate text-sm group-hover:text-[#FF6B91] transition-colors">{username}</p>
                            <div className="flex items-center gap-1">
                                <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold
                    ${isPremium ? 'bg-gradient-to-r from-[#FF6B91] to-[#A67CFF] text-white' : 'bg-zinc-800 text-zinc-400'}
                `}>
                                    {tier}
                                </span>
                            </div>
                        </div>
                    </div>
                </Link>

                <nav className="flex-1 space-y-6">
                    <div>
                        <div className="text-zinc-600 text-xs uppercase tracking-widest pl-2 mb-2 font-bold">Social</div>
                        <ul className="space-y-2">
                            <Link
                                href="/dashboard"
                                onClick={() => setIsOpen(false)}
                                className="flex items-center gap-3 text-white bg-[#FF6B91]/10 border border-[#FF6B91]/20 px-4 py-3 rounded-lg cursor-pointer transition-all hover:border-[#FF6B91]"
                            >
                                <Crown size={18} className="text-[#FF6B91]" />
                                <span className="font-bold">Lounge</span>
                            </Link>
                            <Link
                                href="/dashboard/chats"
                                onClick={() => setIsOpen(false)}
                                className="flex items-center gap-3 text-zinc-400 px-4 py-3 hover:text-white cursor-pointer transition-colors group"
                            >
                                <MessageSquare size={18} className="group-hover:text-[#A67CFF] transition-colors" />
                                <span>Chats</span>
                            </Link>
                            <Link
                                href="/dashboard/history"
                                onClick={() => setIsOpen(false)}
                                className="flex items-center gap-3 text-zinc-400 px-4 py-3 hover:text-white cursor-pointer transition-colors group"
                            >
                                <History size={18} className="group-hover:text-[#A67CFF] transition-colors" />
                                <span>History</span>
                            </Link>
                        </ul>
                    </div>

                    <div>
                        <div className="text-zinc-600 text-xs uppercase tracking-widest pl-2 mb-2 font-bold">You</div>
                        <ul className="space-y-2">
                            <Link
                                href="/dashboard/profile"
                                onClick={() => setIsOpen(false)}
                                className="flex items-center gap-3 text-zinc-400 px-4 py-3 hover:text-white cursor-pointer transition-colors group"
                            >
                                <User size={18} className="group-hover:text-[#A67CFF] transition-colors" />
                                <span>Profile</span>
                            </Link>
                        </ul>
                    </div>
                </nav>

                {!isPremium && (
                    <div className="mt-4 p-4 bg-gradient-to-br from-[#FF6B91]/20 to-[#A67CFF]/20 rounded-xl border border-[#FF6B91]/30">
                        <p className="text-xs text-white mb-2">Unlock unlimited chats & gold badge.</p>
                        <button className="w-full bg-white text-black text-xs font-bold py-2 rounded-lg hover:bg-zinc-200">
                            Upgrade to Plus
                        </button>
                    </div>
                )}
            </aside>
        </>
    );
}
