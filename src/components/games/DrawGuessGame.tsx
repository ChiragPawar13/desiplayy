import { useEffect, useMemo, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import type { RoomRow } from "@/lib/room-helpers";
import { replaceGameState } from "@/lib/room-helpers";
import {
  DRAW_GUESS_ROUND_SECONDS,
  pickDrawGuessWord,
  type DrawStroke,
} from "@/lib/game-logic";
import { Eraser, Trash2, Send, Palette, Lock, Unlock } from "lucide-react";

const COLORS = ["#0f172a", "#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#a855f7", "#ec4899", "#ffffff"];
const SIZES = [3, 6, 12];

function maskWord(word: string) {
  return word
    .split("")
    .map((ch) => (ch === " " ? "  " : "_"))
    .join(" ");
}

export function DrawGuessGame({ room, user }: { room: RoomRow; user: User }) {
  const gs = room.game_state;
  const players = room.players;
  const isHost = room.host_id === user.id;
  const amDrawer = gs?.drawerUid === user.id;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [color, setColor] = useState(COLORS[0]);
  const [size, setSize] = useState(SIZES[1]);
  const [currentStroke, setCurrentStroke] = useState<DrawStroke | null>(null);
  const [guess, setGuess] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const [scrollLocked, setScrollLocked] = useState(false);

  // tick for timer
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, []);

  // scroll lock body when enabled
  useEffect(() => {
    if (!scrollLocked) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [scrollLocked]);

  const secondsLeft = gs?.roundEndAt
    ? Math.max(0, Math.ceil((gs.roundEndAt - now) / 1000))
    : 0;

  // Draw all strokes to canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const rect = wrap.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const drawStroke = (s: DrawStroke) => {
      if (s.pts.length === 0) return;
      ctx.strokeStyle = s.c;
      ctx.lineWidth = s.s;
      ctx.beginPath();
      const [x0, y0] = s.pts[0];
      ctx.moveTo(x0 * rect.width, y0 * rect.height);
      for (let i = 1; i < s.pts.length; i++) {
        const [x, y] = s.pts[i];
        ctx.lineTo(x * rect.width, y * rect.height);
      }
      if (s.pts.length === 1) {
        // single dot
        ctx.arc(x0 * rect.width, y0 * rect.height, s.s / 2, 0, Math.PI * 2);
        ctx.fillStyle = s.c;
        ctx.fill();
      }
      ctx.stroke();
    };

    (gs?.strokes as DrawStroke[] | undefined)?.forEach(drawStroke);
    if (currentStroke) drawStroke(currentStroke);
  }, [gs?.strokes, currentStroke]);

  // Host: advance round when time up or all guessed
  useEffect(() => {
    if (!isHost || !gs || gs.phase !== "drawing") return;
    const nonDrawers = players.filter((p) => p.uid !== gs.drawerUid);
    const everyoneGuessed =
      nonDrawers.length > 0 && nonDrawers.every((p) => gs.guessed?.[p.uid]);
    const timeUp = now >= gs.roundEndAt;
    if (!everyoneGuessed && !timeUp) return;
    // End the round
    replaceGameState(room.id, {
      ...gs,
      phase: "roundEnd",
      lastWord: gs.word,
      roundEndAt: now + 4000,
    });
  }, [isHost, gs, now, players, room.id]);

  // Host: transition from roundEnd to next round (or gameEnd)
  useEffect(() => {
    if (!isHost || !gs || gs.phase !== "roundEnd") return;
    if (now < gs.roundEndAt) return;
    if (gs.round >= gs.totalRounds) {
      replaceGameState(room.id, { ...gs, phase: "gameEnd" });
      return;
    }
    const nextIdx = (gs.drawerIdx + 1) % players.length;
    const nextWord = pickDrawGuessWord(gs.usedWords);
    replaceGameState(room.id, {
      ...gs,
      phase: "drawing",
      round: gs.round + 1,
      drawerIdx: nextIdx,
      drawerUid: players[nextIdx].uid,
      word: nextWord,
      usedWords: [...(gs.usedWords || []), nextWord],
      strokes: [],
      guessed: {},
      roundEndAt: now + DRAW_GUESS_ROUND_SECONDS * 1000,
      lastWord: null,
    });
  }, [isHost, gs, now, players, room.id]);

  const pointerPos = (e: React.PointerEvent<HTMLCanvasElement>): [number, number] => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    return [Math.max(0, Math.min(1, x)), Math.max(0, Math.min(1, y))];
  };

  const startStroke = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!amDrawer || gs?.phase !== "drawing") return;
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
    setCurrentStroke({ c: color, s: size, pts: [pointerPos(e)] });
  };
  const extendStroke = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!currentStroke) return;
    setCurrentStroke({ ...currentStroke, pts: [...currentStroke.pts, pointerPos(e)] });
  };
  const endStroke = async () => {
    if (!currentStroke || !gs) return;
    const next = { ...gs, strokes: [...(gs.strokes || []), currentStroke] };
    setCurrentStroke(null);
    await replaceGameState(room.id, next);
  };

  const clearCanvas = async () => {
    if (!amDrawer || !gs) return;
    await replaceGameState(room.id, { ...gs, strokes: [] });
  };

  const submitGuess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gs || !guess.trim() || amDrawer || gs.phase !== "drawing") return;
    if (gs.guessed?.[user.id]) return;
    const g = guess.trim().toLowerCase();
    const target = String(gs.word || "").toLowerCase();
    if (g === target) {
      const timeLeft = Math.max(0, Math.ceil((gs.roundEndAt - Date.now()) / 1000));
      const guesserPoints = 50 + timeLeft * 5;
      const drawerBonus = 25;
      const newScores = { ...gs.scores };
      newScores[user.id] = (newScores[user.id] || 0) + guesserPoints;
      newScores[gs.drawerUid] = (newScores[gs.drawerUid] || 0) + drawerBonus;
      await replaceGameState(room.id, {
        ...gs,
        scores: newScores,
        guessed: { ...(gs.guessed || {}), [user.id]: true },
      });
      setFeedback("Correct! 🎉");
    } else {
      setFeedback("Nope, try again");
    }
    setGuess("");
    setTimeout(() => setFeedback(null), 1500);
  };

  const startNewGame = async () => {
    if (!isHost || !gs) return;
    const scores: Record<string, number> = {};
    players.forEach((p) => (scores[p.uid] = 0));
    const word = pickDrawGuessWord();
    await replaceGameState(room.id, {
      phase: "drawing",
      round: 1,
      totalRounds: players.length,
      drawerIdx: 0,
      drawerUid: players[0].uid,
      word,
      usedWords: [word],
      strokes: [],
      guessed: {},
      scores,
      roundEndAt: Date.now() + DRAW_GUESS_ROUND_SECONDS * 1000,
      lastWord: null,
    });
  };

  const leaderboard = useMemo(() => {
    if (!gs) return [];
    return [...players]
      .map((p) => ({ ...p, score: gs.scores?.[p.uid] || 0 }))
      .sort((a, b) => b.score - a.score);
  }, [players, gs]);

  if (!gs) return <div className="p-10 text-center text-white">Loading…</div>;

  const drawerName = players.find((p) => p.uid === gs.drawerUid)?.name || "?";
  const iGuessed = !!gs.guessed?.[user.id];

  return (
    <div className="h-full flex flex-col p-3 gap-3 text-white">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-2 bg-slate-900 border border-slate-800 rounded-2xl px-4 py-2">
        <div className="text-xs sm:text-sm">
          <span className="text-slate-400">Round</span>{" "}
          <span className="font-bold">{gs.round}/{gs.totalRounds}</span>
        </div>
        <div className="font-mono text-lg font-black tracking-wider">
          {gs.phase === "drawing" ? (
            <span className={secondsLeft <= 10 ? "text-rose-400" : "text-amber-400"}>{secondsLeft}s</span>
          ) : gs.phase === "roundEnd" ? (
            <span className="text-emerald-400">Round over</span>
          ) : (
            <span className="text-amber-400">Game over</span>
          )}
        </div>
        <div className="text-xs sm:text-sm text-right truncate max-w-[45%]">
          <span className="text-slate-400">Drawer:</span> <span className="font-bold">{drawerName}</span>
        </div>
      </div>

      {/* Word / prompt */}
      <div className="text-center bg-slate-900 border border-slate-800 rounded-2xl py-2">
        {gs.phase === "gameEnd" ? (
          <div className="font-bold">🏆 {leaderboard[0]?.name} wins with {leaderboard[0]?.score} pts!</div>
        ) : gs.phase === "roundEnd" ? (
          <div>
            The word was <span className="font-black text-amber-400">{gs.lastWord}</span>
          </div>
        ) : amDrawer ? (
          <div>
            Draw: <span className="font-black text-amber-400 uppercase tracking-widest">{gs.word}</span>
          </div>
        ) : iGuessed ? (
          <div className="text-emerald-400 font-bold">You guessed it! Wait for others…</div>
        ) : (
          <div className="font-mono tracking-[0.4em] text-lg">{maskWord(String(gs.word || ""))}</div>
        )}
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-3 min-h-0">
        {/* Canvas */}
        <div className="flex-1 flex flex-col gap-2 min-h-0">
          <div
            ref={wrapRef}
            className={`flex-1 min-h-[280px] bg-white rounded-2xl overflow-hidden border-4 border-slate-800 relative ${scrollLocked ? "touch-none" : ""}`}
          >
            <canvas
              ref={canvasRef}
              className={`w-full h-full ${amDrawer && gs.phase === "drawing" ? "cursor-crosshair" : "cursor-not-allowed"} ${scrollLocked ? "touch-none" : "touch-pan-y"}`}
              onPointerDown={startStroke}
              onPointerMove={extendStroke}
              onPointerUp={endStroke}
              onPointerCancel={endStroke}
              onPointerLeave={endStroke}
              onTouchStart={(e) => scrollLocked && e.preventDefault()}
              onTouchMove={(e) => scrollLocked && e.preventDefault()}
            />
          </div>

          {amDrawer && gs.phase === "drawing" && (
            <div className="flex flex-wrap items-center gap-2 bg-slate-900 border border-slate-800 rounded-2xl p-2">
              <Palette size={16} className="text-slate-400" />
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full border-2 ${color === c ? "border-amber-400 scale-110" : "border-slate-700"}`}
                  style={{ backgroundColor: c }}
                  aria-label={`color ${c}`}
                />
              ))}
              <div className="w-px h-6 bg-slate-700 mx-1" />
              {SIZES.map((s) => (
                <button
                  key={s}
                  onClick={() => setSize(s)}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${size === s ? "bg-amber-600" : "bg-slate-800 hover:bg-slate-700"}`}
                >
                  <span className="rounded-full bg-white block" style={{ width: s + 2, height: s + 2 }} />
                </button>
              ))}
              <div className="w-px h-6 bg-slate-700 mx-1" />
              <button
                onClick={() => setColor("#ffffff")}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700"
                title="Eraser"
              >
                <Eraser size={16} />
              </button>
              <button
                onClick={clearCanvas}
                className="p-2 rounded-lg bg-slate-800 hover:bg-rose-700"
                title="Clear"
              >
                <Trash2 size={16} />
              </button>
            </div>
          )}

          {!amDrawer && gs.phase === "drawing" && !iGuessed && (
            <form onSubmit={submitGuess} className="flex gap-2">
              <input
                type="text"
                value={guess}
                onChange={(e) => setGuess(e.target.value)}
                placeholder="Type your guess…"
                className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500"
              />
              <button
                type="submit"
                className="bg-amber-600 hover:bg-amber-500 px-4 rounded-xl font-bold flex items-center gap-2"
              >
                <Send size={16} /> Guess
              </button>
            </form>
          )}
          {feedback && (
            <div className="text-center text-sm font-bold text-amber-400">{feedback}</div>
          )}

          {gs.phase === "gameEnd" && isHost && (
            <button
              onClick={startNewGame}
              className="bg-gradient-to-r from-amber-500 to-orange-600 py-2.5 rounded-xl font-bold"
            >
              Play Again
            </button>
          )}
        </div>

        {/* Scoreboard */}
        <div className="lg:w-56 bg-slate-900 border border-slate-800 rounded-2xl p-3">
          <div className="text-xs uppercase tracking-widest text-slate-400 mb-2">Scores</div>
          <ul className="space-y-1.5">
            {leaderboard.map((p, i) => (
              <li
                key={p.uid}
                className={`flex items-center justify-between rounded-lg px-2 py-1.5 text-sm ${p.uid === gs.drawerUid ? "bg-amber-500/10 border border-amber-500/30" : "bg-slate-800"}`}
              >
                <span className="truncate">
                  {i + 1}. {p.name}
                  {p.uid === user.id && <span className="text-amber-400"> (you)</span>}
                  {gs.guessed?.[p.uid] && <span className="text-emerald-400"> ✓</span>}
                </span>
                <span className="font-mono font-bold">{p.score}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}