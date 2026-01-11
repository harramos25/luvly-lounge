"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { User, Camera, Save, Loader2 } from "lucide-react";

export default function SettingsPage() {
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [fullName, setFullName] = useState("");
    const [bio, setBio] = useState("");
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [userId, setUserId] = useState("");

    const supabase = createClient();

    useEffect(() => {
        getProfile();
    }, []);

    const getProfile = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            setUserId(user.id);
            // Fetch existing profile data
            const { data } = await supabase
                .from("profiles")
                .select("full_name, bio, avatar_url")
                .eq("id", user.id)
                .single();

            if (data) {
                setFullName(data.full_name || "");
                setBio(data.bio || "");
                // If there's an avatar, use it.
                if (data.avatar_url) {
                    setAvatarUrl(data.avatar_url);
                }
            }
        }
        setLoading(false);
    };

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        const file = e.target.files[0];

        // 🛑 1. CHECK FILE SIZE (Limit to 2MB)
        // 2MB = 2 * 1024 * 1024 bytes
        if (file.size > 2 * 1024 * 1024) {
            alert("File is too big! Please upload a file under 2MB. \n\nTip: Use a tool like TinyPNG.com to compress your image.");
            e.target.value = ""; // Clear the input
            return;
        }

        setUploading(true);
        const fileExt = file.name.split('.').pop();
        const newFilePath = `${userId}/avatar.${fileExt}`;

        // 2. CLEANUP: Find and Delete OLD files first
        // We list all files in the user's folder and delete them to prevent clutter.
        const { data: oldFiles } = await supabase.storage
            .from('avatars')
            .list(userId); // List everything in user's folder

        if (oldFiles && oldFiles.length > 0) {
            const filesToRemove = oldFiles.map((x) => `${userId}/${x.name}`);
            await supabase.storage.from('avatars').remove(filesToRemove);
        }

        // 3. UPLOAD NEW FILE
        const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(newFilePath, file, { upsert: true });

        if (uploadError) {
            alert("Error uploading: " + uploadError.message);
        } else {
            // 4. Get Public URL (Force a refresh timestamp so the image updates instantly)
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(newFilePath);

            const publicUrlWithTimestamp = `${publicUrl}?t=${Date.now()}`;

            // 5. Save URL to Database
            setAvatarUrl(publicUrlWithTimestamp);
            await supabase
                .from("profiles")
                .update({ avatar_url: publicUrl }) // Save clean URL in DB
                .eq("id", userId);
        }
        setUploading(false);
    };

    const handleSave = async () => {
        setLoading(true);
        const { error } = await supabase
            .from("profiles")
            .update({ full_name: fullName, bio: bio })
            .eq("id", userId);

        if (!error) alert("Profile updated!");
        setLoading(false);
    };

    if (loading) return <div className="p-8 text-white">Loading settings...</div>;

    return (
        <div className="p-8 max-w-2xl mx-auto text-white">
            <h1 className="text-3xl font-serif text-[#FF6B91] mb-8">Edit Profile</h1>

            <div className="bg-[#111] border border-zinc-800 rounded-2xl p-8 space-y-8">

                {/* Avatar Section */}
                <div className="flex items-center gap-6">
                    <div className="relative group">
                        <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-zinc-700 bg-zinc-900">
                            {avatarUrl ? (
                                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-zinc-500">
                                    <User size={40} />
                                </div>
                            )}
                        </div>
                        <label className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity rounded-full">
                            <Camera size={24} className="text-white" />
                            <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                        </label>
                    </div>
                    <div>
                        <h3 className="font-bold text-lg">Profile Photo</h3>
                        <p className="text-zinc-500 text-sm">Click the image to upload. Max 2MB.</p>
                        {uploading && <p className="text-[#FF6B91] text-xs mt-1 animate-pulse">Uploading...</p>}
                    </div>
                </div>

                {/* Form Section */}
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Display Name</label>
                        <input
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className="w-full bg-black border border-zinc-800 rounded-lg p-3 text-white focus:border-[#FF6B91] outline-none"
                            placeholder="E.g. Lux"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Bio / Status</label>
                        <textarea
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                            className="w-full bg-black border border-zinc-800 rounded-lg p-3 text-white focus:border-[#FF6B91] outline-none h-24 resize-none"
                            placeholder="What's on your mind?"
                        />
                    </div>
                </div>

                <button
                    onClick={handleSave}
                    disabled={loading}
                    className="bg-white text-black font-bold py-3 px-6 rounded-lg flex items-center gap-2 hover:bg-zinc-200 transition-colors"
                >
                    {loading ? <Loader2 className="animate-spin" /> : <Save size={18} />}
                    Save Changes
                </button>

            </div>
        </div>
    );
}
