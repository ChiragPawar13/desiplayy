import { useEffect } from "react";
import { X, Circle } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import type { RoomRow } from "@/lib/room-helpers";
import { replaceGameState } from "@/lib/room-helpers";
import { WIN_LINES } from "@/lib/game-logic";

export function TicTacToeGame({ room, user }: { room: RoomRow; user: User }) {
  const gameState = room.game_state;
  const players = room.players;
  const hostId = room.host_id;
  const isHost = hostId === user.id;

  const isMyTurn = gameState?.turnUid === user.id;
  const mySymbol = gameState?.players?.[user.id];

  const handleMove = async (index: number, isBotCall = false) => {
    if (!gameState) return;
    if ((!isMyTurn && !isBotCall) || gameState.board[index] || gameState.winner || gameState.isDraw) return;
    const playSymbol = isBotCall ? gameState.players[gameState.turnUid] : mySymbol;
    const newBoard = [...gameState.board];
    newBoard[index] = playSymbol;

    let winnerUid: string | null = null;
    let winningLine: number[] | null = null;
    let isDraw = false;
    for (const line of WIN_LINES) {
      const [a, b, c] = line;
      if (newBoard[a] && newBoard[a] === newBoard[b] && newBoard[a] === newBoard[c]) {
        winnerUid = gameState.turnUid;
        winningLine = [a, b, c];
        break;
      }
    }
    if (!winnerUid && !newBoard.includes(null)) isDraw = true;
    const nextTurnUid = players.find((p) => p.uid !== gameState.turnUid)!.uid;

    await replaceGameState(room.id, {
      ...gameState,
      board: newBoard,
      turnUid: winnerUid ? gameState.turnUid : nextTurnUid,
      winner: winnerUid,
      winningLine,
      isDraw,
    });
  };

  useEffect(() => {
    if (!gameState) return;
    const currentTurnPlayer = players.find((p) => p.uid === gameState.turnUid);
    if (isHost && currentTurnPlayer?.isBot && !gameState.winner && !gameState.isDraw) {
      const timer = setTimeout(() => {
        const emptyIndices = gameState.board
          .map((v: string | null, i: number) => (v === null ? i : null))
          .filter((v: number | null) => v !== null);
        if (emptyIndices.length > 0) {
          const randomMove = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
          handleMove(randomMove, true);
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState?.turnUid, isHost, gameState?.winner, gameState?.isDraw]);

  if (!gameState) return <div className="p-10 text-center text-white">Loading Board...</div>;

  const resetGame = async () => {
    if (!isHost) return;
    await replaceGameState(room.id, {
      ...gameState,
      board: Array(9).fill(null),
      winner: null,
      winningLine: null,
      isDraw: false,
    });
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-4">
      <div className="mb-6 sm:mb-8 text-center bg-slate-800/80 px-4 sm:px-8 py-3 sm:py-4 rounded-2xl sm:rounded-3xl border border-slate-700 shadow-xl max-w-full">
        {gameState.winner ? (
          <h2 className="text-2xl sm:text-3xl font-black text-amber-500 animate-pulse">{players.find((p) => p.uid === gameState.winner)?.name} Wins!</h2>
        ) : gameState.isDraw ? (
          <h2 className="text-2xl sm:text-3xl font-black text-slate-300">It's a Draw!</h2>
        ) : (
          <h2 className="text-lg sm:text-xl font-bold text-white">
            {isMyTurn ? (
              <span className="text-amber-500">Your Turn ({mySymbol})</span>
            ) : (
              <span>Waiting for {players.find((p) => p.uid === gameState.turnUid)?.name}...</span>
            )}
          </h2>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2 sm:gap-4 p-3 sm:p-4 bg-slate-800 rounded-2xl sm:rounded-3xl border-4 border-slate-700 shadow-2xl">
        {gameState.board.map((cell: string | null, index: number) => {
          const isWinningCell = gameState.winningLine?.includes(index);
          return (
            <div
              key={index}
              onClick={() => handleMove(index)}
              className={`w-16 h-16 sm:w-20 sm:h-20 md:w-28 md:h-28 flex items-center justify-center rounded-xl sm:rounded-2xl text-4xl sm:text-5xl md:text-6xl transition-all duration-300 ${cell ? "bg-slate-900 cursor-default shadow-inner" : "bg-slate-700 hover:bg-slate-600 cursor-pointer shadow-md"} ${isWinningCell ? "bg-amber-500/20 shadow-[0_0_20px_rgba(245,158,11,0.5)]" : ""}`}
            >
              {cell === "X" && <X size={48} className={`text-sky-500 sm:w-[64px] sm:h-[64px] ${isWinningCell ? "animate-pulse text-amber-400" : ""}`} />}
              {cell === "O" && <Circle size={40} strokeWidth={3} className={`text-rose-500 sm:w-[56px] sm:h-[56px] ${isWinningCell ? "animate-pulse text-amber-400" : ""}`} />}
            </div>
          );
        })}
      </div>
      {(gameState.winner || gameState.isDraw) && isHost && (
        <button onClick={resetGame} className="mt-6 sm:mt-8 bg-amber-600 hover:bg-amber-500 text-white font-bold py-2 sm:py-3 px-6 sm:px-8 rounded-xl shadow-lg transition-all text-sm sm:text-base">
          Play Again
        </button>
      )}
      {(gameState.winner || gameState.isDraw) && !isHost && (
        <p className="mt-6 sm:mt-8 text-amber-500 font-medium text-sm sm:text-base">Waiting for host to restart...</p>
      )}
    </div>
  );
}