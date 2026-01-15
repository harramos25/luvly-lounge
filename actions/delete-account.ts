"use server";

import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function deleteAccount() {
    const cookieStore = await cookies();

    // 1. Get the current user from the session
    // We need to create a client just to get the session ID
    // But actually, we can't reliably get the session without the anon key client.
    // However, we can trust the caller if we verify the session.

    // Better approach: verify session using standard auth, then use Admin to delete.

    // Create standard SSR client to get user (requires @supabase/ssr or just standard fetch if simple)
    // For simplicity in this stack, let's assume we pass the User ID or we use the standard cookie methods if available.
    // Wait, we can't import `createClient` from `@/utils/supabase/server` if it's not set up for Server Actions.
    // Let's try to grab the user ID from the request cookies via a workaround or just trust the call if we can get the user.

    // actually, let's use the provided utils if they exist.
    // Assuming `utils/supabase/server` exists as standard nextjs pattern.

    // Fallback: Use the anon client to get user, then admin to delete.
    // BUT strict fix: We need the Service Role client to delete the user from Auth.

    const adminSupabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });

    // We need to know WHICH user to delete.
    // We must verify the user's identity first. 
    // We can do this by creating a regular client with the user's cookies.

    const { createServerClient } = await import("@supabase/ssr");

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet) {
                    // We don't need to set cookies here
                },
            },
        }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return { error: "Not authenticated" };
    }

    // 2. Delete the user using Admin Client
    const { error: deleteError } = await adminSupabase.auth.admin.deleteUser(user.id);

    if (deleteError) {
        console.error("Delete Account Error:", deleteError);
        return { error: deleteError.message };
    }

    return { success: true };
}
