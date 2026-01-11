"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Check, X, ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";

type PendingUser = {
    id: string;
    email: string;
    verification_image_path: string;
    verification_status: string;
};

export default function AdminPage() {
    const [users, setUsers] = useState<PendingUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
    const supabase = createClient();
    const router = useRouter();

    useEffect(() => {
        const fetchPendingUsers = async () => {
            // 1. Get the list of people waiting
            const { data, error } = await supabase
                .from("profiles")
                .select("id, email, verification_image_path, verification_status")
                .eq("verification_status", "pending");

            if (data) {
                setUsers(data);

                // 2. SECURELY generate temporary links for each image
                // This only works because you added the "Admin Access" policy!
                const urls: Record<string, string> = {};
                for (const user of data) {
                    if (user.verification_image_path) {
                        const { data: signedData } = await supabase.storage
                            .from("verifications")
                            .createSignedUrl(user.verification_image_path, 3600); // Valid for 1 hour

                        if (signedData) {
                            urls[user.id] = signedData.signedUrl;
                        }
                    }
                }
                setImageUrls(urls);
            }
            setLoading(false);
        };

        fetchPendingUsers();
    }, []);

    const handleApprove = async (userId: string) => {
        const { error } = await supabase
            .from("profiles")
            .update({ verification_status: "verified" })
            .eq("id", userId);

        if (!error) {
            alert("User Approved!");
            setUsers(users.filter(u => u.id !== userId));
        }
    };

    const handleReject = async (userId: string, imagePath: string) => {
        // Reject user AND delete the photo to clean up storage
        const { error } = await supabase
            .from("profiles")
            .update({ verification_status: "rejected" })
            .eq("id", userId);

        if (!error) {
            // Optional: Delete the image to save space
            await supabase.storage.from("verifications").remove([imagePath]);
            alert("User Rejected.");
            setUsers(users.filter(u => u.id !== userId));
        }
    };

    if (loading) return <div className="p-10 text-white font-mono">Loading Secret Vault...</div>;

    return (
        <div className="min-h-screen bg-black text-white p-8">
            <div className="flex items-center gap-4 mb-8 border-b border-zinc-800 pb-4">
                <ShieldAlert className="text-[#FF6B91]" size={32} />
                <h1 className="text-3xl font-serif text-white">Admin Verification Console</h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {users.length === 0 ? (
                    <p className="text-zinc-500 italic">No pending verifications. Good job!</p>
                ) : (
                    users.map((user) => (
                        <div key={user.id} className="bg-[#111] border border-zinc-800 rounded-xl overflow-hidden shadow-2xl hover:border-[#FF6B91]/50 transition-colors">
                            {/* THE EVIDENCE */}
                            <div className="aspect-video bg-zinc-900 relative group">
                                {imageUrls[user.id] ? (
                                    <img
                                        src={imageUrls[user.id]}
                                        alt="Proof"
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="flex items-center justify-center h-full text-zinc-600 animate-pulse">
                                        Decrypting Image...
                                    </div>
                                )}
                            </div>

                            {/* THE JUDGMENT */}
                            <div className="p-4">
                                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Applicant</p>
                                <p className="text-sm text-white font-medium mb-4">{user.email}</p>

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => handleReject(user.id, user.verification_image_path)}
                                        className="flex-1 bg-zinc-900 hover:bg-red-900/30 text-zinc-400 hover:text-red-400 border border-zinc-800 py-2 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2"
                                    >
                                        <X size={14} /> Deny
                                    </button>
                                    <button
                                        onClick={() => handleApprove(user.id)}
                                        className="flex-1 bg-gradient-to-r from-[#FF6B91] to-[#A67CFF] text-white py-2 rounded-lg text-sm font-bold shadow-lg hover:shadow-[#FF6B91]/25 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Check size={14} /> Approve
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
