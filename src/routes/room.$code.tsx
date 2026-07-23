import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Copy, LogOut, Play, Plus, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, displayNameOf } from "@/hooks/use-auth";
import { useRoom } from "@/hooks/use-room";
import { addBotToRoom, joinRoomByCode, startGame } from "@/lib/room-helpers";
import { GAMES } from "@/lib/games-data";
import { ChatBox } from "@/components/ChatBox";
import { RMCSGame } from "@/components/games/RMCSGame";
import { SnakesGame } from "@/components/games/SnakesGame";
import { TicTacToeGame } from "@/components/games/TicTacToeGame";
import { HousieGame } from "@/components/games/HousieGame";
import { UnoGame } from "@/components/games/UnoGame";
import { DrawGuessGame } from "@/components/games/DrawGuessGame";

export const Route = createFileRoute("/room/$code")({
  component: RoomPage,
});

function RoomPage() {
  const { code } = Route.useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { room, error, loading, refetch } = useRoom(code);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/auth", replace: true });
  }, [authLoading, user, navigate]);

  // Auto-join if not in the room yet (RLS hides rooms from non-members,
  // so we attempt join whenever we can't see the room or aren't listed in it).
  useEffect(() => {
    if (!user || loading || joining) return;
    const inRoom = room?.players.some((p) => p.uid === user.id) ?? false;
    if (room && inRoom) return;
    if (room && room.status !== "waiting" && !inRoom) return;
    setJoining(true);
    joinRoomByCode(code, { uid: user.id, name: displayNameOf(user) })
      .then(() => refetch())
      .catch((e) => setJoinError(e instanceof Error ? e.message : "Failed to join"))
      .finally(() => setJoining(false));
  }, [user, room, code, loading, joining, refetch]);

  if (authLoading || loading || joining) {
    return <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">Loading room…</div>;
  }
  if (joinError || !user || !room) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4 gap-4">
        <p className="text-rose-400">{joinError || error || "Room not found"}</p>
        <Link to="/dashboard" className="bg-amber-600 hover:bg-amber-500 px-6 py-2 rounded-xl font-bold">Back to Dashboard</Link>
      </div>
    );
  }

  const isHost = room.host_id === user.id;
  const game = GAMES.find((g) => g.id === room.game_id);

  const leave = async () => {
    const remaining = room.players.filter((p) => p.uid !== user.id);
    if (remaining.length === 0 || isHost) {
      await supabase.from("rooms").delete().eq("id", room.id);
    } else {
      await supabase.from("rooms").update({ players: remaining }).eq("id", room.id);
    }
    navigate({ to: "/dashboard" });
  };

  const handleStart = async () => {
    try {
      await startGame(room);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Could not start game");
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(room.code);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur shrink-0">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <h1 className="text-base sm:text-lg font-bold truncate">{game?.name || room.game_id}</h1>
            <button onClick={copyCode} className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg text-xs font-mono font-bold tracking-widest">
              {room.code} <Copy size={12} />
            </button>
          </div>
          <button onClick={leave} className="text-slate-400 hover:text-rose-400 p-2 rounded-lg hover:bg-slate-800" title="Leave room">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {room.status === "waiting" ? (
        <main className="flex-1 max-w-3xl w-full mx-auto p-4 sm:p-6 flex flex-col gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <Users size={18} className="text-amber-500" />
              <h2 className="font-bold">Players ({room.players.length})</h2>
            </div>
            <ul className="space-y-2 mb-4">
              {room.players.map((p) => (
                <li key={p.uid} className="flex items-center justify-between bg-slate-800 rounded-xl px-3 py-2">
                  <span className="text-sm">
                    {p.name} {p.isBot && <span className="text-xs text-slate-400">(bot)</span>}
                  </span>
                  {p.uid === room.host_id && <span className="text-xs text-amber-500 font-bold">HOST</span>}
                </li>
              ))}
            </ul>
            {isHost && (
              <div className="flex flex-col sm:flex-row gap-2">
                <button onClick={() => addBotToRoom(room).then(() => refetch()).catch((e) => alert(e.message))} className="flex-1 bg-slate-800 hover:bg-slate-700 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 text-sm">
                  <Plus size={16} /> Add Bot
                </button>
                <button onClick={handleStart} className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 text-sm">
                  <Play size={16} /> Start Game
                </button>
              </div>
            )}
            {!isHost && <p className="text-center text-sm text-slate-400">Waiting for host to start…</p>}
          </div>

          <ChatBox room={room} user={user} compact />
        </main>
      ) : (
        <main className="flex-1 flex flex-col lg:flex-row min-h-0">
          <div className="flex-1 min-h-0">
            {room.game_id === "rmcs" && <RMCSGame room={room} user={user} />}
            {room.game_id === "snakes" && <SnakesGame room={room} user={user} />}
            {room.game_id === "tictactoe" && <TicTacToeGame room={room} user={user} />}
            {room.game_id === "housie" && <HousieGame room={room} user={user} />}
            {room.game_id === "uno" && <UnoGame room={room} user={user} />}
            {room.game_id === "drawguess" && <DrawGuessGame room={room} user={user} />}
          </div>
          <aside className="lg:w-80 p-3 lg:p-4 shrink-0">
            <ChatBox room={room} user={user} />
          </aside>
        </main>
      )}
    </div>
  );
}