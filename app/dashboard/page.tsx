import InterestFilter from "@/components/InterestFilter";
import { MessageCircle } from "lucide-react";

export default function DashboardPage() {
    return (
        <div className="p-8 max-w-5xl mx-auto">
            {/* Header */}
            <div className="mb-10">
                <h1 className="text-4xl font-serif text-white mb-2">
                    Who are you looking for?
                </h1>
                <p className="text-zinc-400">Select tags to find your vibe.</p>
            </div>

            {/* Filters */}
            <div className="mb-12">
                <InterestFilter />
            </div>

            {/* Main Action */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                {/* Action Card */}
                <div className="bg-gradient-to-br from-[#111] to-[#1a1a1a] p-8 rounded-3xl border border-zinc-800 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-[#FF6B91]/10 rounded-full blur-3xl -mr-16 -mt-16 transition-all group-hover:bg-[#FF6B91]/20"></div>

                    <h2 className="text-2xl font-bold text-white mb-4 relative z-10">Start a Random Chat</h2>
                    <p className="text-zinc-400 mb-8 relative z-10">
                        Match with verified women based on your selected interests. Safe, fun, and premium.
                    </p>

                    <button className="w-full bg-gradient-to-r from-[#FF6B91] to-[#A67CFF] text-white font-bold py-4 rounded-xl shadow-lg hover:opacity-90 transition-all flex items-center justify-center gap-3 relative z-10">
                        <MessageCircle className="fill-current" />
                        Chat with Stranger
                    </button>
                </div>

                {/* Stats / Info Card */}
                <div className="grid grid-rows-2 gap-6">
                    <div className="bg-[#111] p-6 rounded-2xl border border-zinc-800 flex flex-col justify-center">
                        <h3 className="text-zinc-500 text-xs uppercase tracking-widest font-bold mb-1">Online Now</h3>
                        <p className="text-4xl font-serif text-[#A67CFF]">128 <span className="text-base text-zinc-600 font-sans">users</span></p>
                    </div>
                    <div className="bg-[#111] p-6 rounded-2xl border border-zinc-800 flex flex-col justify-center">
                        <h3 className="text-zinc-500 text-xs uppercase tracking-widest font-bold mb-1">Credits Remaining</h3>
                        <div className="flex items-end gap-2">
                            <p className="text-4xl font-serif text-white">5</p>
                            <p className="text-sm text-zinc-500 mb-1">/ 5 free chats</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
