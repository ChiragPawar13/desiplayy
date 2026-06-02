import { useEffect, useState } from "react";
import { Trophy } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import type { RoomRow } from "@/lib/room-helpers";
import { replaceGameState } from "@/lib/room-helpers";
import { supabase } from "@/integrations/supabase/client";
import { BOARD_SIZE, SNAKES, LADDERS, PLAYER_COLORS } from "@/lib/game-logic";

export function SnakesGame({ room, user }: { room: RoomRow; user: User }) {
  const gameState = room.game_state;
  const players = room.players;
  const hostId = room.host_id;
  const [rolling, setRolling] = useState(false);

  const currentTurnUid = players[gameState?.turnIndex ?? 0]?.uid;
  const isMyTurn = currentTurnUid === user.id;
  const isHost = hostId === user.id;

  const rollDice = async (isBotCall = false) => {
    if (!gameState) return;
    if ((!isMyTurn && !isBotCall) || gameState.winner || rolling) return;

    setRolling(true);
    await new Promise((res) => setTimeout(res, 800));

    const dice = Math.floor(Math.random() * 6) + 1;
    const currentPos = gameState.positions[currentTurnUid] || 0;
    let newPos = currentPos + dice;
    if (newPos > BOARD_SIZE) newPos = currentPos;

    let logMsg = `${players[gameState.turnIndex].name} rolled a ${dice}.`;
    if (SNAKES[newPos]) {
      logMsg += ` Snake! Down to ${SNAKES[newPos]}.`;
      newPos = SNAKES[newPos];
    } else if (LADDERS[newPos]) {
      logMsg += ` Ladder! Up to ${LADDERS[newPos]}.`;
      newPos = LADDERS[newPos];
    }

    const nextTurn = dice === 6 ? gameState.turnIndex : (gameState.turnIndex + 1) % players.length;
    const winner = newPos === BOARD_SIZE ? currentTurnUid : null;

    const newPositions = { ...gameState.positions, [currentTurnUid]: newPos };
    const newLog = [...(gameState.log || []), logMsg].slice(-20);
    await replaceGameState(room.id, {
      ...gameState,
      positions: newPositions,
      turnIndex: winner ? gameState.turnIndex : nextTurn,
      diceValue: dice,
      winner,
      log: newLog,
    });
    setRolling(false);
  };

  useEffect(() => {
    if (!gameState) return;
    const currentTurnPlayer = players[gameState.turnIndex];
    if (isHost && currentTurnPlayer?.isBot && !gameState.winner && !rolling) {
      const timer = setTimeout(() => rollDice(true), 1500);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState?.turnIndex, isHost, gameState?.winner, rolling]);

  if (!gameState) return <div className="p-10 text-center text-white">Loading Board...</div>;

  const playAgain = async () => {
    if (!isHost) return;
    await replaceGameState(room.id, {
      positions: players.reduce((acc: Record<string, number>, p) => ({ ...acc, [p.uid]: 0 }), {}),
      turnIndex: 0,
      diceValue: null,
      winner: null,
      log: [],
    });
    await supabase.from("rooms").update({ status: "playing" }).eq("id", room.id);
  };

  const renderBoard = () => {
    const cells = [];
    for (let row = 9; row >= 0; row--) {
      for (let col = 0; col < 10; col++) {
        const cellNum = row % 2 !== 0 ? row * 10 + col + 1 : row * 10 + (9 - col) + 1;
        const isDark = (row + col) % 2 === 0;
        let indicator = null;
        if (SNAKES[cellNum]) {
          indicator = (
            <div className="absolute flex flex-col items-center justify-center opacity-70 text-[6px] sm:text-[8px] md:text-[10px] font-bold text-red-400">
              <span>🐍</span>
              <span>⬇{SNAKES[cellNum]}</span>
            </div>
          );
        } else if (LADDERS[cellNum]) {
          indicator = (
            <div className="absolute flex flex-col items-center justify-center opacity-70 text-[6px] sm:text-[8px] md:text-[10px] font-bold text-green-400">
              <span>🪜</span>
              <span>⬆{LADDERS[cellNum]}</span>
            </div>
          );
        }
        cells.push(
          <div
            key={cellNum}
            className={`relative border border-slate-700/30 ${isDark ? "bg-slate-800" : "bg-slate-700/50"} flex items-center justify-center p-0.5 sm:p-1 overflow-hidden`}
          >
            <span className="absolute top-0.5 left-0.5 sm:left-1 text-[6px] sm:text-[8px] md:text-[10px] text-slate-400 font-bold opacity-50 z-10">{cellNum}</span>
            {indicator}
            <div className="absolute inset-0 flex items-center justify-center flex-wrap gap-0.5 pointer-events-none p-1 sm:p-2 z-20">
              {players.map((p, i) =>
                gameState.positions[p.uid] === cellNum ? (
                  <div key={p.uid} className={`w-2 h-2 sm:w-3 sm:h-3 md:w-4 md:h-4 rounded-full ${PLAYER_COLORS[i % 4]} border sm:border-2 border-white shadow-lg`} title={p.name}></div>
                ) : null,
              )}
            </div>
          </div>,
        );
      }
    }
    return cells;
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 relative">
      <div className="flex-1 flex flex-col md:flex-row p-2 sm:p-4 gap-4 sm:gap-6 overflow-hidden">
        <div className="flex-1 flex items-center justify-center p-1 sm:p-2">
          <div className="relative grid grid-cols-10 grid-rows-10 w-full max-w-[320px] sm:max-w-[400px] md:max-w-[500px] aspect-square border-2 sm:border-4 border-slate-700 bg-slate-900 shadow-2xl rounded-lg overflow-hidden">
            {renderBoard()}
          </div>
        </div>
        <div className="w-full md:w-56 lg:w-64 bg-slate-800 rounded-xl sm:rounded-2xl border border-slate-700 p-3 sm:p-4 flex flex-row md:flex-col gap-3 sm:gap-4 overflow-x-auto md:overflow-x-visible items-center md:items-stretch">
          <div className="text-center p-2 sm:p-3 bg-slate-900 rounded-xl border border-slate-700 shrink-0 md:shrink">
            <h3 className="text-slate-400 font-bold text-[10px] sm:text-xs uppercase mb-1">Current Turn</h3>
            <p className={`text-sm sm:text-lg font-black truncate ${isMyTurn ? "text-amber-500" : "text-white"}`}>{players[gameState.turnIndex]?.name}</p>
          </div>
          <div className="flex-1 bg-slate-900 rounded-xl border border-slate-700 p-2 sm:p-3 overflow-y-auto text-[10px] sm:text-xs space-y-1 sm:space-y-1.5 min-h-[60px] md:min-h-[100px] min-w-[150px] md:min-w-0">
            {gameState.log?.slice(-8).map((l: string, i: number) => (
              <p key={i} className="text-slate-400 border-l-2 border-slate-700 pl-1.5 sm:pl-2">{l}</p>
            ))}
          </div>
          <div className="flex flex-row md:flex-col items-center gap-2 sm:gap-3 bg-slate-900 p-2 sm:p-4 rounded-xl border border-slate-700 shrink-0">
            <div className={`w-8 h-8 sm:w-12 sm:h-12 bg-white rounded-lg sm:rounded-xl shadow-inner flex items-center justify-center text-lg sm:text-2xl font-black text-slate-800 border-2 sm:border-4 border-slate-200 ${rolling ? "animate-spin" : ""}`}>
              {gameState.diceValue || "?"}
            </div>
            <button
              onClick={() => rollDice(false)}
              disabled={!isMyTurn || rolling || !!gameState.winner}
              className={`w-full px-4 md:px-0 py-1.5 sm:py-2.5 rounded-lg sm:rounded-xl font-black text-white shadow-lg transition-all text-xs sm:text-base ${isMyTurn && !rolling && !gameState.winner ? "bg-amber-600 hover:bg-amber-500 active:scale-95" : "bg-slate-700 opacity-50 cursor-not-allowed"}`}
            >
              {rolling ? "Rolling" : isMyTurn ? "Roll Dice" : "Wait"}
            </button>
          </div>
        </div>
      </div>
      {gameState.winner && (
        <div className="absolute inset-0 z-50 bg-slate-900/90 backdrop-blur flex flex-col items-center justify-center">
          <Trophy size={60} className="text-yellow-400 mb-4 animate-bounce sm:w-[80px] sm:h-[80px]" />
          <h2 className="text-2xl sm:text-4xl font-black text-white mb-2 text-center">{players.find((p) => p.uid === gameState.winner)?.name} Wins!</h2>
          <button onClick={playAgain} disabled={!isHost} className="mt-6 sm:mt-8 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white px-6 sm:px-8 py-2 sm:py-3 rounded-xl font-bold transition-all text-sm sm:text-base">
            {isHost ? "Play Again" : "Waiting for host..."}
          </button>
        </div>
      )}
    </div>
  );
}