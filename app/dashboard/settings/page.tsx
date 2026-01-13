"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Camera, Save, AlertTriangle, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [userId, setUserId] = useState("");

    // Form State
    const [fullName, setFullName] = useState("");
    const [bio, setBio] = useState("");
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

    const supabase = createClient();
    const router = useRouter();

    useEffect(() => {
        const loadProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            setUserId(user.id);

            const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
            if (data) {
                setFullName(data.full_name || "");
                setBio(data.bio || "");
                setAvatarUrl(data.avatar_url);
            }
        };
        loadProfile();
    }, []);

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];
        if (file.size > 2 * 1024 * 1024) return alert("File too big (Max 2MB)");

        setUploading(true);
        const fileExt = file.name.split('.').pop();
        const filePath = `${userId}/avatar.${fileExt}`;

        const { data: oldFiles } = await supabase.storage.from('avatars').list(userId);
        if (oldFiles && oldFiles.length > 0) {
            await supabase.storage.from('avatars').remove(oldFiles.map(x => `${userId}/${x.name}`));
        }

        const { error } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true });

        if (!error) {
            const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
            const urlWithTime = `${publicUrl}?t=${Date.now()}`;
            setAvatarUrl(urlWithTime);
            await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", userId);
        }
        setUploading(false);
    };

    const handleSave = async () => {
        setLoading(true);
        await supabase.from("profiles").update({ full_name: fullName, bio: bio }).eq("id", userId);
        setLoading(false);
        alert("Profile Updated!");
    };

    const handleDeleteAccount = async () => {
        const confirmText = prompt("Type 'DELETE' to confirm account deletion. This cannot be undone.");
        if (confirmText === "DELETE") {
            setLoading(true);
            await supabase.from("profiles").delete().eq("id", userId);
            await supabase.auth.signOut();
            router.push("/login");
        }
    };

    return (
        <div className="min-h-screen bg-black text-white p-4 md:p-8 flex justify-center">
            <div className="max-w-xl w-full space-y-8">

                <h1 className="text-3xl font-serif text-[#FF6B91]">Edit Profile</h1>

                {/* AVATAR */}
                <div className="bg-[#111] border border-zinc-800 rounded-2xl p-6 flex items-center gap-6">
                    <div className="relative group w-24 h-24 flex-shrink-0">
                        <div className="w-full h-full rounded-full overflow-hidden border-2 border-zinc-700 bg-zinc-900">
                            {avatarUrl ? (
                                <img src={avatarUrl} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full bg-zinc-800" />
                            )}
                        </div>
                        <label className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 cursor-pointer rounded-full transition-opacity">
                            <Camera className="text-white" />
                            <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                        </label>
                    </div>
                    <div>
                        <h3 className="font-bold">Profile Photo</h3>
                        <p className="text-xs text-zinc-500 mt-1">Click the image to upload. Max 2MB.</p>
                        {uploading && <p className="text-xs text-[#FF6B91] mt-2 animate-pulse">Uploading...</p>}
                    </div>
                </div>

                {/* DETAILS */}
                <div className="space-y-4">
                    <div>
                        <label htmlFor="full-name" className="text-xs font-bold text-zinc-500 uppercase mb-2 block">Display Name</label>
                        <input
                            id="full-name"
                            name="fullName"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className="w-full bg-[#111] border border-zinc-800 rounded-xl p-4 text-white focus:border-[#FF6B91] outline-none"
                        />
                    </div>
                    <div>
                        <label htmlFor="bio" className="text-xs font-bold text-zinc-500 uppercase mb-2 block">Bio / Status</label>
                        {/* ACCESSIBILITY FIX: Added ID and Name */}
                        <textarea
                            id="bio"
                            name="bio"
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                            className="w-full bg-[#111] border border-zinc-800 rounded-xl p-4 text-white focus:border-[#FF6B91] outline-none h-32 resize-none"
                            placeholder="Tell the world who you are..."
                        />
                    </div>
                </div>

                <button
                    onClick={handleSave}
                    disabled={loading}
                    className="bg-white text-black font-bold py-3 px-6 rounded-xl flex items-center gap-2 hover:bg-zinc-200 transition-colors"
                >
                    <Save size={18} /> {loading ? "Saving..." : "Save Changes"}
                </button>

                {/* --- DANGER ZONE --- */}
                <div className="mt-12 pt-12 border-t border-zinc-900">
                    <h3 className="text-red-500 font-bold mb-4 flex items-center gap-2">
                        <AlertTriangle size={18} /> Danger Zone
                    </h3>
                    <div className="bg-red-900/10 border border-red-900/30 rounded-2xl p-6 flex items-center justify-between">
                        <div>
                            <p className="font-bold text-white text-sm">Delete Account</p>
                            <p className="text-xs text-zinc-500 mt-1">Once you delete your account, there is no going back.</p>
                        </div>
                        <button
                            onClick={handleDeleteAccount}
                            className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition-colors"
                        >
                            <Trash2 size={14} /> Delete
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}
