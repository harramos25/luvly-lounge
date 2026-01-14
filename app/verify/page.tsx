"use client";

import { useState, useRef, useCallback } from "react";
import Webcam from "react-webcam";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { Camera, RefreshCw, CheckCircle, Loader2, ShieldAlert } from "lucide-react";

// The "Challenge" List
const GESTURES = [
    "Touch your nose with your pinky finger",
    "Hold up 3 fingers (The Scout Salute)",
    "Cover your left eye with your hand",
    "Give a 'Thumbs Up' close to your cheek",
    "Touch your chin with your index finger"
];

export default function VerifyPage() {
    const [gesture] = useState(() => GESTURES[Math.floor(Math.random() * GESTURES.length)]);
    const [image, setImage] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const webcamRef = useRef<any>(null);
    const supabase = createClient();
    const router = useRouter();

    // 1. Capture the photo
    const capture = useCallback(() => {
        const imageSrc = webcamRef.current?.getScreenshot();
        if (imageSrc) setImage(imageSrc);
    }, [webcamRef]);

    // 2. Upload Logic
    const handleUpload = async () => {
        setUploading(true);

        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        if (!image) return;

        // Convert Base64 to Blob
        const base64Data = image.split(',')[1];
        const res = await fetch(`data:image/jpeg;base64,${base64Data}`);
        const blob = await res.blob();
        const file = new File([blob], "verification.jpg", { type: "image/jpeg" });

        // Upload to 'verifications' bucket
        const fileName = `${user.id}/${Date.now()}.jpg`;
        const { error: uploadError } = await supabase.storage
            .from('verifications')
            .upload(fileName, file);

        if (uploadError) {
            alert("Upload failed! " + uploadError.message);
            setUploading(false);
            return;
        }

        // Update Profile Status
        // Note: We don't set it to 'verified' yet. We keep it 'pending' for Admin review.
        // But we update the image path so Admin can see it.
        // Update Profile Status (or Create if missing - fix for "Zombie" users)
        // We use UPSERT now so if you deleted your 'profile' row, this restores it.
        const { error: dbError } = await supabase
            .from('profiles')
            .upsert({
                id: user.id, // Required for upsert
                verification_image_path: fileName,
                verification_status: 'pending'
            });
        // .eq('id', user.id); // No longer needed with upsert containing ID

        if (dbError) {
            alert("Database error: " + dbError.message);
        } else {
            // alert("Verification sent! You can now proceed to setup your profile.");
            // Add a small delay to ensure DB updates propagate before we read them in /onboarding
            setTimeout(() => {
                router.push("/onboarding");
            }, 1000);
        }
        setUploading(false);
    };

    return (
        <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-4">
            <div className="max-w-xl w-full bg-[#111] border border-zinc-800 rounded-2xl p-6 shadow-2xl">
                <h1 className="text-2xl font-serif text-[#FF6B91] mb-2">Security Verification</h1>
                <p className="text-zinc-400 text-sm mb-6">
                    To keep Luvly Lounge safe for women, we need to verify you are real.
                </p>

                {/* The Challenge Instruction */}
                <div className="bg-[#FF6B91]/10 border border-[#FF6B91]/30 p-4 rounded-lg mb-6 text-center">
                    <p className="text-xs text-[#FF6B91] uppercase font-bold tracking-widest mb-1">Your Instruction</p>
                    <p className="text-xl text-white font-medium">"{gesture}"</p>
                </div>

                {/* Camera Viewport */}
                <div className="relative aspect-video bg-black rounded-xl overflow-hidden border-2 border-zinc-700 mb-6 group">
                    {!image ? (
                        <Webcam
                            audio={false}
                            ref={webcamRef}
                            screenshotFormat="image/jpeg"
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <img src={image} alt="Captured" className="w-full h-full object-cover" />
                    )}

                    {/* Overlay Grid for "High Tech" feel */}
                    <div className="absolute inset-0 border border-white/5 pointer-events-none"></div>
                </div>

                {/* Controls */}
                <div className="flex gap-4">
                    {!image ? (
                        <button
                            onClick={capture}
                            className="flex-1 bg-white text-black font-bold py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-zinc-200 transition-colors"
                        >
                            <Camera size={20} /> Capture
                        </button>
                    ) : (
                        <>
                            <button
                                onClick={() => setImage(null)}
                                className="flex-1 bg-zinc-800 text-white font-medium py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-zinc-700"
                            >
                                <RefreshCw size={18} /> Retake
                            </button>
                            <button
                                onClick={handleUpload}
                                disabled={uploading}
                                className="flex-1 bg-gradient-to-r from-[#FF6B91] to-[#A67CFF] text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50"
                            >
                                {uploading ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin" /> Sending...
                                    </>
                                ) : (
                                    <>
                                        Submit Verification <CheckCircle size={18} />
                                    </>
                                )}
                            </button>
                            <p className="text-center text-xs text-zinc-500 mt-3 flex items-center justify-center gap-1">
                                <ShieldAlert size={12} />
                                Your photo will be deleted immediately after admin review.
                            </p>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
