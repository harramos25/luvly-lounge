"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Check, X, ShieldAlert, AlertTriangle } from "lucide-react";

type PendingUser = {
    id: string;
    email: string;
    verification_image_path: string;
    verification_status: string;
};

export default function AdminPage() {
    const [users, setUsers] = useState<PendingUser[]>([]);
    const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        fetchPendingUsers();
    }, []);

    const fetchPendingUsers = async () => {
        console.log("Fetching users...");
        const { data: users, error } = await supabase
            .from("profiles")
            .select("id, email, verification_image_path, verification_status")
            .eq("verification_status", "pending");

        if (error) console.error("Database Error:", error);

        if (users) {
            setUsers(users);
            const urls: Record<string, string> = {};

            for (const user of users) {
                if (user.verification_image_path) {
                    console.log(`Trying to sign URL for: ${user.verification_image_path}`);

                    // GENERATE SIGNED URL
                    const { data, error: signError } = await supabase.storage
                        .from("verifications")
                        .createSignedUrl(user.verification_image_path, 3600);

                    if (signError) {
                        console.error("Sign Error for user " + user.email, signError);
                    } else if (data) {
                        console.log("Success! URL generated:", data.signedUrl);
                        urls[user.id] = data.signedUrl;
                    }
                }
            }
            setImageUrls(urls);
        }
        setLoading(false);
    };

    const handleApprove = async (userId: string) => {
        // 1. Delete Image from Storage to save space/privacy
        const user = users.find(u => u.id === userId);
        if (user?.verification_image_path) {
            await supabase.storage.from("verifications").remove([user.verification_image_path]);
        }

        // 2. Update DB
        await supabase.from("profiles").update({ verification_status: "verified" }).eq("id", userId);

        // 3. Update UI
        setUsers(users.filter(u => u.id !== userId));
    };

    const handleReject = async (userId: string) => {
        // 1. Delete Image from Storage
        const user = users.find(u => u.id === userId);
        if (user?.verification_image_path) {
            await supabase.storage.from("verifications").remove([user.verification_image_path]);
        }

        // 2. Update DB
        await supabase.from("profiles").update({ verification_status: "rejected" }).eq("id", userId);

        // 3. Update UI
        setUsers(users.filter(u => u.id !== userId));
    };

    if (loading) return <div className="p-10 text-white">Loading...</div>;

    return (
        <div className="min-h-screen bg-black text-white p-8">
            <h1 className="text-3xl font-serif text-[#FF6B91] mb-8">Admin Console</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {users.length === 0 ? <p className="text-zinc-500">No pending requests.</p> : users.map((user) => (
                    <div key={user.id} className="bg-[#111] border border-zinc-800 rounded-xl overflow-hidden">

                        {/* IMAGE AREA */}
                        <div className="aspect-video bg-zinc-900 relative flex items-center justify-center">
                            {imageUrls[user.id] ? (
                                <img src={imageUrls[user.id]} alt="Proof" className="w-full h-full object-cover" />
                            ) : (
                                <div className="text-red-400 text-xs text-center px-4">
                                    <AlertTriangle className="mx-auto mb-2" />
                                    Image Error.<br />Check Console (F12)
                                </div>
                            )}
                        </div>

                        <div className="p-4">
                            <p className="text-sm text-white mb-4">{user.email}</p>
                            <div className="flex gap-2">
                                <button onClick={() => handleReject(user.id)} className="flex-1 bg-zinc-800 py-2 rounded text-sm">Deny</button>
                                <button onClick={() => handleApprove(user.id)} className="flex-1 bg-[#FF6B91] text-black font-bold py-2 rounded text-sm">Approve</button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
