"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { User, Save, Camera, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [username, setUsername] = useState("");
    const [bio, setBio] = useState("");
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);

    const supabase = createClient();
    const router = useRouter();

    useEffect(() => {
        async function loadProfile() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            setUserId(user.id);

            const { data } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", user.id)
                .single();

            if (data) {
                setUsername(data.username || "");
                setBio(data.bio || "");
                setAvatarUrl(data.avatar_url);
            }
            setLoading(false);
        }
        loadProfile();
    }, [supabase]);

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];

        // Upload to 'avatars' bucket (Make sure this bucket exists!)
        const fileExt = file.name.split('.').pop();
        const fileName = `${userId}/${Math.random()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(fileName, file);

        if (uploadError) {
            alert("Error uploading avatar: " + uploadError.message);
        } else {
            // Update profile immediately
            await supabase.from("profiles").update({ avatar_url: fileName }).eq("id", userId);
            setAvatarUrl(fileName); // Optimistic update
            router.refresh(); // Refresh sidebar
        }
    };

    const handleSave = async () => {
        setSaving(true);
        const { error } = await supabase
            .from("profiles")
            .update({ username, bio })
            .eq("id", userId);

        if (error) {
            alert("Error saving profile: " + error.message);
        } else {
            alert("Profile updated!");
            router.refresh();
        }
        setSaving(false);
    };

    if (loading) return <div className="p-8 text-white">Loading profile...</div>;

    return (
        <div className="p-8 max-w-3xl mx-auto">
            <h1 className="text-3xl font-serif text-white mb-2">Edit Profile</h1>
            <p className="text-zinc-400 mb-8">Customize how others see you in the Lounge.</p>

            <div className="bg-[#111] border border-zinc-800 rounded-2xl p-8 space-y-8">
                {/* Avatar Section */}
                <div className="flex items-center gap-6">
                    <div className="relative w-24 h-24 rounded-full bg-zinc-800 overflow-hidden border-2 border-zinc-700 group">
                        {avatarUrl ? (
                            <img src={`https://sunqgymbfsenkkvoobqc.supabase.co/storage/v1/object/public/avatars/${avatarUrl}`} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-zinc-500">
                                <User size={32} />
                            </div>
                        )}
                        {/* Overlay for upload */}
                        <label className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                            <Camera className="text-white" size={24} />
                            <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                        </label>
                    </div>
                    <div>
                        <h3 className="text-white font-bold mb-1">Profile Photo</h3>
                        <p className="text-zinc-500 text-sm">Click the image to upload a new one.</p>
                    </div>
                </div>

                {/* Form Fields */}
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full bg-[#0a0a0a] border border-zinc-700 rounded-lg p-3 text-white focus:border-[#FF6B91] outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Bio</label>
                        <textarea
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                            rows={4}
                            className="w-full bg-[#0a0a0a] border border-zinc-700 rounded-lg p-3 text-white focus:border-[#FF6B91] outline-none resize-none"
                            placeholder="Tell us about yourself..."
                        />
                    </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end pt-4 border-t border-zinc-800">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="bg-gradient-to-r from-[#FF6B91] to-[#A67CFF] text-white font-bold py-3 px-8 rounded-lg hover:opacity-90 flex items-center gap-2 disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="animate-spin" /> : <Save size={18} />}
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
}
