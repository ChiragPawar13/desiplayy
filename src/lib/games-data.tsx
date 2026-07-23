import type { ReactNode } from "react";
import {
  Crown,
  Dices,
  Grid3X3,
  Hexagon,
  SquareStack,
  Layers,
  Eye,
  Sparkles,
  Palette,
} from "lucide-react";

export type GameDef = {
  id: string;
  name: string;
  icon: ReactNode;
  color: string;
  players: string;
  desc: string;
};

export const GAMES: GameDef[] = [
  { id: "rmcs", name: "Raja Mantri +", icon: <Crown size={32} />, color: "from-amber-500 to-orange-600", players: "4-6 Players", desc: "The classic deduction game, now with Senapati & Praja!" },
  { id: "snakes", name: "Snakes & Ladders", icon: <Dices size={32} />, color: "from-emerald-500 to-teal-600", players: "2-4 Players", desc: "Climb the ladders, avoid the slithering snakes!" },
  { id: "tictactoe", name: "Tic Tac Toe", icon: <Grid3X3 size={32} />, color: "from-sky-500 to-blue-600", players: "2 Players", desc: "Classic X and O showdown." },
  { id: "housie", name: "Housie", icon: <Hexagon size={32} />, color: "from-pink-500 to-rose-600", players: "2-6 Players", desc: "Mark manually, don't cheat! First to 5 lines wins." },
  { id: "uno", name: "Desi UNO", icon: <SquareStack size={32} />, color: "from-red-500 to-red-700", players: "2-8 Players", desc: "Wild cards and plus fours! Say UNO!" },
  { id: "drawguess", name: "Draw & Guess", icon: <Palette size={32} />, color: "from-cyan-500 to-blue-600", players: "2-8 Players", desc: "Draw the word, others guess. Fastest guesser wins!" },
  { id: "mikado", name: "3D Mikado", icon: <Sparkles size={32} />, color: "from-fuchsia-500 to-purple-700", players: "Solo", desc: "Pick up sticks without disturbing the pile. 3D physics fun!" },
  { id: "lagori", name: "Lagori (7 Stones)", icon: <Layers size={32} />, color: "from-yellow-500 to-amber-600", players: "4-8 Players", desc: "Hit the stones, avoid the ball! (Coming Soon)" },
  { id: "hideandseek", name: "Chhupan Chhupai", icon: <Eye size={32} />, color: "from-indigo-500 to-violet-600", players: "4-10 Players", desc: "Virtual Hide & Seek logic game. (Coming Soon)" },
];

export const AVAILABLE_GAME_IDS = ["rmcs", "snakes", "tictactoe", "housie", "uno", "drawguess", "mikado"];

export const SOLO_GAME_IDS = ["mikado"];

export const SOLO_GAME_URLS: Record<string, string> = {
  mikado: "/games/mikado.html",
};

export function getPlayerLimit(gameId: string): number {
  if (gameId === "tictactoe") return 2;
  if (gameId === "rmcs" || gameId === "housie") return 6;
  if (gameId === "uno" || gameId === "drawguess") return 8;
  return 10;
}