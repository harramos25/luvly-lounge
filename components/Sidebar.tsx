import { createClient } from "@/utils/supabase/server";
import SidebarClient from "./SidebarClient";

export default async function Sidebar() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    let profile = null;
    if (user) {
        const { data } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .single();
        profile = data;
    }

    // Fallbacks
    const username = profile?.username || user?.email?.split('@')[0] || "Guest";
    const avatarUrl = profile?.avatar_url;
    const tier = profile?.tier || "free";
    const isPremium = tier === "pro" || tier === "plus";

    return (
        <SidebarClient
            username={username}
            avatarUrl={avatarUrl}
            tier={tier}
            isPremium={isPremium}
        />
    );
}
