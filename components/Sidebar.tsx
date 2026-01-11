export default function Sidebar() {
    return (
        <aside className="fixed left-0 top-0 w-72 h-screen bg-[#111] border-r border-zinc-800 p-6 hidden md:block">
            <h2 className="text-2xl font-serif text-white mb-8">Luvly Lounge.</h2>
            <nav className="space-y-4">
                <div className="text-zinc-500 text-sm uppercase tracking-widest pl-2">Menu</div>
                <ul className="space-y-2">
                    <li className="text-[#FF6B91] font-bold bg-[#FF6B91]/10 px-4 py-2 rounded-lg cursor-pointer">
                        Dashboard
                    </li>
                    <li className="text-zinc-400 px-4 py-2 hover:text-white cursor-pointer transition-colors">
                        Chat
                    </li>
                    <li className="text-zinc-400 px-4 py-2 hover:text-white cursor-pointer transition-colors">
                        Friends
                    </li>
                    <li className="text-zinc-400 px-4 py-2 hover:text-white cursor-pointer transition-colors">
                        Settings
                    </li>
                </ul>
            </nav>
        </aside>
    );
}
