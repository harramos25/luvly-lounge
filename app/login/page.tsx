"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) {
            alert("Please enter both email and password.");
            return;
        }
        setLoading(true);

        // 1. Try to Log In
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            alert(error.message); // Replace with nice UI later
            setLoading(false);
        } else {
            // 2. If successful, go to Dashboard
            router.push("/dashboard");
        }
    };

    const handleSignUp = async () => {
        if (!email || !password) {
            alert("Please enter an email and password to create an account.");
            return;
        }
        setLoading(true);
        // 1. Create User
        const { error } = await supabase.auth.signUp({
            email,
            password,
        });

        if (error) {
            alert(error.message);
        } else {
            alert("Account created! Logging you in...");
            router.push("/dashboard"); // Since we disabled email confirm, this works instantly
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md bg-[#111] border border-zinc-800 p-8 rounded-2xl shadow-2xl"
            >
                <div className="text-center mb-8">
                    <h1 className="font-serif text-4xl text-transparent bg-clip-text bg-gradient-to-r from-[#FF6B91] to-[#A67CFF]">
                        Luvly Lounge.
                    </h1>
                    <p className="text-zinc-500 mt-2 text-sm uppercase tracking-widest">Exclusive Access</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
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
                        {loading ? "Entering..." : "Enter Lounge"}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <p className="text-zinc-500 text-sm">New here?</p>
                    <button onClick={handleSignUp} className="text-[#FF6B91] text-sm font-bold hover:underline">
                        Create an Account
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
