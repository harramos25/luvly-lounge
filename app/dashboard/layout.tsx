"use client";

import { usePathname } from "next/navigation";
import Sidebar from "./sidebar";
import { SidebarProvider, useSidebar } from "./sidebar-context";
import { Menu } from "lucide-react";

// Helper component to handle the toggle button logic
function DashboardHeader({ children }: { children: React.ReactNode }) {
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

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    // LOGIC: Hide Global Header on Dashboard (Lobby) AND Chat Rooms
    // Because those pages now have their own custom headers.
    const hideGlobalHeader = pathname === "/dashboard" || pathname?.startsWith("/dashboard/chats");

    return (
        <SidebarProvider>
            <div className="flex h-screen bg-[#0a0a0a] text-white font-sans overflow-hidden">
                {/* Sidebar */}
                <Sidebar />

                {/* Main Content */}
                <div className="flex-1 flex flex-col h-full relative w-full">
                    {/* Only show this Global Header if we are NOT on Dashboard/Chats */}
                    {!hideGlobalHeader && (
                        <DashboardHeader>{children}</DashboardHeader>
                    )}

                    {/* Page Content */}
                    <main className="flex-1 overflow-hidden h-full w-full relative">
                        {children}
                    </main>
                </div>
            </div>
        </SidebarProvider>
    );
}
