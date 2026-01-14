import Sidebar from "./sidebar";
import { SidebarProvider } from "./sidebar-context";
import DashboardClientWrapper from "./client-wrapper";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <SidebarProvider>
            <div className="flex h-screen bg-[#0a0a0a] text-white font-sans overflow-hidden">
                {/* Sidebar (Server Component) */}
                <Sidebar />

                {/* Main Content (Client Logic for Header/Pathname) */}
                <DashboardClientWrapper>
                    {children}
                </DashboardClientWrapper>
            </div>
        </SidebarProvider>
    );
}
