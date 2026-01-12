"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
    MessageCircle,
    Clock,
    Settings,
    User,
    LogOut,
    Crown,
    Zap as ZapIcon,
    Menu,
    X
} from "lucide-react";
import UpgradeModal from "@/components/UpgradeModal";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [profile, setProfile] = useState({
        full_name: "Loading...",
        avatar_url: null as string | null,
        tier: "Free"
    });
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [showUpgrade, setShowUpgrade] = useState(false);
    const [checking, setChecking] = useState(true); // 🔒 GATEKEEPER STATE

    // ... (existing hooks and useEffect) ...    
    const supabase = createClient();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        // ... (Keep existing useEffect exactly as is) ...
        const fetchProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                router.push("/login");
                return;
            }

            // Fetch the "Real" Name and Avatar from Database
            const { data } = await supabase
                .from("profiles")
                .select("full_name, avatar_url, verification_status")
                .eq("id", user.id)
                .single();

            if (data) {
                // 🔒 CHECK 1: ARE THEY VERIFIED? (Allow 'verified' OR 'pending')
                // If NULL (new user) or REJECTED -> Go to Verify
                if (!data.verification_status || data.verification_status === 'rejected') {
                    console.log("Gatekeeper: Not Verified -> Redirecting to /verify");
                    router.push('/verify');
                    return; // Stop here, don't show dashboard
                }

                // 🔒 CHECK 2: HAVE THEY DONE ONBOARDING?
                // If they have no name, they skipped the wizard. Force them back.
                if (!data.full_name) {
                    console.log("Gatekeeper: No Name -> Redirecting to /onboarding");
                    router.push('/onboarding');
                    return; // Stop here
                }

                // ✅ ALL CHECKS PASSED
                setProfile({
                    full_name: data.full_name || user.email?.split('@')[0] || "User",
                    avatar_url: data.avatar_url,
                    tier: "FREE",
                    // @ts-ignore
                    status: data.verification_status
                });
                setChecking(false); // Reveal Dashboard
            } else {
                // Profile doesn't exist yet? Likely a race condition or error.
                // Force Verify layout to handle creation if needed or just wait.
                // For now, assume if data missing, go to verify.
                router.push('/verify');
            }
        };

        fetchProfile();
    }, []);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push("/login"); // Force full reload/redirect
    };

    const navItems = [
        { name: "Lounge", href: "/dashboard", icon: ZapIcon },
        { name: "Messages", href: "/dashboard/chats", icon: MessageCircle },
    ];

    const bottomItems = [
        { name: "Profile", href: "/dashboard/profile", icon: User },
        { name: "Settings", href: "/dashboard/settings", icon: Settings },
    ];

    // ⏳ LOADING STATE (Prevents Flash)
    if (checking) {
        return (
            <div className="flex items-center justify-center h-screen bg-black text-white">
                <div className="animate-pulse flex flex-col items-center">
                    <div className="w-12 h-12 border-4 border-[#FF6B91] border-t-transparent rounded-full animate-spin mb-4" />
                    <p className="text-zinc-500 font-serif">Entering the Lounge...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-dvh md:h-screen flex-col md:flex-row bg-black text-white font-sans overflow-hidden">

            {/* --- MOBILE HEADER --- */}
            <div className="md:hidden h-16 border-b border-zinc-800 bg-[#0a0a0a] flex items-center justify-between px-4 z-40 shrink-0">
                <h1 className="font-serif text-xl bg-gradient-to-r from-[#FF6B91] to-[#A67CFF] bg-clip-text text-transparent">
                    Luvly Lounge.
                </h1>
                <button onClick={() => setMobileMenuOpen(true)} className="p-2 text-zinc-400 hover:text-white">
                    <Menu size={24} />
                </button>
            </div>

            {/* --- MOBILE SIDEBAR OVERLAY --- */}
            {mobileMenuOpen && (
                <div className="fixed inset-0 z-50 md:hidden">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                        onClick={() => setMobileMenuOpen(false)}
                    />

                    {/* Sidebar Content */}
                    <div className="absolute inset-y-0 left-0 w-64 bg-[#0a0a0a] border-r border-zinc-800 p-4 flex flex-col animate-in slide-in-from-left duration-200">
                        <div className="flex justify-between items-center mb-8 px-2">
                            <h1 className="font-serif text-2xl bg-gradient-to-r from-[#FF6B91] to-[#A67CFF] bg-clip-text text-transparent">
                                Luvly.
                            </h1>
                            <button onClick={() => setMobileMenuOpen(false)} className="p-2 text-zinc-500 hover:text-white">
                                <X size={24} />
                            </button>
                        </div>

                        {/* User Card (Mobile) */}
                        <div className="bg-[#111] rounded-2xl p-3 mb-6 flex items-center gap-3 border border-zinc-800">
                            <div className="w-10 h-10 rounded-full bg-zinc-800 overflow-hidden flex-shrink-0">
                                {profile.avatar_url ? (
                                    <img src={profile.avatar_url} className="w-full h-full object-cover" alt="User" />
                                ) : (
                                    <User className="w-6 h-6 m-2 text-zinc-500" />
                                )}
                            </div>
                            <div className="overflow-hidden flex-1">
                                <p className="text-sm font-bold text-white truncate">{profile.full_name}</p>
                                {/* @ts-ignore */}
                                {profile.status === 'pending' ? (
                                    <span className="flex items-center gap-1 text-[10px] text-yellow-500 font-mono mt-0.5"><Clock size={10} /> Pending</span>
                                ) : (
                                    <span className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded border border-zinc-700 font-mono">{profile.tier}</span>
                                )}
                            </div>
                        </div>

                        {/* Mobile Nav Links */}
                        <div className="flex-1 space-y-1">
                            <p className="text-xs font-bold text-zinc-500 px-2 mb-2 uppercase tracking-wider">Social</p>
                            {navItems.map((item) => (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    onClick={() => setMobileMenuOpen(false)}
                                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${pathname === item.href ? "bg-[#FF6B91]/10 text-[#FF6B91] font-medium" : "text-zinc-400 hover:bg-zinc-900 hover:text-white"}`}
                                >
                                    <item.icon size={18} /> {item.name}
                                </Link>
                            ))}
                        </div>

                        {/* Mobile Bottom Links */}
                        <div className="space-y-1 mt-6 border-t border-zinc-900 pt-6">
                            <p className="text-xs font-bold text-zinc-500 px-2 mb-2 uppercase tracking-wider">You</p>
                            {bottomItems.map((item) => (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    onClick={() => setMobileMenuOpen(false)}
                                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${pathname === item.href ? "bg-white text-black font-bold" : "text-zinc-400 hover:bg-zinc-900 hover:text-white"}`}
                                >
                                    <item.icon size={18} /> {item.name}
                                </Link>
                            ))}
                            <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-zinc-500 hover:bg-red-900/10 hover:text-red-400 transition-colors mt-2">
                                <LogOut size={18} /> Log Out
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- DESKTOP SIDEBAR (Existing) --- */}
            <div className="hidden md:flex w-64 border-r border-zinc-800 flex-col p-4 bg-[#0a0a0a] shrink-0">

                {/* Logo */}
                <div className="mb-8 px-2">
                    <h1 className="font-serif text-2xl bg-gradient-to-r from-[#FF6B91] to-[#A67CFF] bg-clip-text text-transparent">
                        Luvly Lounge.
                    </h1>
                </div>

                {/* User Card */}
                <div className="bg-[#111] rounded-2xl p-3 mb-6 flex items-center gap-3 border border-zinc-800">
                    <div className="w-10 h-10 rounded-full bg-zinc-800 overflow-hidden flex-shrink-0">
                        {profile.avatar_url ? (
                            <img src={profile.avatar_url} className="w-full h-full object-cover" alt="User" />
                        ) : (
                            <User className="w-6 h-6 m-2 text-zinc-500" />
                        )}
                    </div>
                    <div className="overflow-hidden flex-1">
                        <p className="text-sm font-bold text-white truncate">
                            {profile.full_name}
                        </p>
                        {/* @ts-ignore */}
                        {profile.status === 'pending' ? (
                            <span className="flex items-center gap-1 text-[10px] text-yellow-500 font-mono mt-0.5">
                                <Clock size={10} /> Pending
                            </span>
                        ) : (
                            <span className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded border border-zinc-700 font-mono">
                                {profile.tier}
                            </span>
                        )}
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

                {/* Upsell Banner (Desktop) */}
                <div
                    onClick={() => setShowUpgrade(true)}
                    className="mt-4 bg-gradient-to-br from-[#FF6B91] to-[#A67CFF] rounded-xl p-4 text-center cursor-pointer hover:scale-105 transition-transform"
                >
                    <Crown size={24} className="mx-auto text-white mb-2" />
                    <p className="text-[10px] text-white/80 font-medium leading-tight">
                        Unlock unlimited chats & gold badge.
                    </p>
                </div>

            </div>

            {/* --- MAIN CONTENT AREA --- */}
            <main className="flex-1 overflow-y-auto relative bg-[#0a0a0a] w-full">
                {children}
            </main>

            {/* MODALS */}
            <UpgradeModal isOpen={showUpgrade} onClose={() => setShowUpgrade(false)} />

        </div>
    );
}
