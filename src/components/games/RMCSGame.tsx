import { useEffect } from "react";
import { Crown } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import type { RoomRow } from "@/lib/room-helpers";
import { patchGameState } from "@/lib/room-helpers";
import { RMCS_ROLES } from "@/lib/game-logic";

type RoleKey = keyof typeof RMCS_ROLES;

export function RMCSGame({ room, user }: { room: RoomRow; user: User }) {
  const gameState = room.game_state;
  const players = room.players;
  const hostId = room.host_id;

  const myRole = gameState?.roles?.[user.id] as RoleKey | undefined;
  const isHost = hostId === user.id;

  const handleMantriGuess = async (suspectUid: string, isBotCall = false) => {
    if (!gameState) return;
    if (!isBotCall && myRole !== "Mantri") return;
    const isCorrect = gameState.roles[suspectUid] === "Chor";

    const newScores = { ...gameState.scores };
    Object.keys(gameState.roles).forEach((uid) => {
      const role = gameState.roles[uid] as RoleKey;
      if (role === "Raja") newScores[uid] += RMCS_ROLES.Raja.points;
      if (role === "Senapati") newScores[uid] += RMCS_ROLES.Senapati.points;
      if (role === "Sipahi") newScores[uid] += RMCS_ROLES.Sipahi.points;
      if (role === "Praja") newScores[uid] += RMCS_ROLES.Praja.points;
      if (role === "Mantri") newScores[uid] += isCorrect ? RMCS_ROLES.Mantri.points : 0;
      if (role === "Chor") newScores[uid] += isCorrect ? 0 : 800;
    });

    await patchGameState(room.id, gameState, {
      phase: "result",
      scores: newScores,
      lastResult: { mantriCorrect: isCorrect, guessedUid: suspectUid },
    });
  };

  useEffect(() => {
    if (!gameState || !isHost || gameState.phase !== "reveal") return;
    const mantriId = Object.keys(gameState.roles).find((k) => gameState.roles[k] === "Mantri");
    const mantriPlayer = players.find((p) => p.uid === mantriId);
    if (mantriPlayer?.isBot) {
      const timer = setTimeout(() => {
        const suspectIds = Object.keys(gameState.roles).filter(
          (id) => gameState.roles[id] !== "Raja" && gameState.roles[id] !== "Mantri"
        );
        const randomGuess = suspectIds[Math.floor(Math.random() * suspectIds.length)];
        handleMantriGuess(randomGuess, true);
      }, 3000);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState?.phase, isHost]);

  if (!gameState) return <div className="p-10 text-center text-white">Initializing Game...</div>;

  const nextRound = async () => {
    if (!isHost) return;
    const baseRoles = ["Raja", "Mantri", "Chor", "Sipahi"];
    if (players.length >= 5) baseRoles.push("Praja");
    if (players.length >= 6) baseRoles.push("Senapati");
    const rolesArr = baseRoles.sort(() => Math.random() - 0.5);
    const newRoles: Record<string, string> = {};
    players.forEach((p, i) => {
      newRoles[p.uid] = rolesArr[i];
    });
    await patchGameState(room.id, gameState, {
      phase: "reveal",
      roles: newRoles,
      round: gameState.round + 1,
      lastResult: null,
    });
  };

  return (
    <div className="min-h-full w-full flex flex-col p-2 sm:p-4 md:p-6 bg-green-950/20" style={{ backgroundImage: "radial-gradient(#1e293b 1px, transparent 1px)", backgroundSize: "20px 20px" }}>
      <div className="flex flex-wrap justify-between items-center mb-4 sm:mb-8 bg-slate-900/90 p-3 sm:p-4 rounded-2xl border border-slate-700 shadow-lg backdrop-blur-md gap-2 sm:gap-4 overflow-x-auto">
        <div className="bg-slate-800 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl border border-slate-700 text-center shrink-0">
          <span className="text-slate-400 text-[10px] sm:text-xs font-bold uppercase">Round</span>
          <div className="text-xl sm:text-2xl font-black text-white leading-none">{gameState.round}</div>
        </div>
        <div className="flex flex-nowrap sm:flex-wrap gap-2 md:gap-3 justify-start sm:justify-end flex-1 min-w-max">
          {players.map((p) => (
            <div key={p.uid} className="bg-slate-800 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg border border-slate-700 flex flex-col items-center min-w-[60px] md:min-w-[80px]">
              <span className="text-[9px] sm:text-[10px] text-slate-400 truncate max-w-[50px] md:max-w-[70px]">{p.name}</span>
              <span className="font-bold text-amber-500 text-xs sm:text-sm md:text-base">{gameState.scores[p.uid]}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center relative min-h-[300px] sm:min-h-[400px]">
        <div className={`grid gap-3 sm:gap-4 md:gap-8 w-full max-w-4xl relative z-10 ${players.length > 4 ? "grid-cols-3" : "grid-cols-2"}`}>
          {players.map((p) => {
            const isMe = p.uid === user.id;
            const role = gameState.roles[p.uid] as RoleKey;
            const isRaja = role === "Raja";

            let showRole = false;
            if (gameState.phase === "result") showRole = true;
            if (isMe) showRole = true;
            if (isRaja) showRole = true;

            const amIMantri = gameState.roles[user.id] === "Mantri";
            const isSuspect = !isRaja && !isMe && amIMantri && gameState.phase === "reveal";
            const isGuessed = gameState.phase === "result" && gameState.lastResult?.guessedUid === p.uid;

            return (
              <div
                key={p.uid}
                onClick={() => (isSuspect ? handleMantriGuess(p.uid) : null)}
                className={`relative group aspect-[3/4] rounded-xl sm:rounded-2xl transition-all duration-500 transform ${isSuspect ? "cursor-pointer hover:-translate-y-1 sm:hover:-translate-y-2 hover:shadow-2xl hover:shadow-amber-500/30" : ""} ${isGuessed ? "scale-105 z-20 shadow-2xl shadow-white/20" : ""}`}
                style={{ perspective: "1000px" }}
              >
                <div className="w-full h-full relative transition-all duration-700" style={{ transformStyle: "preserve-3d", transform: showRole ? "rotateY(0deg)" : "rotateY(180deg)" }}>
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 to-slate-900 rounded-xl sm:rounded-2xl border-2 border-indigo-500/30 flex flex-col items-center justify-center shadow-xl" style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
                    <Crown size={24} className="text-indigo-500/30 mb-1 sm:mb-2 md:mb-4 sm:w-12 sm:h-12" />
                    <span className="font-bold text-slate-300 bg-slate-900/50 px-2 md:px-4 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs md:text-base text-center max-w-[90%] truncate">{p.name}</span>
                    {isSuspect && (
                      <div className="absolute inset-0 bg-red-500/10 rounded-xl sm:rounded-2xl border-2 border-red-500/50 animate-pulse flex items-center justify-center">
                        <span className="bg-red-500 text-white text-[8px] sm:text-[10px] md:text-xs font-bold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full absolute bottom-2 sm:bottom-4">Guess</span>
                      </div>
                    )}
                  </div>
                  <div className={`absolute inset-0 bg-gradient-to-br ${showRole ? RMCS_ROLES[role]?.color : "from-slate-700 to-slate-800"} rounded-xl sm:rounded-2xl border-2 border-white/20 shadow-2xl flex flex-col items-center justify-between p-1.5 sm:p-2 md:p-4`} style={{ backfaceVisibility: "hidden" }}>
                    <div className="w-full flex justify-between items-start">
                      <span className="text-xl sm:text-2xl md:text-4xl">{RMCS_ROLES[role]?.icon}</span>
                      <span className="bg-black/30 text-white text-[8px] sm:text-[10px] md:text-xs font-bold px-1 py-0.5 md:px-2 md:py-1 rounded">{RMCS_ROLES[role]?.points}</span>
                    </div>
                    <div className="text-center w-full">
                      <h3 className="text-base sm:text-lg md:text-2xl font-black text-white tracking-wide uppercase truncate">{role}</h3>
                      <p className="text-white/80 text-[8px] sm:text-[10px] md:text-sm font-medium truncate px-1">{p.name}</p>
                    </div>
                    <div className="w-full text-center bg-black/20 py-0.5 sm:py-1 md:py-2 rounded-lg md:rounded-xl">
                      <span className="text-[7px] sm:text-[8px] md:text-xs text-white font-medium uppercase tracking-wider">{RMCS_ROLES[role]?.action}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none w-full text-center">
          {gameState.phase === "reveal" && (
            <div className="inline-block bg-slate-900/90 text-white px-4 py-2 sm:px-6 sm:py-3 md:px-8 md:py-4 rounded-3xl border border-slate-700 shadow-2xl backdrop-blur-md">
              {myRole === "Mantri" ? (
                <p className="text-base sm:text-lg md:text-xl font-black text-amber-500 animate-pulse">Find the Chor!</p>
              ) : (
                <p className="text-xs sm:text-sm md:text-lg font-bold text-slate-300">Waiting for Mantri...</p>
              )}
            </div>
          )}
          {gameState.phase === "result" && (
            <div className="inline-block bg-slate-900/95 p-3 sm:p-4 md:p-6 rounded-3xl border-2 border-slate-600 shadow-2xl backdrop-blur-md pointer-events-auto mt-16 sm:mt-24">
              <h3 className="text-lg sm:text-xl md:text-2xl font-black mb-1 sm:mb-2 text-white">
                {gameState.lastResult.mantriCorrect ? (
                  <span className="text-green-400">Mantri is Correct!</span>
                ) : (
                  <span className="text-red-400">Mantri is Wrong!</span>
                )}
              </h3>
              {isHost ? (
                <button onClick={nextRound} className="mt-3 sm:mt-4 bg-amber-600 hover:bg-amber-500 text-white font-bold py-1.5 sm:py-2 md:py-3 px-4 sm:px-6 md:px-8 rounded-xl w-full transition-colors shadow-lg text-sm sm:text-base">
                  Next Round
                </button>
              ) : (
                <p className="text-xs sm:text-sm text-amber-500 animate-pulse mt-3 sm:mt-4">Waiting for host...</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}