import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Sidebar from "@/components/Sidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    // CHECK VERIFICATION STATUS
    const { data: profile } = await supabase
        .from("profiles")
        .select("verification_status")
        .eq("id", user.id)
        .single();

    // If they are NOT verified, kick them to /verify
    // Redirect if they have NO status or 'rejected'.
    if (!profile || profile.verification_status === 'rejected') {
        redirect("/verify");
    }

    // Note: 'pending' status users are allowed in, but might have restricted access in the future.

    return (
        <div className="flex h-screen bg-[#0a0a0a] overflow-hidden">
            <Sidebar />
            <main className="flex-1 md:ml-72 relative overflow-y-auto">
                {children}
            </main>
        </div>
    );
}
