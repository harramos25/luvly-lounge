"use client";

import { X, Check, Crown, Zap, MessageCircle, Star } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function UpgradeModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const [loading, setLoading] = useState<string | null>(null); // 'gold' | 'platinum' | null
    const supabase = createClient();

    const handleUpgrade = async (plan: 'gold' | 'platinum') => {
        setLoading(plan);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return alert("Please log in first.");

            // Call API to create Stripe Session
            const res = await fetch("/api/checkout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId: user.id,
                    plan: plan, // 'gold' or 'platinum'
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Checkout failed");

            // Redirect to Stripe
            window.location.href = data.url;
        } catch (err: any) {
            console.error(err);
            alert("Error: " + err.message);
            setLoading(null);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/90 backdrop-blur-md"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        className="relative w-full max-w-4xl bg-[#0a0a0a] border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row"
                    >
                        <button onClick={onClose} className="absolute top-4 right-4 text-zinc-500 hover:text-white z-10">
                            <X size={24} />
                        </button>

                        {/* LEFT: GOLD PLAN */}
                        <div className="flex-1 p-8 border-b md:border-b-0 md:border-r border-zinc-800 flex flex-col relative group">
                            <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                            <h3 className="text-2xl font-serif text-yellow-400 mb-2 flex items-center gap-2">
                                <Zap className="fill-yellow-400" /> Gold
                            </h3>
                            <p className="text-zinc-400 mb-6 text-sm">For the casual socialite.</p>

                            <div className="space-y-4 mb-8 flex-1">
                                <li className="flex items-center gap-3 text-zinc-300"><Check size={16} className="text-yellow-400" /> <strong>Unlimited</strong> Chats</li>
                                <li className="flex items-center gap-3 text-zinc-300"><Check size={16} className="text-yellow-400" /> Gold Profile Badge</li>
                                <li className="flex items-center gap-3 text-zinc-300"><Check size={16} className="text-yellow-400" /> Priority Matching</li>
                            </div>

                            <div className="mb-6">
                                <span className="text-3xl font-bold text-white">$4.99</span>
                                <span className="text-zinc-500"> / month</span>
                            </div>

                            <button
                                onClick={() => handleUpgrade('gold')}
                                disabled={!!loading}
                                className="w-full py-3 rounded-xl bg-yellow-500/10 text-yellow-400 border border-yellow-500/50 hover:bg-yellow-500 hover:text-black font-bold transition-all"
                            >
                                {loading === 'gold' ? "Processing..." : "Select Gold"}
                            </button>
                        </div>

                        {/* RIGHT: PLATINUM PLAN */}
                        <div className="flex-1 p-8 flex flex-col relative overflow-hidden group">
                            <div className="absolute inset-0 bg-gradient-to-br from-[#A67CFF]/10 via-[#FF6B91]/10 to-transparent" />

                            <h3 className="text-2xl font-serif text-white mb-2 flex items-center gap-2 relative z-10">
                                <Crown className="text-[#A67CFF] fill-[#A67CFF]" /> Platinum
                            </h3>
                            <p className="text-zinc-400 mb-6 text-sm relative z-10">Total unlimited power.</p>

                            <div className="space-y-4 mb-8 flex-1 relative z-10">
                                <li className="flex items-center gap-3 text-white"><Check size={16} className="text-[#A67CFF]" /> <strong>Everything in Gold</strong></li>
                                <li className="flex items-center gap-3 text-white"><Check size={16} className="text-[#A67CFF]" /> Platinum Badge</li>
                                <li className="flex items-center gap-3 text-white"><Check size={16} className="text-[#A67CFF]" /> <strong>See Who Liked You</strong></li>
                                <li className="flex items-center gap-3 text-white"><Check size={16} className="text-[#A67CFF]" /> Verified Status Check</li>
                            </div>

                            <div className="mb-6 relative z-10">
                                <span className="text-3xl font-bold text-white">$9.99</span>
                                <span className="text-zinc-500"> / month</span>
                            </div>

                            <button
                                onClick={() => handleUpgrade('platinum')}
                                disabled={!!loading}
                                className="relative z-10 w-full py-3 rounded-xl bg-gradient-to-r from-[#A67CFF] to-[#FF6B91] text-white font-bold hover:opacity-90 transition-opacity shadow-lg shadow-[#A67CFF]/20"
                            >
                                {loading === 'platinum' ? "Processing..." : "Go Platinum"}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
