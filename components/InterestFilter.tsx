"use client";

import { useState } from "react";
import { motion } from "framer-motion";

const INTERESTS = [
    "Chill", "Deep Talk", "Gaming", "Movies",
    "Music", "Fashion", "Tech", "Fitness",
    "Travel", "Foodie", "Art", "Books"
];

export default function InterestFilter() {
    const [selected, setSelected] = useState<string[]>([]);

    const toggleInterest = (interest: string) => {
        if (selected.includes(interest)) {
            setSelected(selected.filter((i) => i !== interest));
        } else {
            if (selected.length >= 3) {
                alert("Free tier is limited to 3 interests! Upgrade for more.");
                return;
            }
            setSelected([...selected, interest]);
        }
    };

    return (
        <div className="w-full overflow-x-auto pb-4 no-scrollbar">
            <div className="flex gap-3">
                {INTERESTS.map((interest) => (
                    <motion.button
                        key={interest}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => toggleInterest(interest)}
                        className={`
              px-6 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all border
              ${selected.includes(interest)
                                ? "bg-[#FF6B91] border-[#FF6B91] text-white shadow-[0_0_10px_rgba(255,107,145,0.4)]"
                                : "bg-[#111] border-zinc-800 text-zinc-400 hover:border-[#FF6B91]/50 hover:text-white"
                            }
            `}
                    >
                        {interest}
                    </motion.button>
                ))}
            </div>
        </div>
    );
}
