import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { User, Settings, MessageSquare, History, Crown } from "lucide-react";

export default async function Sidebar() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    let profile = null;
    if (user) {
        const { data } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .single();
        profile = data;
    }

    // Fallbacks
    const username = profile?.username || user?.email?.split('@')[0] || "Guest";
    const avatarUrl = profile?.avatar_url; // Use this later with Supabase Storage public URL
    const tier = profile?.tier || "free";
    const isPremium = tier === "pro" || tier === "plus";

    return (
        <aside className="fixed left-0 top-0 w-72 h-screen bg-[#111] border-r border-zinc-800 p-6 hidden md:flex flex-col">
            <div className="mb-8">
                <h2 className="text-2xl font-serif text-transparent bg-clip-text bg-gradient-to-r from-[#FF6B91] to-[#A67CFF]">
                    Luvly Lounge.
                </h2>
            </div>

            {/* User Profile Snippet */}
            <div className="mb-8 p-4 bg-zinc-900/50 rounded-xl border border-zinc-800 flex items-center gap-4">
                <div className={`
          w-12 h-12 rounded-full overflow-hidden border-2 flex-shrink-0 bg-zinc-800
          ${tier === 'plus' ? 'border-[#FFD700] shadow-[0_0_10px_#FFD700]' :
                        tier === 'pro' ? 'border-[#C0C0C0] shadow-[0_0_10px_#C0C0C0]' :
                            'border-zinc-700'}
        `}>
                    {avatarUrl ? (
                        <img src={`https://sunqgymbfsenkkvoobqc.supabase.co/storage/v1/object/public/avatars/${avatarUrl}`} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-500">
                            <User size={20} />
                        </div>
                    )}
                </div>
                <div className="overflow-hidden">
                    <p className="text-white font-bold truncate text-sm">{username}</p>
                    <div className="flex items-center gap-1">
                        <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold
              ${isPremium ? 'bg-gradient-to-r from-[#FF6B91] to-[#A67CFF] text-white' : 'bg-zinc-800 text-zinc-400'}
            `}>
                            {tier}
                        </span>
                    </div>
                </div>
            </div>

            <nav className="flex-1 space-y-6">
                <div>
                    <div className="text-zinc-600 text-xs uppercase tracking-widest pl-2 mb-2 font-bold">Social</div>
                    <ul className="space-y-2">
                        <Link href="/dashboard" className="flex items-center gap-3 text-white bg-[#FF6B91]/10 border border-[#FF6B91]/20 px-4 py-3 rounded-lg cursor-pointer transition-all hover:border-[#FF6B91]">
                            <Crown size={18} className="text-[#FF6B91]" />
                            <span className="font-bold">Lounge</span>
                        </Link>
                        <li className="flex items-center gap-3 text-zinc-400 px-4 py-3 hover:text-white cursor-pointer transition-colors group">
                            <MessageSquare size={18} className="group-hover:text-[#A67CFF] transition-colors" />
                            <span>Chats</span>
                        </li>
                        <li className="flex items-center gap-3 text-zinc-400 px-4 py-3 hover:text-white cursor-pointer transition-colors group">
                            <History size={18} className="group-hover:text-[#A67CFF] transition-colors" />
                            <span>History</span>
                        </li>
                    </ul>
                </div>

                <div>
                    <div className="text-zinc-600 text-xs uppercase tracking-widest pl-2 mb-2 font-bold">You</div>
                    <ul className="space-y-2">
                        <Link href="/dashboard/profile" className="flex items-center gap-3 text-zinc-400 px-4 py-3 hover:text-white cursor-pointer transition-colors group">
                            <User size={18} className="group-hover:text-[#A67CFF] transition-colors" />
                            <span>Profile</span>
                        </Link>
                        <li className="flex items-center gap-3 text-zinc-400 px-4 py-3 hover:text-white cursor-pointer transition-colors group">
                            <Settings size={18} className="group-hover:text-[#A67CFF] transition-colors" />
                            <span>Settings</span>
                        </li>
                    </ul>
                </div>
            </nav>

            {!isPremium && (
                <div className="mt-4 p-4 bg-gradient-to-br from-[#FF6B91]/20 to-[#A67CFF]/20 rounded-xl border border-[#FF6B91]/30">
                    <p className="text-xs text-white mb-2">Unlock unlimited chats & gold badge.</p>
                    <button className="w-full bg-white text-black text-xs font-bold py-2 rounded-lg hover:bg-zinc-200">
                        Upgrade to Plus
                    </button>
                </div>
            )}
        </aside>
    );
}
