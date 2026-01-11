import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Sidebar from "@/components/Sidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
    const supabase = await createClient();

    // 1. Check Auth
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        redirect("/login");
    }

    // 2. Check Profile & Verification
    const { data: profile } = await supabase
        .from("profiles")
        .select("verification_status, verification_image_path")
        .eq("id", user.id)
        .single();

    // If profile doesn't exist, or they were rejected, OR they haven't uploaded a selfie yet...
    // GATE THEM!
    if (!profile || profile.verification_status === 'rejected' || !profile.verification_image_path) {
        redirect("/verify");
    }

    return (
        <div className="flex h-screen bg-[#0a0a0a] overflow-hidden">
            <Sidebar />
            <main className="flex-1 md:ml-72 relative overflow-y-auto">
                {children}
            </main>
        </div>
    );
}
