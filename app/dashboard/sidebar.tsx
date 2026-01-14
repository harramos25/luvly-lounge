"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import {
    MessageSquare, LayoutGrid, User, Settings, LogOut, X, Crown, Sparkles
} from "lucide-react";
import { useSidebar } from "./sidebar-context";

export default function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const supabase = createClient();
    const { isOpen, close } = useSidebar();

    // PROFILE STATE
    const [profile, setProfile] = useState<any>(null);

    useEffect(() => {
        const getProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data } = await supabase
                .from("profiles")
                .select("full_name, avatar_url, tier, username")
                .eq("id", user.id)
                .single();

            if (data) setProfile(data);
        };
        getProfile();
    }, []);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.replace("/login");
    };

    const navItems = [
        { name: "Lounge", href: "/dashboard", icon: LayoutGrid },
        { name: "Messages", href: "/dashboard/chats", icon: MessageSquare },
        { name: "Profile", href: "/dashboard/profile", icon: User },
        { name: "Settings", href: "/dashboard/settings", icon: Settings },
    ];

    return (
        <>
            {/* Mobile Overlay */}
            <div
                className={`fixed inset-0 bg-black/80 z-40 md:hidden backdrop-blur-sm transition-opacity duration-300 ${isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                    }`}
                onClick={close}
            />

            {/* Sidebar Container */}
            <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-[#0d0d0d] border-r border-zinc-800 
        transform transition-transform duration-300 ease-in-out flex flex-col
        md:relative md:translate-x-0 
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
      `}>

                {/* Header (Logo) */}
                <div className="h-20 flex items-center justify-between px-6">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-tr from-[#FF6B91] to-[#A67CFF] rounded-xl flex items-center justify-center">
                            <Sparkles size={16} className="text-white fill-white/20" />
                        </div>
                        <span className="text-xl font-bold bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
                            Luvly
                        </span>
                    </div>
                    <button onClick={close} className="md:hidden text-zinc-400 hover:text-white p-2 rounded-full hover:bg-zinc-800">
                        <X size={20} />
                    </button>
                </div>

                {/* User Profile Card (Mini) */}
                <div className="px-4 mb-4">
                    <div className="bg-[#1a1a1a] rounded-2xl p-3 flex items-center gap-3 border border-zinc-800/50">
                        <div className="w-10 h-10 rounded-full bg-zinc-800 overflow-hidden border border-zinc-700 flex-shrink-0">
                            {profile?.avatar_url ? (
                                <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-zinc-500"><User size={20} /></div>
                            )}
                        </div>
                        <div className="min-w-0 flex-1">
                            <h3 className="text-sm font-bold text-white truncate">{profile?.full_name || "Loading..."}</h3>
                            <p className="text-[10px] text-zinc-500 truncate">@{profile?.username || "user"}</p>
                        </div>
                        {profile?.tier?.toUpperCase() !== 'FREE' && <Crown size={16} className="text-yellow-400 fill-yellow-400 flex-shrink-0" />}
                    </div>
                </div>

                {/* Nav Items */}
                <nav className="flex-1 px-4 space-y-1">
                    {navItems.map((item) => {
                        const isActive = item.href === "/dashboard"
                            ? pathname === "/dashboard"
                            : pathname?.startsWith(item.href);

                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                onClick={close}
                                className={`flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all font-medium text-sm group ${isActive
                                    ? "bg-gradient-to-r from-[#FF6B91]/10 to-[#A67CFF]/10 text-[#FF6B91]"
                                    : "text-zinc-400 hover:bg-zinc-800/50 hover:text-white"
                                    }`}
                            >
                                <item.icon size={20} className={isActive ? "text-[#FF6B91]" : "text-zinc-500 group-hover:text-white"} />
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>

                {/* Footer */}
                <div className="p-4 border-t border-zinc-800 space-y-3">
                    <div className="bg-gradient-to-r from-[#FF6B91] to-[#A67CFF] p-[1px] rounded-2xl">
                        <div className="bg-[#111] rounded-[15px] p-3 text-center relative overflow-hidden group cursor-pointer hover:bg-[#111]/80 transition-colors" onClick={() => router.push('/pricing')}>
                            <div className="absolute top-0 right-0 w-16 h-16 bg-white/5 blur-2xl rounded-full -mr-8 -mt-8 pointer-events-none"></div>
                            <Crown className="text-[#FF6B91] mx-auto mb-1" size={20} />
                            <h3 className="font-bold text-white text-xs">Upgrade to Pro</h3>
                        </div>
                    </div>

                    <button
                        onClick={handleLogout}
                        className="flex items-center justify-center gap-2 px-4 py-3 text-zinc-500 hover:text-red-400 transition-colors w-full text-xs font-bold rounded-xl hover:bg-zinc-800/30"
                    >
                        <LogOut size={16} />
                        Log Out
                    </button>

                    <div className="text-[10px] text-zinc-700 text-center pb-2 font-mono">
                        v2.1 (Gatekeeper Active)
                    </div>
                </div>
            </aside>
        </>
    );
}
