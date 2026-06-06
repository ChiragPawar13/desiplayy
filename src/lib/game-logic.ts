// Game logic helpers ported from desiplayF (unchanged behavior)

export type Player = { uid: string; name: string; isBot?: boolean };

// ============ RMCS ============
export const RMCS_ROLES = {
  Raja: { points: 1000, color: "from-amber-400 to-yellow-600", icon: "👑", action: "Sit back." },
  Mantri: { points: 800, color: "from-blue-400 to-indigo-600", icon: "🛡️", action: "Find the Chor!" },
  Senapati: { points: 600, color: "from-purple-400 to-fuchsia-600", icon: "⚔️", action: "Support the Raja." },
  Sipahi: { points: 500, color: "from-emerald-400 to-teal-600", icon: "🏹", action: "Protect." },
  Praja: { points: 200, color: "from-cyan-400 to-blue-500", icon: "🧑‍🌾", action: "Observe." },
  Chor: { points: 0, color: "from-slate-600 to-slate-800", icon: "🥷", action: "Hide!" },
} as const;

export function generateRMCSInitialState(players: Player[]) {
  const baseRoles = ["Raja", "Mantri", "Chor", "Sipahi"];
  if (players.length >= 5) baseRoles.push("Praja");
  if (players.length >= 6) baseRoles.push("Senapati");

  const rolesArr = baseRoles.sort(() => Math.random() - 0.5);
  const roles: Record<string, string> = {};
  const scores: Record<string, number> = {};
  players.forEach((p, i) => {
    roles[p.uid] = rolesArr[i];
    scores[p.uid] = 0;
  });
  return { round: 1, roles, scores, phase: "reveal", history: [] as unknown[], lastResult: null as null | { mantriCorrect: boolean; guessedUid: string } };
}

// ============ Snakes & Ladders ============
export const BOARD_SIZE = 100;
export const SNAKES: Record<number, number> = { 16: 6, 47: 26, 49: 11, 56: 53, 62: 19, 64: 60, 87: 24, 93: 73, 95: 75, 98: 78 };
export const LADDERS: Record<number, number> = { 1: 38, 4: 14, 9: 31, 21: 42, 28: 84, 36: 44, 51: 67, 71: 91, 80: 100 };
export const PLAYER_COLORS = ["bg-red-500", "bg-blue-500", "bg-green-500", "bg-yellow-400"];

// ============ Tic Tac Toe ============
export const WIN_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

// ============ Housie ============
export function generateHousieBoard(): (number | "FREE")[] {
  const board: number[][] = [];
  for (let i = 0; i < 5; i++) {
    const col: number[] = [];
    const min = i * 15 + 1;
    const max = min + 14;
    while (col.length < 5) {
      const num = Math.floor(Math.random() * (max - min + 1)) + min;
      if (!col.includes(num)) col.push(num);
    }
    board.push(col.sort((a, b) => a - b));
  }

  const finalBoard: (number | "FREE")[] = [];
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 5; col++) {
      if (row === 2 && col === 2) {
        finalBoard.push("FREE");
      } else {
        finalBoard.push(board[col][row]);
      }
    }
  }
  return finalBoard;
}

// ============ UNO ============
export const UNO_COLORS = ["red", "blue", "green", "yellow"];

export type UnoCard = {
  type: "number" | "action" | "wild";
  color: string;
  value: string;
  id: string;
};

export function generateUnoDeck(): UnoCard[] {
  const deck: UnoCard[] = [];
  UNO_COLORS.forEach((color) => {
    deck.push({ type: "number", color, value: "0", id: Math.random().toString(36).substring(7) });
    for (let i = 1; i <= 9; i++) {
      deck.push({ type: "number", color, value: i.toString(), id: Math.random().toString(36).substring(7) });
      deck.push({ type: "number", color, value: i.toString(), id: Math.random().toString(36).substring(7) });
    }
    ["Skip", "Reverse", "+2"].forEach((val) => {
      deck.push({ type: "action", color, value: val, id: Math.random().toString(36).substring(7) });
      deck.push({ type: "action", color, value: val, id: Math.random().toString(36).substring(7) });
    });
  });
  for (let i = 0; i < 4; i++) {
    deck.push({ type: "wild", color: "wild", value: "Wild", id: Math.random().toString(36).substring(7) });
    deck.push({ type: "wild", color: "wild", value: "+4", id: Math.random().toString(36).substring(7) });
  }
  return deck.sort(() => Math.random() - 0.5);
}

export function generateUnoInitialState(players: Player[]) {
  const deck = generateUnoDeck();
  const hands: Record<string, UnoCard[]> = {};

  players.forEach((p) => {
    hands[p.uid] = deck.splice(0, 7);
  });

  let topCardIndex = deck.findIndex((c) => c.type === "number");
  if (topCardIndex === -1) topCardIndex = 0;
  const topCard = deck.splice(topCardIndex, 1)[0];

  return {
    deck,
    hands,
    discardPile: [topCard],
    currentColor: topCard.color,
    turnIndex: 0,
    direction: 1,
    winner: null as string | null,
    log: ["Game started!"],
  };
}