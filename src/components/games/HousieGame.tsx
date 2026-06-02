import { Trophy } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import type { RoomRow } from "@/lib/room-helpers";
import { replaceGameState } from "@/lib/room-helpers";
import { generateHousieBoard } from "@/lib/game-logic";

export function HousieGame({ room, user }: { room: RoomRow; user: User }) {
  const gameState = room.game_state;
  const players = room.players;
  const isHost = room.host_id === user.id;

  if (!gameState) return <div className="p-10 text-center text-white">Loading Housie Tickets...</div>;

  const myBoard: (number | "FREE")[] = gameState.boards[user.id] || [];
  const myMarks: (number | "FREE")[] = gameState.marked?.[user.id] || [];
  const called: number[] = gameState.calledNumbers || [];

  const callNumber = async () => {
    if (!isHost || gameState.winner) return;
    const available = [];
    for (let i = 1; i <= 75; i++) if (!called.includes(i)) available.push(i);
    if (available.length === 0) return;
    const nextNum = available[Math.floor(Math.random() * available.length)];
    await replaceGameState(room.id, {
      ...gameState,
      calledNumbers: [...called, nextNum],
      lastCalled: nextNum,
    });
  };

  const toggleMark = async (cell: number | "FREE") => {
    if (cell === "FREE" || gameState.winner) return;
    const newMarks = myMarks.includes(cell) ? myMarks.filter((m) => m !== cell) : [...myMarks, cell];
    await replaceGameState(room.id, {
      ...gameState,
      marked: { ...gameState.marked, [user.id]: newMarks },
    });
  };

  const claimHousie = async () => {
    if (gameState.winner) return;
    const isMarked = (cell: number | "FREE") => myMarks.includes(cell);
    let lines = 0;
    for (let i = 0; i < 5; i++) {
      let rowWin = true;
      let colWin = true;
      for (let j = 0; j < 5; j++) {
        if (!isMarked(myBoard[i * 5 + j])) rowWin = false;
        if (!isMarked(myBoard[j * 5 + i])) colWin = false;
      }
      if (rowWin) lines++;
      if (colWin) lines++;
    }
    let d1 = true;
    let d2 = true;
    for (let i = 0; i < 5; i++) {
      if (!isMarked(myBoard[i * 5 + i])) d1 = false;
      if (!isMarked(myBoard[i * 5 + (4 - i)])) d2 = false;
    }
    if (d1) lines++;
    if (d2) lines++;

    if (lines >= 5) {
      const invalidMarks = myMarks.filter((m) => m !== "FREE" && !called.includes(m as number));
      if (invalidMarks.length > 0) {
        alert(`Bhai cheating! 🚨 Aapne ye numbers mark kar diye jo call hi nahi huye: ${invalidMarks.join(", ")}`);
        return;
      }
      await replaceGameState(room.id, { ...gameState, winner: user.id });
    } else {
      alert("Abhi 5 lines puri nahi hui hain bhai! Sahi se check karo.");
    }
  };

  const playAgain = async () => {
    if (!isHost) return;
    await replaceGameState(room.id, {
      boards: players.reduce((acc: Record<string, (number | "FREE")[]>, p) => ({ ...acc, [p.uid]: generateHousieBoard() }), {}),
      marked: players.reduce((acc: Record<string, (number | "FREE")[]>, p) => ({ ...acc, [p.uid]: ["FREE"] }), {}),
      calledNumbers: [],
      winner: null,
      lastCalled: null,
    });
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 relative p-2 sm:p-4">
      <div className="flex flex-col sm:flex-row items-center justify-between bg-slate-800 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-700 shadow-lg mb-4 sm:mb-6 shrink-0 gap-3">
        <div className="flex flex-row sm:flex-col items-center sm:items-start gap-2 sm:gap-0 w-full sm:w-auto justify-between sm:justify-start">
          <span className="text-slate-400 text-[10px] sm:text-xs font-bold uppercase sm:mb-1">Last Called</span>
          <div className="text-2xl sm:text-4xl font-black text-rose-500 w-12 h-12 sm:w-16 sm:h-16 bg-slate-900 flex items-center justify-center rounded-xl border border-slate-700 shrink-0">
            {gameState.lastCalled || "--"}
          </div>
        </div>
        <div className="flex-1 flex px-2 sm:px-6 overflow-x-auto gap-2 items-center w-full py-1">
          {called.slice(-10).reverse().map((n, i) => (
            <span key={i} className={`w-8 h-8 sm:w-10 sm:h-10 shrink-0 flex items-center justify-center rounded-full font-bold text-xs sm:text-sm ${i === 0 ? "bg-rose-500 text-white shadow-[0_0_10px_rgba(244,63,94,0.5)]" : "bg-slate-700 text-slate-300"}`}>
              {n}
            </span>
          ))}
        </div>
        {isHost && !gameState.winner && (
          <button onClick={callNumber} className="w-full sm:w-auto bg-amber-600 hover:bg-amber-500 text-white px-4 sm:px-6 py-2 sm:py-4 rounded-xl font-bold shadow-lg transition-all flex flex-row sm:flex-col items-center justify-center gap-1 sm:ml-4 text-sm sm:text-base">
            <span>Draw</span>
            <span className="text-[10px] sm:text-xs font-normal">Number</span>
          </button>
        )}
      </div>
      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-[280px] sm:max-w-sm">
          <div className="grid grid-cols-5 gap-1 mb-1 sm:mb-2 text-center text-base sm:text-xl font-black text-rose-500">
            <span>H</span><span>O</span><span>U</span><span>S</span><span>E</span>
          </div>
          <div className="grid grid-cols-5 gap-1 md:gap-2">
            {myBoard.map((cell, idx) => {
              const marked = myMarks.includes(cell);
              return (
                <div
                  key={idx}
                  onClick={() => toggleMark(cell)}
                  className={`aspect-square flex items-center justify-center rounded-md sm:rounded-lg font-bold text-sm sm:text-lg md:text-xl transition-all duration-300 relative overflow-hidden cursor-pointer ${marked ? "bg-rose-600 text-white shadow-inner scale-95 border-2 border-rose-400" : "bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700"}`}
                >
                  {marked && cell !== "FREE" && <div className="absolute inset-0 bg-black/20 rounded-md sm:rounded-lg"></div>}
                  <span className="relative z-10">{cell}</span>
                </div>
              );
            })}
          </div>
          {!gameState.winner && (
            <button onClick={claimHousie} className="w-full mt-4 sm:mt-6 bg-gradient-to-r from-rose-500 to-pink-600 text-white font-black text-base sm:text-xl py-3 sm:py-4 rounded-xl shadow-[0_4px_15px_rgba(225,29,72,0.4)] hover:scale-[1.02] active:scale-95 transition-all">
              CLAIM HOUSIE!
            </button>
          )}
        </div>
      </div>
      {gameState.winner && (
        <div className="absolute inset-0 z-50 bg-slate-900/90 backdrop-blur flex flex-col items-center justify-center p-4 text-center">
          <Trophy size={60} className="text-yellow-400 mb-4 animate-bounce sm:w-[80px] sm:h-[80px]" />
          <h2 className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-amber-400 mb-2 filter drop-shadow-lg">HOUSIE!</h2>
          <p className="text-lg sm:text-xl text-white mb-6 sm:mb-8">{players.find((p) => p.uid === gameState.winner)?.name} won the game!</p>
          {isHost && (
            <button onClick={playAgain} className="bg-amber-600 hover:bg-amber-500 text-white px-6 sm:px-8 py-2 sm:py-3 rounded-xl font-bold transition-all text-sm sm:text-base">
              Play Again
            </button>
          )}
        </div>
      )}
    </div>
  );
}