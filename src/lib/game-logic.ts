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
// Traditional Tambola/Housie ticket: 3 rows × 9 columns, 15 numbers (5 per row).
// Column c holds numbers in range [c*10 .. c*10+9], except col 0 = [1..9] and col 8 = [80..90].
// Empty cells are represented as null. Numbers in each column are sorted ascending top→bottom.
export function generateHousieBoard(): (number | null)[] {
  const sample = <T,>(arr: T[], n: number): T[] => {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy.slice(0, n);
  };

  // Retry until column counts are all between 1 and 3.
  for (let attempt = 0; attempt < 200; attempt++) {
    const rowCols: number[][] = [0, 1, 2].map(() =>
      sample([0, 1, 2, 3, 4, 5, 6, 7, 8], 5)
    );
    const counts = Array(9).fill(0);
    rowCols.forEach((cols) => cols.forEach((c) => counts[c]++));
    if (!counts.every((c) => c >= 1 && c <= 3)) continue;

    const ticket: (number | null)[] = Array(27).fill(null);
    for (let c = 0; c < 9; c++) {
      const min = c === 0 ? 1 : c * 10;
      const max = c === 8 ? 90 : c * 10 + 9;
      const pool: number[] = [];
      for (let n = min; n <= max; n++) pool.push(n);
      const nums = sample(pool, counts[c]).sort((a, b) => a - b);
      let idx = 0;
      for (let r = 0; r < 3; r++) {
        if (rowCols[r].includes(c)) {
          ticket[r * 9 + c] = nums[idx++];
        }
      }
    }
    return ticket;
  }
  // Fallback (should never hit)
  return Array(27).fill(null);
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

// ============ Draw & Guess ============
export const DRAW_GUESS_WORDS = [
  "chai", "samosa", "cricket", "auto", "kite", "peacock", "tiger", "rickshaw",
  "diya", "rangoli", "mango", "elephant", "lassi", "kurta", "sitar", "temple",
  "taj mahal", "biryani", "monkey", "banana", "sun", "moon", "star", "cloud",
  "tree", "house", "car", "bus", "train", "airplane", "bicycle", "boat",
  "guitar", "drum", "flower", "fish", "snake", "ladder", "book", "clock",
  "camera", "phone", "laptop", "pizza", "ice cream", "cake", "burger", "apple",
  "football", "balloon", "umbrella", "glasses", "shoe", "hat", "chair", "table",
];

export const DRAW_GUESS_ROUND_SECONDS = 60;

export type DrawStroke = {
  c: string;   // color
  s: number;   // size
  pts: [number, number][]; // normalized 0..1
};

export function pickDrawGuessWord(exclude: string[] = []): string {
  const pool = DRAW_GUESS_WORDS.filter((w) => !exclude.includes(w));
  const arr = pool.length ? pool : DRAW_GUESS_WORDS;
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateDrawGuessInitialState(players: Player[]) {
  const scores: Record<string, number> = {};
  players.forEach((p) => (scores[p.uid] = 0));
  const drawerUid = players[0].uid;
  const word = pickDrawGuessWord();
  return {
    phase: "drawing" as "drawing" | "roundEnd" | "gameEnd",
    round: 1,
    totalRounds: players.length,
    drawerIdx: 0,
    drawerUid,
    word,
    usedWords: [word],
    strokes: [] as DrawStroke[],
    guessed: {} as Record<string, boolean>,
    scores,
    roundEndAt: Date.now() + DRAW_GUESS_ROUND_SECONDS * 1000,
    lastWord: null as string | null,
  };
}