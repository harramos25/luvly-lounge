"use client";

import { usePathname } from "next/navigation";
import Sidebar from "./sidebar";
import { SidebarProvider, useSidebar } from "./sidebar-context";
import { Menu } from "lucide-react";
import Gatekeeper from "@/components/Gatekeeper"; // Import Gatekeeper

// The Global Header (Only for pages that lack their own header)
function GlobalMobileHeader({ children }: { children: React.ReactNode }) {
    const { toggle } = useSidebar();

    return (
        <div className="flex flex-col h-full">
            {/* Mobile Header */}
            <header className="flex-none h-16 flex items-center px-4 border-b border-zinc-800 bg-[#0d0d0d] md:hidden z-30">
                <button onClick={toggle} className="p-2 -ml-2 text-zinc-400 hover:text-white rounded-lg active:bg-zinc-800">
                    <Menu size={24} />
                </button>
                <span className="ml-3 font-bold text-white">Luvly Lounge</span>
            </header>

            {/* Page Content */}
            <main className="flex-1 overflow-hidden relative">
                {children}
            </main>
        </div>
    );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    // STRICT RULE: If we are on "/dashboard" OR any "/dashboard/chats/..." page, 
    // we HIDE the global header because those pages have their own custom UI.
    // Added trailing slash check just in case.
    const isImmersivePage = pathname === "/dashboard" || pathname === "/dashboard/" || pathname?.startsWith("/dashboard/chats");

    return (
        <SidebarProvider>
            {/* 🔒 GATEKEEPER WRAPPER: Enforces Verify -> Onboarding -> Dashboard flow */}
            <Gatekeeper>
                <div className="flex h-[100dvh] bg-black text-white font-sans overflow-hidden">
                    {/* Desktop/Mobile Sidebar */}
                    <Sidebar />

                    {/* Content Area */}
                    <div className="flex-1 h-full relative w-full">
                        {isImmersivePage ? (
                            // Immersive Mode: No global header, page handles everything (Full Height)
                            <main className="h-full w-full relative overflow-hidden">
                                {children}
                            </main>
                        ) : (
                            // Standard Mode: Shows global mobile header (e.g. Settings, Profile pages)
                            <GlobalMobileHeader>{children}</GlobalMobileHeader>
                        )}
                    </div>
                </div>
            </Gatekeeper>
        </SidebarProvider>
    );
}
