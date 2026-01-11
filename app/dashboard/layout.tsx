"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
    MessageCircle,
    Clock,
    Settings,
    LogOut,
    Crown,
    Zap as ZapIcon
} from "lucide-react";

// ...

const navItems = [
    { name: "Lounge", href: "/dashboard", icon: MessageCircle },
    { name: "Start Match", href: "/dashboard/match", icon: ZapIcon },
    { name: "Messages", href: "/dashboard/chats", icon: MessageCircle },
];

const bottomItems = [
    { name: "Profile", href: "/dashboard/profile", icon: User },
    { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

return (
    <div className="flex h-screen bg-black text-white font-sans">

        {/* --- SIDEBAR --- */}
        <div className="hidden md:flex w-64 border-r border-zinc-800 flex-col p-4 bg-[#0a0a0a]">

            {/* Logo */}
            <div className="mb-8 px-2">
                <h1 className="font-serif text-2xl bg-gradient-to-r from-[#FF6B91] to-[#A67CFF] bg-clip-text text-transparent">
                    Luvly Lounge.
                </h1>
            </div>

            {/* User Card (Updated to show 'Lux') */}
            <div className="bg-[#111] rounded-2xl p-3 mb-6 flex items-center gap-3 border border-zinc-800">
                <div className="w-10 h-10 rounded-full bg-zinc-800 overflow-hidden flex-shrink-0">
                    {profile.avatar_url ? (
                        <img src={profile.avatar_url} className="w-full h-full object-cover" alt="User" />
                    ) : (
                        <User className="w-6 h-6 m-2 text-zinc-500" />
                    )}
                </div>
                <div className="overflow-hidden">
                    <p className="text-sm font-bold text-white truncate">
                        {profile.full_name}
                    </p>
                    <span className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded border border-zinc-700 font-mono">
                        {profile.tier}
                    </span>
                </div>
            </div>

            {/* Navigation */}
            <div className="flex-1 space-y-1">
                <p className="text-xs font-bold text-zinc-500 px-2 mb-2 uppercase tracking-wider">Social</p>
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${isActive
                                ? "bg-[#FF6B91]/10 text-[#FF6B91] font-medium"
                                : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
                                }`}
                        >
                            <item.icon size={18} />
                            {item.name}
                        </Link>
                    );
                })}
            </div>

            {/* Bottom Menu */}
            <div className="space-y-1 mt-6 border-t border-zinc-900 pt-6">
                <p className="text-xs font-bold text-zinc-500 px-2 mb-2 uppercase tracking-wider">You</p>
                {bottomItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${isActive
                                ? "bg-white text-black font-bold"
                                : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
                                }`}
                        >
                            <item.icon size={18} />
                            {item.name}
                        </Link>
                    );
                })}

                <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-zinc-500 hover:bg-red-900/10 hover:text-red-400 transition-colors mt-2"
                >
                    <LogOut size={18} />
                    Log Out
                </button>
            </div>

            {/* Upsell Banner */}
            <div className="mt-4 bg-gradient-to-br from-[#FF6B91] to-[#A67CFF] rounded-xl p-4 text-center">
                <Crown size={24} className="mx-auto text-white mb-2" />
                <p className="text-[10px] text-white/80 font-medium leading-tight">
                    Unlock unlimited chats & gold badge.
                </p>
            </div>

        </div>

        {/* --- MAIN CONTENT AREA --- */}
        <main className="flex-1 overflow-hidden relative">
            {children}
        </main>

    </div>
);
}
