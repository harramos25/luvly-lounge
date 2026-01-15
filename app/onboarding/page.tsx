"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { User, Heart, Sparkles, ArrowRight, Camera, Check, Plus, X } from "lucide-react";

// YOUR MASTER LIST
const GENDER_OPTIONS = [
    "Lesbian", "Bi", "Straight", "Cisgender Woman", "Transgender Woman",
    "Intersex", "Demigirl", "Demiwoman", "Woman-aligned non-binary",
    "Feminine-aligned non-binary", "Librafeminine", "Paragirl",
    "Genderfluid woman-aligned", "Bigender (woman + other)",
    "Trigender (Includes woman)", "Multigender woman-aligned",
    "Girlflux", "Femflux", "Soft woman-aligned identities"
];

export default function Onboarding() {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [userId, setUserId] = useState("");
    const [checking, setChecking] = useState(true); // 🔒 GATEKEEPER STATE

    // FORM STATE
    const [gender, setGender] = useState("");
    const [dob, setDob] = useState(""); // 🟢 NEW: Birthday State
    const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
    const [inputValue, setInputValue] = useState("");
    const [fullName, setFullName] = useState("");
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

    const supabase = createClient();
    const router = useRouter();

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUserId(user.id);
                const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();

                if (!data?.verification_status || data.verification_status === 'rejected') {
                    router.push('/verify');
                    return;
                }

                if (data?.full_name && data?.interests && data.interests.length > 0 && data?.gender_identity && data?.dob) {
                    router.replace('/dashboard');
                    return;
                }

                if (data?.full_name) setFullName(data.full_name);
                if (data?.avatar_url) setAvatarUrl(data.avatar_url);
                setChecking(false);
            } else {
                router.push("/login");
            }
        };
        getUser();
    }, []);

    // Handlers
    const handleAddInterest = () => {
        if (inputValue.trim() && !selectedInterests.includes(inputValue.trim()) && selectedInterests.length < 3) {
            setSelectedInterests([...selectedInterests, inputValue.trim()]);
            setInputValue("");
        }
    };

    const handleRemoveInterest = (tag: string) => {
        setSelectedInterests(selectedInterests.filter(i => i !== tag));
    };

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];
        const fileExt = file.name.split('.').pop();
        const filePath = `${userId}/avatar.${fileExt}`;

        const { error } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true });

        if (error) {
            alert('Error uploading avatar: ' + error.message);
        } else {
            const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
            const urlWithTime = `${publicUrl}?t=${Date.now()}`;
            setAvatarUrl(urlWithTime);
        }
    };

    // Updated finishOnboarding
    const finishOnboarding = async () => {
        if (!fullName.trim()) return alert("Please enter your name!");
        if (!dob) return alert("Please enter your birthday!"); // Guard

        setLoading(true);
        const { error } = await supabase.from("profiles").update({
            gender_identity: gender,
            dob: dob, // ✅ SAVE DOB
            interests: selectedInterests,
            full_name: fullName,
            avatar_url: avatarUrl,
        }).eq("id", userId);

        if (error) {
            console.error("Error saving profile:", error);
            alert("Error saving profile: " + error.message);
        } else {
            router.replace("/dashboard");
        }
        setLoading(false);
    };

    // ... (Render)

    return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* PROGRESS BAR */}
                <div className="flex gap-2 mb-8">
                    <div className={`h-1 flex-1 rounded-full ${step >= 1 ? "bg-[#FF6B91]" : "bg-zinc-800"}`} />
                    <div className={`h-1 flex-1 rounded-full ${step >= 2 ? "bg-[#FF6B91]" : "bg-zinc-800"}`} />
                    <div className={`h-1 flex-1 rounded-full ${step >= 3 ? "bg-[#FF6B91]" : "bg-zinc-800"}`} />
                    <div className={`h-1 flex-1 rounded-full ${step >= 4 ? "bg-[#FF6B91]" : "bg-zinc-800"}`} />
                </div>

                {/* --- STEP 1: IDENTITY --- */}
                {
                    step === 1 && (
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
                    )
                }

                {/* --- STEP 2.5: BIRTHDAY (NEW) --- */}
                {
                    step === 2 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                            <div>
                                <h1 className="text-3xl font-serif text-white">Your Birthday</h1>
                                <p className="text-zinc-500 mt-2">To make sure you're old enough to party.</p>
                            </div>
                            <input
                                type="date"
                                value={dob}
                                onChange={(e) => setDob(e.target.value)}
                                className="w-full bg-[#111] border border-zinc-800 rounded-xl p-4 text-white focus:border-white outline-none text-center h-16 text-lg" // h-16 to make it clickable
                                style={{ colorScheme: "dark" }} // Forces dark calendar
                            />
                            <button
                                onClick={() => setStep(3)} // Go to Interests
                                disabled={!dob}
                                className="w-full bg-white text-black font-bold py-4 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
                            >
                                Next <ArrowRight size={18} />
                            </button>
                        </div>
                    )
                }

                {/* --- STEP 3: INTERESTS --- */}
                {
                    step === 3 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                            <div>
                                <h1 className="text-3xl font-serif text-[#A67CFF]">Your Vibe</h1>
                                <p className="text-zinc-500 mt-2">Type 3 things you love (e.g. Sushi, Anime).</p>
                            </div>

                            {/* INPUT FIELD */}
                            <div className="relative">
                                <input
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddInterest()}
                                    placeholder={selectedInterests.length >= 3 ? "Max 3 reached" : "Type and press Enter..."}
                                    disabled={selectedInterests.length >= 3}
                                    className="w-full bg-[#111] border border-zinc-800 rounded-xl p-4 pr-12 text-white focus:border-[#A67CFF] outline-none disabled:opacity-50"
                                />
                                <button
                                    onClick={handleAddInterest}
                                    disabled={!inputValue || selectedInterests.length >= 3}
                                    className="absolute right-3 top-3 p-2 bg-zinc-800 rounded-lg text-white disabled:opacity-0 hover:bg-[#A67CFF] transition-colors"
                                >
                                    <Plus size={16} />
                                </button>
                            </div>

                            {/* TAGS LIST */}
                            <div className="flex flex-wrap gap-2 min-h-[60px]">
                                {selectedInterests.map(tag => (
                                    <span key={tag} className="px-3 py-2 bg-zinc-800 rounded-full text-sm text-white flex items-center gap-2 border border-zinc-700 animate-in zoom-in">
                                        {tag}
                                        <button onClick={() => handleRemoveInterest(tag)} className="hover:text-red-400">
                                            <X size={14} />
                                        </button>
                                    </span>
                                ))}
                                {selectedInterests.length === 0 && (
                                    <p className="text-zinc-600 italic text-sm p-2">No interests added yet...</p>
                                )}
                            </div>

                            <p className="text-right text-xs text-zinc-500">{selectedInterests.length} / 3 selected</p>

                            <button
                                onClick={() => setStep(4)} // Go to Profile
                                disabled={selectedInterests.length === 0}
                                className="w-full bg-white text-black font-bold py-4 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                Almost Done <ArrowRight size={18} />
                            </button>
                        </div>
                    )
                }

                {/* --- STEP 4: PROFILE --- */}
                {
                    step === 4 && (
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
                    )
                }

            </div >
        </div >
    );
}
