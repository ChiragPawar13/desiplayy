import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import {
  Crown,
  Dices,
  Grid3X3,
  Hexagon,
  SquareStack,
  Layers,
  Swords,
  Target,
  Shield,
  Mic,
  Music,
  Users,
  Sparkles,
} from "lucide-react";
import type { ReactNode } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DesiPlay — Play classic Indian games with friends" },
      { name: "description", content: "Raja Mantri, Snakes & Ladders, Housie, Desi UNO and more. Multiplayer party games with a desi twist." },
      { property: "og:title", content: "DesiPlay — Play classic Indian games with friends" },
      { property: "og:description", content: "Raja Mantri, Snakes & Ladders, Housie, Desi UNO and more. Multiplayer party games with a desi twist." },
      { property: "og:url", content: "https://desiplayy.lovable.app/" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "canonical", href: "https://desiplayy.lovable.app/" },
    ],
  }),
  component: Index,
});

type Game = {
  id: string;
  name: string;
  icon: ReactNode;
  players: string;
  desc: string;
  gradient: string;
  soon?: boolean;
};

const GAMES: Game[] = [
  { id: "rmcs", name: "Raja Mantri +", icon: <Crown size={28} />, players: "4–6", desc: "Classic deduction, now with Senapati & Praja.", gradient: "from-amber-400 to-orange-600" },
  { id: "snakes", name: "Snakes & Ladders", icon: <Dices size={28} />, players: "2–4", desc: "Climb the ladders, dodge the snakes.", gradient: "from-emerald-400 to-teal-600" },
  { id: "tictactoe", name: "Tic Tac Toe", icon: <Grid3X3 size={28} />, players: "2", desc: "Classic X and O showdown.", gradient: "from-sky-400 to-blue-600" },
  { id: "housie", name: "Housie", icon: <Hexagon size={28} />, players: "2–6", desc: "Mark manually — first to 5 lines wins.", gradient: "from-pink-400 to-rose-600" },
  { id: "uno", name: "Desi UNO", icon: <SquareStack size={28} />, players: "2–8", desc: "Wild cards and plus fours. Say UNO!", gradient: "from-red-400 to-red-700" },
  { id: "lagori", name: "Lagori (7 Stones)", icon: <Layers size={28} />, players: "4–8", desc: "Hit the stones, dodge the ball.", gradient: "from-yellow-400 to-amber-600", soon: true },
  { id: "kabaddi", name: "Kabaddi", icon: <Swords size={28} />, players: "6–12", desc: "Raid, tag, escape. Kabaddi-kabaddi!", gradient: "from-fuchsia-500 to-purple-700", soon: true },
  { id: "antakshari", name: "Antakshari", icon: <Mic size={28} />, players: "4+", desc: "Sing the next song, last letter rules.", gradient: "from-indigo-400 to-violet-700", soon: true },
  { id: "dumbcharades", name: "Dumb Charades", icon: <Music size={28} />, players: "4+", desc: "Act it out — no words allowed.", gradient: "from-cyan-400 to-sky-700", soon: true },
  { id: "gully", name: "Gully Cricket", icon: <Target size={28} />, players: "4+", desc: "One-tip-one-hand. No LBW. Classic.", gradient: "from-lime-400 to-green-700", soon: true },
];

function Index() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a0b2e] via-[#2d0a3d] to-[#0f0a1f] text-white">
      {/* Header */}
      <header className="border-b border-white/10 backdrop-blur-sm sticky top-0 z-10 bg-black/20">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-400 to-rose-600 flex items-center justify-center font-black text-lg">
              D
            </div>
            <span className="font-bold text-xl tracking-tight">DesiPlay</span>
          </div>
          <Link
            to="/auth"
            className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition text-sm font-medium border border-white/10"
          >
            Sign in
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-12 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-white/70 mb-6">
          <Sparkles size={14} className="text-amber-400" />
          Multiplayer party games with a desi twist
        </div>
        <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-[1.05] bg-gradient-to-br from-white via-amber-100 to-rose-200 bg-clip-text text-transparent">
          Play with your<br />gang, anywhere.
        </h1>
        <p className="mt-6 text-lg text-white/60 max-w-xl mx-auto">
          Raja Mantri, Housie, Desi UNO and more — the games you grew up with, ready to play in your browser.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/auth"
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-white font-bold shadow-lg transition"
          >
            Sign in to play
          </Link>
          <Link
            to="/dashboard"
            className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-white font-medium transition"
          >
            Go to lobby
          </Link>
        </div>
      </section>

      {/* Games grid */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {GAMES.map((g) => (
            <div
              key={g.id}
              className="group relative rounded-2xl bg-white/5 border border-white/10 p-5 hover:bg-white/[0.08] hover:border-white/20 transition cursor-pointer overflow-hidden"
            >
              <div className={`absolute -top-12 -right-12 w-32 h-32 rounded-full bg-gradient-to-br ${g.gradient} opacity-20 blur-2xl group-hover:opacity-40 transition`} />
              <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${g.gradient} shadow-lg mb-4`}>
                {g.icon}
              </div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold text-lg">{g.name}</h3>
                {g.soon && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30">
                    SOON
                  </span>
                )}
              </div>
              <p className="text-sm text-white/60 mb-3">{g.desc}</p>
              <div className="flex items-center gap-1.5 text-xs text-white/40">
                <Users size={12} />
                {g.players} players
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-white/10 py-6 text-center text-xs text-white/40">
        DesiPlay · Made with ❤️ for desi game nights
      </footer>
    </div>
  );
}
