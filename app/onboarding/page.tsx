"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { User, Heart, Sparkles, ArrowRight, Camera, Check } from "lucide-react";

// YOUR MASTER LIST
const GENDER_OPTIONS = [
    "Lesbian", "Bi", "Straight", "Cisgender Woman", "Transgender Woman",
    "Intersex", "Demigirl", "Demiwoman", "Woman-aligned non-binary",
    "Feminine-aligned non-binary", "Librafeminine", "Paragirl",
    "Genderfluid woman-aligned", "Bigender (woman + other)",
    "Trigender (Includes woman)", "Multigender woman-aligned",
    "Girlflux", "Femflux", "Soft woman-aligned identities"
];

const INTEREST_TAGS = [
    "Tech", "Art", "Gaming", "Fashion", "Beauty", "Books",
    "Fitness", "Travel", "Music", "Movies", "Cooking",
    "Astrology", "Business", "Mental Health", "DIY", "Politics"
];

export default function Onboarding() {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [userId, setUserId] = useState("");
    const [checking, setChecking] = useState(true); // 🔒 GATEKEEPER STATE

    // FORM STATE
    const [gender, setGender] = useState("");
    const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
    const [fullName, setFullName] = useState("");
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

    const supabase = createClient();
    const router = useRouter();

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUserId(user.id);
                // Pre-fill if they already started
                const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();

                // 🔒 EXTRA SECURITY: If they somehow got here without verifying, KICK THEM OUT.
                if (!data?.verification_status || data.verification_status === 'rejected') {
                    // console.log("Onboarding Gatekeeper: Redirecting to /verify");
                    router.push('/verify');
                    return;
                }

                if (data?.full_name) setFullName(data.full_name);
                if (data?.avatar_url) setAvatarUrl(data.avatar_url);
                setChecking(false); // ✅ Safe to show UI
            } else {
                router.push("/login");
            }
        };
        getUser();
    }, []);

    // --- HANDLERS ---

    const toggleInterest = (tag: string) => {
        if (selectedInterests.includes(tag)) {
            setSelectedInterests(prev => prev.filter(t => t !== tag));
        } else {
            if (selectedInterests.length >= 3) return; // Limit to 3 for Free tier
            setSelectedInterests(prev => [...prev, tag]);
        }
    };

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];

        // 1. CHECK FILE SIZE (Limit to 2MB)
        if (file.size > 2 * 1024 * 1024) {
            alert("Image too big! Max 2MB.");
            return;
        }

        setLoading(true);
        const fileExt = file.name.split('.').pop();
        const newFilePath = `${userId}/avatar.${fileExt}`;

        // 2. CLEANUP: Find and Delete OLD files first
        const { data: oldFiles } = await supabase.storage
            .from('avatars')
            .list(userId);

        if (oldFiles && oldFiles.length > 0) {
            const filesToRemove = oldFiles.map((x) => `${userId}/${x.name}`);
            await supabase.storage.from('avatars').remove(filesToRemove);
        }

        // 3. UPLOAD
        const { error } = await supabase.storage.from('avatars').upload(newFilePath, file, { upsert: true });

        if (!error) {
            const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(newFilePath);
            const urlWithTime = `${publicUrl}?t=${Date.now()}`;
            setAvatarUrl(urlWithTime);
        }
        setLoading(false);
    };

    const finishOnboarding = async () => {
        if (!fullName.trim()) return alert("Please enter your name!");

        setLoading(true);
        const { error } = await supabase.from("profiles").update({
            gender_identity: gender, // ✅ FIXED: Matches DB column name
            interests: selectedInterests,
            full_name: fullName,
            avatar_url: avatarUrl,
        }).eq("id", userId);

        if (error) {
            console.error("Error saving profile:", error);
            alert("Error saving profile: " + error.message);
        } else {
            router.push("/dashboard"); // GO TO CHAT!
        }
        setLoading(false);
    };

    // ⏳ LOADING STATE (Prevents Flash)
    if (checking) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-black text-white">
                <div className="animate-pulse flex flex-col items-center">
                    <div className="w-12 h-12 border-4 border-[#FF6B91] border-t-transparent rounded-full animate-spin mb-4" />
                    <p className="text-zinc-500 font-serif">Checking verification...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
            <div className="max-w-md w-full">

                {/* PROGRESS BAR */}
                <div className="flex gap-2 mb-8">
                    <div className={`h-1 flex-1 rounded-full ${step >= 1 ? "bg-[#FF6B91]" : "bg-zinc-800"}`} />
                    <div className={`h-1 flex-1 rounded-full ${step >= 2 ? "bg-[#FF6B91]" : "bg-zinc-800"}`} />
                    <div className={`h-1 flex-1 rounded-full ${step >= 3 ? "bg-[#FF6B91]" : "bg-zinc-800"}`} />
                </div>

                {/* --- STEP 1: IDENTITY --- */}
                {step === 1 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div>
                            <h1 className="text-3xl font-serif text-[#FF6B91]">Identify Yourself</h1>
                            <p className="text-zinc-500 mt-2">This is a safe space. How do you identify?</p>
                        </div>

                        <div className="grid grid-cols-1 gap-2 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                            {GENDER_OPTIONS.map((g) => (
                                <button
                                    key={g}
                                    onClick={() => setGender(g)}
                                    className={`p-4 rounded-xl text-left border transition-all ${gender === g
                                        ? "bg-[#FF6B91]/10 border-[#FF6B91] text-[#FF6B91]"
                                        : "bg-[#111] border-zinc-800 hover:border-zinc-600"
                                        }`}
                                >
                                    {g}
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={() => setStep(2)}
                            disabled={!gender}
                            className="w-full bg-white text-black font-bold py-4 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2 hover:bg-zinc-200 transition-colors"
                        >
                            Next Step <ArrowRight size={18} />
                        </button>
                    </div>
                )}

                {/* --- STEP 2: INTERESTS --- */}
                {step === 2 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                        <div>
                            <h1 className="text-3xl font-serif text-[#A67CFF]">Your Vibe</h1>
                            <p className="text-zinc-500 mt-2">Pick 3 things you love.</p>
                        </div>

                        <div className="flex flex-wrap gap-3">
                            {INTEREST_TAGS.map((tag) => {
                                const isSelected = selectedInterests.includes(tag);
                                return (
                                    <button
                                        key={tag}
                                        onClick={() => toggleInterest(tag)}
                                        className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${isSelected
                                            ? "bg-[#A67CFF] border-[#A67CFF] text-black"
                                            : "bg-[#111] border-zinc-800 text-zinc-400 hover:border-zinc-600"
                                            }`}
                                    >
                                        {tag}
                                    </button>
                                );
                            })}
                        </div>

                        <p className="text-right text-xs text-zinc-500">{selectedInterests.length} / 3 selected</p>

                        <button
                            onClick={() => setStep(3)}
                            disabled={selectedInterests.length === 0}
                            className="w-full bg-white text-black font-bold py-4 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            Almost Done <ArrowRight size={18} />
                        </button>
                    </div>
                )}

                {/* --- STEP 3: PROFILE --- */}
                {step === 3 && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                        <div className="text-center">
                            <h1 className="text-3xl font-serif text-white">One Last Thing</h1>
                            <p className="text-zinc-500 mt-2">Add a face to the name.</p>
                        </div>

                        {/* Avatar Upload */}
                        <div className="flex justify-center">
                            <div className="relative group">
                                <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-zinc-700 bg-zinc-900">
                                    {avatarUrl ? (
                                        <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-zinc-600">
                                            <User size={48} />
                                        </div>
                                    )}
                                </div>
                                <label className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 cursor-pointer rounded-full transition-opacity">
                                    <Camera className="text-white" />
                                    <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                                </label>
                            </div>
                        </div>

                        {/* Name Input */}
                        <div>
                            <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Your Name / Alias</label>
                            <input
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                placeholder="e.g. Lux"
                                className="w-full bg-[#111] border border-zinc-800 rounded-xl p-4 text-white focus:border-white outline-none text-lg text-center"
                            />
                        </div>

                        <button
                            onClick={finishOnboarding}
                            disabled={loading || !fullName}
                            className="w-full bg-gradient-to-r from-[#FF6B91] to-[#A67CFF] text-white font-bold py-4 rounded-xl shadow-lg shadow-[#FF6B91]/20 flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform"
                        >
                            {loading ? "Saving..." : "Enter Luvly Lounge ✨"}
                        </button>
                    </div>
                )}

            </div>
        </div>
    );
}
