"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { Zap as ZapIcon, Search, Loader2 } from "lucide-react";

// ... (skipping lines)

                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-tr from-[#FF6B91] to-[#A67CFF] mb-6 shadow-[0_0_30px_rgba(255,107,145,0.4)]">
                        <ZapIcon size={32} className="text-white" />
                    </div>
                    <h1 className="text-4xl md:text-5xl font-serif font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-500">
                        Find Your Vibe
                    </h1>
                    <p className="text-zinc-400 mt-4 text-lg">
                        Select your current mood and we'll pair you with someone compatible.
                    </p>
                </div >

    {/* Interest Selector */ }
    < div className = "bg-[#111] border border-zinc-800 rounded-3xl p-8" >
                    <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-6">Current Interests</h3>
                    <div className="flex flex-wrap justify-center gap-3">
                        {INTEREST_TAGS.map((tag) => (
                            <button
                                key={tag}
                                onClick={() => toggleInterest(tag)}
                                className={`px-6 py-3 rounded-full text-sm font-medium transition-all ${myInterests.includes(tag)
                                    ? "bg-[#FF6B91] text-black shadow-lg shadow-[#FF6B91]/20 scale-105"
                                    : "bg-[#1A1A1A] text-zinc-400 border border-zinc-800 hover:border-zinc-600"
                                    }`}
                            >
                                {tag}
                            </button>
                        ))}
                    </div>
                </div >

    {/* Big Action Button */ }
    < button
onClick = { findMatch }
disabled = { finding || loading}
className = "group relative inline-flex items-center justify-center px-8 py-5 text-lg font-bold text-black transition-all duration-200 bg-white rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white hover:bg-zinc-200 disabled:opacity-70 disabled:cursor-not-allowed w-full md:w-auto min-w-[300px]"
    >
{
    finding?(
                        <span className = "flex items-center gap-2" >
            <Loader2 className="animate-spin" /> Looking for partner...
                        </span>
                    ) : (
    <span className="flex items-center gap-2">
        <Search size={20} /> Start Matching
    </span>
)}
<div className="absolute -inset-3 rounded-full bg-white/20 blur-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                </button >

            </div >
        </div >
    );
}
