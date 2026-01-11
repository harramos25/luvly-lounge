"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Check, X, ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";

// Define the shape of our data
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
        checkAdmin();
        fetchPendingUsers();
    }, []);

    // 1. Security: Simple check to ensure only YOU can see this
    const checkAdmin = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        // REPLACE THIS with your actual email to lock it down!
        if (user?.email !== "harra.ramos26@gmail.com") {
            // alert("Access Denied");
            // router.push("/dashboard");
        }
    };

    // 2. Fetch people waiting to get in
    const fetchPendingUsers = async () => {
        const { data, error } = await supabase
            .from("profiles")
            .select("id, email, verification_image_path, verification_status")
            .eq("verification_status", "pending");

        if (error) {
            console.error("Error fetching users:", error);
        }

        if (data) {
            setUsers(data);
            // Download the private images for these users
            data.forEach(async (user) => {
                if (user.verification_image_path) {
                    const { data: imgData } = await supabase.storage
                        .from("verifications")
                        .createSignedUrl(user.verification_image_path, 3600); // URL valid for 1 hour

                    if (imgData) {
                        setImageUrls(prev => ({ ...prev, [user.id]: imgData.signedUrl }));
                    }
                }
            });
        }
        setLoading(false);
    };

    // 3. The "Approve" Button Logic
    const handleApprove = async (userId: string) => {
        const { error } = await supabase
            .from("profiles")
            .update({ verification_status: "verified" })
            .eq("id", userId);

        if (!error) {
            alert("User Approved!");
            setUsers(users.filter(u => u.id !== userId)); // Remove from list
        } else {
            alert("Error approving: " + error.message);
        }
    };

    // 4. The "Reject" Button Logic
    const handleReject = async (userId: string) => {
        const { error } = await supabase
            .from("profiles")
            .update({ verification_status: "rejected" })
            .eq("id", userId);

        if (!error) {
            alert("User Rejected.");
            setUsers(users.filter(u => u.id !== userId));
        } else {
            alert("Error rejecting: " + error.message);
        }
    };

    if (loading) return <div className="p-10 text-white">Loading Admin Panel...</div>;

    return (
        <div className="min-h-screen bg-black text-white p-8">
            <div className="flex items-center gap-4 mb-8">
                <ShieldAlert className="text-[#FF6B91]" size={40} />
                <h1 className="text-3xl font-serif text-[#FF6B91]">Admin "God Mode"</h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {users.length === 0 ? (
                    <p className="text-zinc-500">No pending verifications.</p>
                ) : (
                    users.map((user) => (
                        <div key={user.id} className="bg-[#111] border border-zinc-800 rounded-xl overflow-hidden">
                            {/* The Evidence */}
                            <div className="aspect-video bg-zinc-900 relative">
                                {imageUrls[user.id] ? (
                                    <img
                                        src={imageUrls[user.id]}
                                        alt="Verification"
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="flex items-center justify-center h-full text-zinc-600">Loading Image...</div>
                                )}
                            </div>

                            {/* The Controls */}
                            <div className="p-4">
                                <p className="text-sm text-zinc-400 mb-4">User: <span className="text-white">{user.email}</span></p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleReject(user.id)}
                                        className="flex-1 bg-zinc-800 hover:bg-red-900/50 text-white py-2 rounded-lg flex items-center justify-center gap-2"
                                    >
                                        <X size={16} /> Reject
                                    </button>
                                    <button
                                        onClick={() => handleApprove(user.id)}
                                        className="flex-1 bg-[#FF6B91] hover:bg-[#FF6B91]/80 text-black font-bold py-2 rounded-lg flex items-center justify-center gap-2"
                                    >
                                        <Check size={16} /> Approve
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
