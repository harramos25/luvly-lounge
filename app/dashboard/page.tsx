export default function DashboardPage() {
    return (
        <div className="p-8">
            <h1 className="text-3xl font-serif text-white mb-2">Welcome Back.</h1>
            <p className="text-zinc-400">Discover new connections today.</p>

            {/* Content will go here later */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-[#111] p-6 rounded-2xl border border-zinc-800">
                    <h3 className="text-white font-bold mb-2">Active Users</h3>
                    <p className="text-4xl font-serif text-[#A67CFF]">128</p>
                </div>
                <div className="bg-[#111] p-6 rounded-2xl border border-zinc-800">
                    <h3 className="text-white font-bold mb-2">New Messages</h3>
                    <p className="text-4xl font-serif text-[#FF6B91]">5</p>
                </div>
            </div>
        </div>
    );
}
