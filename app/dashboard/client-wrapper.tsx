"use client";

import { usePathname } from "next/navigation";
import { useSidebar } from "./sidebar-context";
import { Menu } from "lucide-react";

function DashboardHeader() {
    const { toggle } = useSidebar();
    return (
        <header className="flex items-center justify-between px-4 py-3 bg-[#111] border-b border-zinc-800 md:hidden">
            <div className="flex items-center gap-3">
                <button onClick={toggle} className="text-zinc-400 hover:text-white">
                    <Menu size={24} />
                </button>
                <h1 className="text-lg font-bold bg-gradient-to-r from-[#FF6B91] to-[#A67CFF] bg-clip-text text-transparent">
                    Luvly Lounge
                </h1>
            </div>
        </header>
    );
}

export default function DashboardClientWrapper({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const hideGlobalHeader = pathname === "/dashboard" || pathname?.startsWith("/dashboard/chats");

    return (
        <div className="flex-1 flex flex-col h-full relative w-full">
            {!hideGlobalHeader && <DashboardHeader />}
            <main className="flex-1 overflow-hidden h-full w-full relative">
                {children}
            </main>
        </div>
    );
}
