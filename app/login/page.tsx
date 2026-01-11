"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

export default function LoginPage() {
    const [mode, setMode] = useState<'login' | 'signup'>('login');
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        if (!email || !password) {
            alert("Please enter both email and password.");
            setLoading(false);
            return;
        }

        if (mode === 'login') {
            // LOGIN LOGIC
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });
            if (error) {
                alert(error.message);
            } else {
                router.push("/dashboard");
            }
        } else {
            // SIGNUP LOGIC
            const { error } = await supabase.auth.signUp({
                email,
                password,
            });
            if (error) {
                alert(error.message);
            } else {
                alert("Account created! Logging you in...");
                router.push("/dashboard");
            }
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
            <motion.div
                layout
                className="w-full max-w-md bg-[#111] border border-zinc-800 p-8 rounded-2xl shadow-2xl"
            >
                <div className="text-center mb-8">
                    <h1 className="font-serif text-4xl text-transparent bg-clip-text bg-gradient-to-r from-[#FF6B91] to-[#A67CFF] mb-2">
                        Luvly Lounge.
                    </h1>
                    <p className="text-zinc-500 text-sm uppercase tracking-widest">
                        {mode === 'login' ? 'Exclusive Access' : 'Apply for Membership'}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-[#0a0a0a] border border-zinc-700 rounded-lg p-3 text-white focus:border-[#FF6B91] outline-none transition-colors"
                            placeholder="you@example.com"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-[#0a0a0a] border border-zinc-700 rounded-lg p-3 text-white focus:border-[#FF6B91] outline-none transition-colors"
                            placeholder="••••••••"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-[#FF6B91] to-[#A67CFF] text-white font-bold py-3 rounded-lg hover:opacity-90 transition-opacity"
                    >
                        {loading ? "Processing..." : (mode === 'login' ? "Enter Lounge" : "Create Account")}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <p className="text-zinc-500 text-sm">
                        {mode === 'login' ? "New here? " : "Already have an account? "}
                        <button
                            onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                            className="text-[#FF6B91] font-bold hover:underline ml-1"
                        >
                            {mode === 'login' ? "Join the list" : "Log In"}
                        </button>
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
