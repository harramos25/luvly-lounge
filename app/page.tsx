import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-4 text-center">
      <div className="animate-in fade-in zoom-in duration-1000 space-y-8">
        <h1 className="font-serif text-6xl md:text-8xl text-transparent bg-clip-text bg-gradient-to-r from-[#FF6B91] to-[#A67CFF] mb-4">
          Luvly Lounge.
        </h1>
        <p className="text-zinc-400 text-lg md:text-xl max-w-lg mx-auto tracking-wide font-light">
          An exclusive sanctuary for connections. <br />
          Experience the premium standard of verified socializing.
        </p>

        <div className="pt-8">
          <Link
            href="/login"
            className="inline-block bg-white text-black font-bold py-4 px-12 rounded-full hover:bg-[#FF6B91] hover:text-white transition-all duration-300 transform hover:scale-105 shadow-[0_0_20px_rgba(255,107,145,0.3)]"
          >
            Enter Lounge
          </Link>
        </div>
      </div>

      <footer className="absolute bottom-8 text-zinc-600 text-xs uppercase tracking-widest">
        Exclusive Access • Verified Community
      </footer>
    </div>
  );
}
