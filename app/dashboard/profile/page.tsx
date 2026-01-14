"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { MapPin, Calendar, Heart, Share2, Edit3, ShieldCheck, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();
    const router = useRouter();

    useEffect(() => {
        const getProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data } = await supabase
                    .from("profiles")
                    .select("*")
                    .eq("id", user.id)
                    .single();
                setProfile(data);
            }
            setLoading(false);
        };
        getProfile();
    }, []);

    const handleDeleteAccount = async () => {
        const confirmDelete = window.confirm("Are you ABSOLUTELY sure? This will permanently delete your account and all data.");
        if (!confirmDelete) return;

        const { error } = await supabase.rpc('delete_user_account');

        if (error) {
            console.error(error);
            alert("Failed to delete account. Make sure you installed the SQL function! " + error.message);
        } else {
            await supabase.auth.signOut();
            alert("Account deleted. Goodbye! 💔");
            router.push("/login");
        }
    };

    if (loading) return <div className="p-10 text-white">Loading Profile...</div>;
    if (!profile) return null;

    return (
        <div className="h-full overflow-y-auto bg-black p-4 md:p-8 text-white">

            {/* BANNER AREA */}
            <div className="relative mb-20">
                {/* Banner Image (Gradient for now) */}
                <div className="h-48 w-full bg-gradient-to-r from-[#FF6B91] to-[#A67CFF] rounded-3xl opacity-80"></div>

                {/* Profile Card Overlay */}
                <div className="absolute -bottom-16 left-8 flex items-end gap-6">
                    <div className="w-32 h-32 rounded-full border-4 border-black overflow-hidden bg-zinc-900">
                        {profile.avatar_url ? (
                            <img src={profile.avatar_url} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full bg-zinc-800"></div>
                        )}
                    </div>
                    <div className="mb-4">
                        <h1 className="text-3xl font-serif font-bold flex items-center gap-2">
                            {profile.full_name}
                            <ShieldCheck size={24} className="text-[#FF6B91]" />
                        </h1>
                        <p className="text-zinc-400">@{profile.email?.split('@')[0]}</p>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="absolute bottom-4 right-8 flex gap-3">
                    <button className="bg-white/10 hover:bg-white/20 backdrop-blur-md px-4 py-2 rounded-xl flex items-center gap-2 transition-all">
                        <Share2 size={18} /> Share
                    </button>
                    <Link href="/dashboard/settings">
                        <button className="bg-white text-black font-bold px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-zinc-200 transition-all">
                            <Edit3 size={18} /> Edit Profile
                        </button>
                    </Link>
                </div>
            </div>

            {/* STATS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 max-w-5xl">

                {/* LEFT: INFO */}
                <div className="space-y-6">
                    <div className="bg-[#111] border border-zinc-800 rounded-2xl p-6">
                        <h3 className="font-bold text-lg mb-4 text-white">About</h3>
                        <p className="text-zinc-400 leading-relaxed text-sm">
                            {profile.bio || "No bio yet. Just mysterious like that. ✨"}
                        </p>

                        <div className="mt-6 space-y-3">
                            <div className="flex items-center gap-3 text-sm text-zinc-500">
                                <MapPin size={18} className="text-[#FF6B91]" />
                                Philippines (Cagayan De Oro)
                            </div>
                            <div className="flex items-center gap-3 text-sm text-zinc-500">
                                <Calendar size={18} className="text-[#A67CFF]" />
                                Joined January 2026
                            </div>
                        </div>
                    </div>
                </div>

                {/* MIDDLE: INTERESTS */}
                <div className="md:col-span-2 space-y-6">
                    <div className="bg-[#111] border border-zinc-800 rounded-2xl p-6">
                        <h3 className="font-bold text-lg mb-4 text-white">Interests</h3>
                        <div className="flex flex-wrap gap-2">
                            {profile.interests && profile.interests.length > 0 ? (
                                profile.interests.map((tag: string) => (
                                    <span key={tag} className="px-4 py-2 rounded-full bg-zinc-900 border border-zinc-800 text-sm hover:border-[#FF6B91] hover:text-[#FF6B91] transition-colors cursor-default">
                                        {tag}
                                    </span>
                                ))
                            ) : (
                                <p className="text-zinc-600 italic">No interests selected.</p>
                            )}
                        </div>
                    </div>

                    {/* IDENTITY BADGE */}
                    <div className="bg-gradient-to-br from-[#111] to-[#1A1A1A] border border-zinc-800 rounded-2xl p-6 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-zinc-500 uppercase mb-1">Identity</p>
                            <p className="text-xl text-white font-medium">{profile.gender || "Not specified"}</p>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-[#FF6B91]/10 flex items-center justify-center">
                            <Heart className="text-[#FF6B91]" fill="currentColor" />
                        </div>
                    </div>
                </div>

            </div>

            {/* DANGER ZONE */}
            <div className="mt-16 max-w-5xl border-t border-zinc-900 pt-8 pb-20">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                        <h3 className="text-red-500 font-bold mb-1">Danger Zone</h3>
                        <p className="text-zinc-500 text-sm">Once you delete your account, there is no going back. Please be certain.</p>
                    </div>
                    <button
                        onClick={handleDeleteAccount}
                        className="bg-red-500/10 text-red-500 border border-red-500/50 hover:bg-red-500 hover:text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all"
                    >
                        <Trash2 size={18} /> Delete Account
                    </button>
                </div>
            </div>
        </div>
    );
}
