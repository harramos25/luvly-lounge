"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Loader2 } from "lucide-react";

export default function Gatekeeper({ children }: { children: React.ReactNode }) {
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();
    const supabase = createClient();

    // Allow unrestricted access to sub-pages if necessary, but generally Dashboard requires full auth.
    // We strictly check profile status here.

    useEffect(() => {
        const checkUser = async () => {
            // 1. Get User
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.replace("/login");
                return;
            }

            // 2. Get Profile
            const { data: profile } = await supabase
                .from("profiles")
                .select("verification_status, verification_image_path, full_name, interests, gender_identity, dob")
                .eq("id", user.id)
                .single();

            // 🚨 CHECK 1: VERIFICATION
            // If no status, rejected, OR (pending but NO image), go to Verify
            if (
                !profile?.verification_status ||
                profile.verification_status === 'rejected' ||
                (profile.verification_status === 'pending' && !profile.verification_image_path)
            ) {
                router.replace("/verify");
                return;
            }

            // 🚨 CHECK 2: ONBOARDING
            // If they haven't finished setup (name, interests, gender, dob)
            if (!profile?.full_name || !profile?.interests || profile.interests.length === 0 || !profile?.gender_identity || !profile?.dob) {
                router.replace("/onboarding");
                return;
            }

            // If we are here, they are good.
            setLoading(false);
        };

        checkUser();
    }, [router, supabase]);

    if (loading) {
        return (
            <div className="h-screen w-full flex flex-col items-center justify-center bg-black text-white">
                <Loader2 size={40} className="animate-spin text-[#FF6B91] mb-4" />
                <p className="text-zinc-500 font-serif animate-pulse">Checking credentials...</p>
            </div>
        );
    }

    return <>{children}</>;
}
