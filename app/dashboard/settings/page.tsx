"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Camera, Save } from "lucide-react";

export default function SettingsPage() {
    const [userId, setUserId] = useState<string | null>(null);
    const [fullName, setFullName] = useState("");
    const [bio, setBio] = useState("");
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);

    const supabase = createClient();

    useEffect(() => {
        const getProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUserId(user.id);
                const { data } = await supabase
                    .from("profiles")
                    .select("*")
                    .eq("id", user.id)
                    .single();

                if (data) {
                    setFullName(data.full_name || "");
                    setBio(data.bio || "");
                    setAvatarUrl(data.avatar_url);
                }
            }
        };
        getProfile();
    }, []);

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];

        // 1. Enforce 2MB Limit Strict Check
        if (file.size > 2 * 1024 * 1024) {
            alert("File is too big! Please upload a file under 2MB. \n\nTip: Use a tool like TinyPNG.com to compress your image.");
            e.target.value = ""; // Clear the input
            return;
        }

        setUploading(true);
        const fileExt = file.name.split('.').pop();
        const filePath = `${userId}/avatar.${fileExt}`;

        if (!userId) return;

        // 2. SEARCH & DESTROY (Clean up old avatars)
        // List all files in the user's folder
        const { data: list } = await supabase.storage.from("avatars").list(userId);

        // If files exist, delete them all
        if (list && list.length > 0) {
            const filesToRemove = list.map((x) => `${userId}/${x.name}`);
            await supabase.storage.from("avatars").remove(filesToRemove);
        }

        // 3. Upload the new clean file
        const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(filePath, file, { upsert: true });

        if (uploadError) {
            alert("Error uploading avatar");
        } else {
            // Get Public URL with timestamp to force refresh
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            const urlWithTimestamp = `${publicUrl}?t=${new Date().getTime()}`;
            setAvatarUrl(urlWithTimestamp);

            // Auto-save the URL to profile
            await supabase.from("profiles").update({ avatar_url: urlWithTimestamp }).eq("id", userId);
        }
        setUploading(false);
    };

    const handleSave = async () => {
        setLoading(true);
        const { error } = await supabase
            .from("profiles")
            .update({
                full_name: fullName,
                bio: bio,
                avatar_url: avatarUrl
            })
            .eq("id", userId);

        if (error) alert("Error saving profile");
        else alert("Profile updated!");
        setLoading(false);
    };

    return (
        <div className="p-8 text-white max-w-2xl mx-auto">
            <h1 className="text-3xl font-serif mb-8 bg-gradient-to-r from-[#FF6B91] to-[#A67CFF] bg-clip-text text-transparent">
                Edit Profile
            </h1>

            <div className="space-y-8">
                {/* Avatar Section */}
                <div className="flex items-center gap-6">
                    <div className="w-24 h-24 rounded-full border-2 border-zinc-700 overflow-hidden bg-zinc-900 relative group">
                        {avatarUrl ? (
                            <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-zinc-500 text-xs">
                                No Image
                            </div>
                        )}
                        {/* Loading Overlay */}
                        {uploading && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-lg cursor-pointer flex items-center gap-2 transition-colors">
                            <Camera size={18} />
                            Change Photo
                            <input
                                type="file"
                                className="hidden"
                                accept="image/*"
                                onChange={handleAvatarUpload}
                                disabled={uploading}
                            />
                        </label>
                        <p className="text-xs text-zinc-500 mt-2">Max 2MB. JPG, PNG, GIF.</p>
                    </div>
                </div>

                {/* Input Fields */}
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm text-zinc-400 mb-1">Full Name</label>
                        <input
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className="w-full bg-[#111] border border-zinc-800 rounded-xl p-3 text-white focus:border-[#FF6B91] outline-none transition-colors"
                            placeholder="Your display name"
                        />
                    </div>

                    <div>
                        <label className="block text-sm text-zinc-400 mb-1">Bio</label>
                        <textarea
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                            rows={4}
                            className="w-full bg-[#111] border border-zinc-800 rounded-xl p-3 text-white focus:border-[#FF6B91] outline-none transition-colors resize-none"
                            placeholder="Tell us about yourself..."
                        />
                    </div>
                </div>

                <button
                    onClick={handleSave}
                    disabled={loading || uploading}
                    className="bg-[#FF6B91] hover:bg-[#ff5580] text-black font-bold py-3 px-8 rounded-xl flex items-center gap-2 transition-all disabled:opacity-50"
                >
                    <Save size={18} />
                    {loading ? "Saving..." : "Save Changes"}
                </button>
            </div>
        </div>
    );
}
