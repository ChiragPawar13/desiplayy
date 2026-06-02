import { useEffect, useState } from "react";
import { Trophy, RefreshCw, SquareStack } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import type { RoomRow } from "@/lib/room-helpers";
import { replaceGameState } from "@/lib/room-helpers";
import { UNO_COLORS, generateUnoInitialState, type UnoCard } from "@/lib/game-logic";

const getColorClass = (color: string) => {
  switch (color) {
    case "red": return "bg-red-500 border-red-700";
    case "blue": return "bg-blue-500 border-blue-700";
    case "green": return "bg-green-500 border-green-700";
    case "yellow": return "bg-yellow-400 border-yellow-600 text-slate-800";
    default: return "bg-slate-800 border-slate-600";
  }
};

const isValidPlay = (card: UnoCard, topCard: UnoCard, currentColor: string) => {
  if (card.type === "wild") return true;
  if (card.color === currentColor) return true;
  if (card.value === topCard.value) return true;
  return false;
};

const getNextTurnIndex = (currentIndex: number, direction: number, numPlayers: number, skip = 0) => {
  let next = (currentIndex + direction * (1 + skip)) % numPlayers;
  if (next < 0) next += numPlayers;
  return next;
};

export function UnoGame({ room, user }: { room: RoomRow; user: User }) {
  const gameState = room.game_state;
  const players = room.players;
  const isHost = room.host_id === user.id;
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [pendingWildCard, setPendingWildCard] = useState<UnoCard | null>(null);

  const currentTurnPlayer = players[gameState?.turnIndex ?? 0];
  const isMyTurn = currentTurnPlayer?.uid === user.id;
  const myHand: UnoCard[] = gameState?.hands?.[user.id] || [];
  const topCard: UnoCard | undefined = gameState?.discardPile?.[gameState.discardPile.length - 1];

  const executePlayCard = async (card: UnoCard, playerUid: string, chosenColor: string | null = null) => {
    if (!gameState || !topCard) return;
    const newHand = gameState.hands[playerUid].filter((c: UnoCard) => c.id !== card.id);
    const newDiscardPile: UnoCard[] = [...gameState.discardPile, card];
    let newDeck: UnoCard[] = [...gameState.deck];
    if (newDeck.length < 5) {
      const keepCard = newDiscardPile.pop()!;
      newDeck = [...newDeck, ...newDiscardPile].sort(() => Math.random() - 0.5);
      newDiscardPile.length = 0;
      newDiscardPile.push(keepCard);
    }
    let nextDirection = gameState.direction;
    let skipNext = 0;
    let cardsToDraw = 0;
    const newCurrentColor = chosenColor || card.color;
    let logMsg = `${players.find((p) => p.uid === playerUid)?.name} played ${card.value} ${card.color !== "wild" ? card.color : ""}`;
    if (card.value === "Reverse") {
      nextDirection = nextDirection * -1;
      if (players.length === 2) skipNext = 1;
    } else if (card.value === "Skip") {
      skipNext = 1;
    } else if (card.value === "+2") {
      skipNext = 1;
      cardsToDraw = 2;
    } else if (card.value === "+4") {
      skipNext = 1;
      cardsToDraw = 4;
    }
    const nextTurnIdx = getNextTurnIndex(gameState.turnIndex, nextDirection, players.length, skipNext);
    const victimUid = players[getNextTurnIndex(gameState.turnIndex, nextDirection, players.length, 0)].uid;
    const newHands: Record<string, UnoCard[]> = { ...gameState.hands, [playerUid]: newHand };
    if (cardsToDraw > 0) {
      const drawnCards = newDeck.splice(0, cardsToDraw);
      newHands[victimUid] = [...newHands[victimUid], ...drawnCards];
      logMsg += ` -> ${players.find((p) => p.uid === victimUid)?.name} drew ${cardsToDraw}!`;
    }
    let winner = gameState.winner;
    if (newHand.length === 0) {
      winner = playerUid;
      logMsg = `${players.find((p) => p.uid === playerUid)?.name} WINS!`;
    }
    await replaceGameState(room.id, {
      ...gameState,
      discardPile: newDiscardPile,
      deck: newDeck,
      hands: newHands,
      turnIndex: winner ? gameState.turnIndex : nextTurnIdx,
      direction: nextDirection,
      currentColor: newCurrentColor,
      winner,
      log: [...(gameState.log || []), logMsg].slice(-20),
    });
  };

  const executeDrawCard = async (playerUid: string) => {
    if (!gameState) return;
    let newDeck: UnoCard[] = [...gameState.deck];
    const newDiscardPile: UnoCard[] = [...gameState.discardPile];
    if (newDeck.length < 2) {
      const keepCard = newDiscardPile.pop()!;
      newDeck = [...newDeck, ...newDiscardPile].sort(() => Math.random() - 0.5);
      newDiscardPile.length = 0;
      newDiscardPile.push(keepCard);
    }
    const drawnCard = newDeck.shift()!;
    const newHand = [...gameState.hands[playerUid], drawnCard];
    const nextTurnIdx = getNextTurnIndex(gameState.turnIndex, gameState.direction, players.length, 0);
    await replaceGameState(room.id, {
      ...gameState,
      deck: newDeck,
      discardPile: newDiscardPile,
      hands: { ...gameState.hands, [playerUid]: newHand },
      turnIndex: nextTurnIdx,
      log: [...(gameState.log || []), `${players.find((p) => p.uid === playerUid)?.name} drew a card.`].slice(-20),
    });
  };

  useEffect(() => {
    if (!gameState || !topCard) return;
    if (isHost && currentTurnPlayer?.isBot && !gameState.winner && !showColorPicker) {
      const timer = setTimeout(() => {
        const botHand: UnoCard[] = gameState.hands[currentTurnPlayer.uid];
        const validCard = botHand.find((c) => isValidPlay(c, topCard, gameState.currentColor));
        if (validCard) {
          if (validCard.type === "wild") {
            const randomColor = UNO_COLORS[Math.floor(Math.random() * UNO_COLORS.length)];
            executePlayCard(validCard, currentTurnPlayer.uid, randomColor);
          } else {
            executePlayCard(validCard, currentTurnPlayer.uid);
          }
        } else {
          executeDrawCard(currentTurnPlayer.uid);
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState?.turnIndex, isHost, gameState?.winner, gameState?.currentColor]);

  if (!gameState || !topCard) return <div className="p-10 text-center text-white">Dealing Cards...</div>;

  const handleCardClick = (card: UnoCard) => {
    if (!isMyTurn || gameState.winner) return;
    if (!isValidPlay(card, topCard, gameState.currentColor)) return;
    if (card.type === "wild") {
      setPendingWildCard(card);
      setShowColorPicker(true);
    } else {
      executePlayCard(card, user.id);
    }
  };

  const handleWildColorSelect = (color: string) => {
    if (pendingWildCard) {
      executePlayCard(pendingWildCard, user.id, color);
      setShowColorPicker(false);
      setPendingWildCard(null);
    }
  };

  const playAgain = async () => {
    if (!isHost) return;
    await replaceGameState(room.id, generateUnoInitialState(players));
  };

  return (
    <div className="flex flex-col h-full bg-green-900/30 p-2 sm:p-4 relative">
      <div className="flex justify-between items-start mb-4 gap-2">
        <div className="bg-slate-900/80 p-2 sm:p-3 rounded-xl border border-slate-700 flex flex-col text-[10px] sm:text-xs text-slate-300 min-w-[120px]">
          <span className="font-bold text-white mb-1 uppercase tracking-wider text-[10px] sm:text-xs">Turn Direction</span>
          <div className="flex items-center gap-2">
            <RefreshCw size={14} className={gameState.direction === 1 ? "" : "rotate-180 transform scale-x-[-1]"} />
            <span>{gameState.direction === 1 ? "Clockwise" : "Anti-Clock"}</span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-700/50">
            <span className="font-bold text-amber-500 block mb-1">Status</span>
            {gameState.log?.slice(-1).map((l: string, i: number) => <p key={i} className="truncate">{l}</p>)}
          </div>
        </div>
        <div className="flex-1 flex gap-2 overflow-x-auto justify-end px-2 pb-1">
          {players.filter((p) => p.uid !== user.id).map((p) => (
            <div key={p.uid} className={`bg-slate-800 p-2 rounded-lg border flex flex-col items-center shrink-0 min-w-[60px] ${currentTurnPlayer?.uid === p.uid ? "border-amber-500" : "border-slate-700"}`}>
              <span className="text-[10px] text-white truncate max-w-[50px]">{p.name}</span>
              <div className="bg-slate-900 px-2 py-0.5 rounded text-xs font-bold text-slate-300 mt-1 flex items-center gap-1">
                <SquareStack size={10} /> {gameState.hands[p.uid]?.length || 0}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center relative">
        <div className="flex gap-4 sm:gap-8 items-center">
          <div
            onClick={() => (isMyTurn && !showColorPicker && !gameState.winner ? executeDrawCard(user.id) : null)}
            className={`w-20 h-28 sm:w-28 sm:h-40 bg-slate-900 border-4 border-slate-700 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-xl relative ${isMyTurn && !showColorPicker ? "cursor-pointer hover:border-slate-500 hover:-translate-y-2" : "opacity-80"} transition-all`}
          >
            <span className="text-2xl sm:text-4xl font-black text-slate-700 rotate-[-20deg]">UNO</span>
            <div className="absolute top-2 right-2 bg-slate-800 text-[8px] sm:text-[10px] text-slate-400 px-1.5 py-0.5 rounded">{gameState.deck.length}</div>
          </div>
          <div className={`w-24 h-32 sm:w-32 sm:h-44 rounded-xl sm:rounded-2xl border-4 shadow-2xl flex flex-col items-center justify-center p-2 relative ${getColorClass(gameState.currentColor)}`}>
            <div className="bg-white/90 w-full h-full rounded-lg sm:rounded-xl flex items-center justify-center transform rotate-[-10deg] shadow-inner">
              <span className={`text-3xl sm:text-5xl font-black ${gameState.currentColor === "yellow" ? "text-yellow-500" : gameState.currentColor === "red" ? "text-red-500" : gameState.currentColor === "blue" ? "text-blue-500" : gameState.currentColor === "green" ? "text-green-500" : "text-slate-800"}`}>
                {topCard.value === "Skip" ? "🚫" : topCard.value === "Reverse" ? "🔁" : topCard.value}
              </span>
            </div>
            {topCard.type === "wild" && (
              <div className="absolute -bottom-3 sm:-bottom-4 bg-slate-900 text-white text-[8px] sm:text-[10px] font-bold px-2 sm:px-3 py-1 rounded-full border-2 border-slate-700 shadow-lg">
                Color: {gameState.currentColor.toUpperCase()}
              </div>
            )}
          </div>
        </div>
        {showColorPicker && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm rounded-xl">
            <div className="bg-slate-800 p-4 sm:p-6 rounded-2xl border border-slate-600 shadow-2xl text-center">
              <h3 className="text-white font-bold mb-4 text-sm sm:text-base">Choose Color</h3>
              <div className="grid grid-cols-2 gap-2 sm:gap-4">
                {UNO_COLORS.map((c) => (
                  <button key={c} onClick={() => handleWildColorSelect(c)} className={`w-12 h-12 sm:w-16 sm:h-16 rounded-xl border-4 hover:scale-110 active:scale-95 transition-all shadow-lg ${getColorClass(c)}`}></button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="mt-auto pt-4 border-t border-slate-700/50">
        <div className="flex justify-between items-center mb-2 px-2">
          <h3 className="text-xs sm:text-sm font-bold text-slate-300">Your Cards ({myHand.length})</h3>
          {isMyTurn && !gameState.winner && <span className="text-amber-500 text-[10px] sm:text-xs font-bold animate-pulse">Your Turn! Play or Draw.</span>}
        </div>
        <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-4 pt-2 px-2">
          {myHand.map((card) => {
            const valid = isMyTurn && isValidPlay(card, topCard, gameState.currentColor) && !showColorPicker;
            return (
              <div
                key={card.id}
                onClick={() => handleCardClick(card)}
                className={`shrink-0 w-16 h-24 sm:w-24 sm:h-36 rounded-lg sm:rounded-xl border-2 sm:border-4 flex items-center justify-center p-1 sm:p-2 transition-all relative ${getColorClass(card.color)} ${valid ? "hover:-translate-y-3 sm:hover:-translate-y-4 hover:shadow-[0_0_15px_rgba(255,255,255,0.4)] cursor-pointer shadow-lg" : "opacity-60 cursor-not-allowed scale-95"}`}
              >
                <div className="bg-white/90 w-full h-full rounded sm:rounded-lg flex items-center justify-center transform rotate-[-10deg]">
                  <span className={`text-xl sm:text-3xl font-black ${card.color === "yellow" ? "text-yellow-500" : card.color === "red" ? "text-red-500" : card.color === "blue" ? "text-blue-500" : card.color === "green" ? "text-green-500" : "text-slate-800"}`}>
                    {card.value === "Skip" ? "🚫" : card.value === "Reverse" ? "🔁" : card.value}
                  </span>
                </div>
                <span className="absolute top-1 left-1.5 sm:left-2 text-[8px] sm:text-xs font-black text-white/80">{card.value}</span>
              </div>
            );
          })}
        </div>
      </div>
      {gameState.winner && (
        <div className="absolute inset-0 z-50 bg-slate-900/95 backdrop-blur-md flex flex-col items-center justify-center p-4 text-center">
          <Trophy size={60} className="text-yellow-400 mb-4 animate-bounce sm:w-[80px] sm:h-[80px]" />
          <h2 className="text-4xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-yellow-500 mb-2 filter drop-shadow-lg">UNO WINNER!</h2>
          <p className="text-lg sm:text-xl text-white mb-6 sm:mb-8">{players.find((p) => p.uid === gameState.winner)?.name} has emptied their hand!</p>
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