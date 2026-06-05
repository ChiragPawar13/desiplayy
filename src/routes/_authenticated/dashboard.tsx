import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { LogOut, Plus, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, displayNameOf } from "@/hooks/use-auth";
import { GAMES, AVAILABLE_GAME_IDS, SOLO_GAME_IDS, SOLO_GAME_URLS } from "@/lib/games-data";
import { createRoom, joinRoomByCode } from "@/lib/room-helpers";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [joinCode, setJoinCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;
  const name = displayNameOf(user);

  const handleCreate = async (gameId: string) => {
    if (SOLO_GAME_IDS.includes(gameId)) {
      window.location.href = SOLO_GAME_URLS[gameId];
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const code = await createRoom(gameId, { uid: user.id, name });
      navigate({ to: "/room/$code", params: { code } });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't create room");
    } finally {
      setBusy(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const room = await joinRoomByCode(joinCode, { uid: user.id, name });
      navigate({ to: "/room/$code", params: { code: room.code } });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't join room");
    } finally {
      setBusy(false);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl sm:text-2xl font-black bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">DesiPlay</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-300 hidden sm:inline">Hi, {name}</span>
            <button onClick={logout} className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 sm:py-10">
        <section className="mb-8 bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6">
          <h2 className="text-lg font-bold mb-3">Join a room</h2>
          <form onSubmit={handleJoin} className="flex gap-2">
            <input
              type="text"
              placeholder="Enter 6-char code"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              maxLength={6}
              className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm uppercase tracking-widest font-mono focus:outline-none focus:border-amber-500"
            />
            <button type="submit" disabled={busy || !joinCode.trim()} className="bg-amber-600 hover:bg-amber-500 disabled:opacity-50 px-4 sm:px-6 rounded-xl font-bold flex items-center gap-2">
              Join <ArrowRight size={16} />
            </button>
          </form>
          {error && <p className="text-rose-400 text-xs mt-2">{error}</p>}
        </section>

        <h2 className="text-lg font-bold mb-4">Pick a game to host</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {GAMES.map((g) => {
            const available = AVAILABLE_GAME_IDS.includes(g.id);
            return (
              <div key={g.id} className={`relative bg-slate-900 border border-slate-800 rounded-2xl p-5 ${available ? "hover:border-amber-500/50" : "opacity-60"} transition-colors`}>
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${g.color} flex items-center justify-center mb-3 text-white shadow-lg`}>{g.icon}</div>
                <h3 className="font-bold text-lg">{g.name}</h3>
                <p className="text-xs text-slate-400 mb-1">{g.players}</p>
                <p className="text-sm text-slate-300 mb-4">{g.desc}</p>
                {available ? (
                  <button
                    onClick={() => handleCreate(g.id)}
                    disabled={busy}
                    className="w-full bg-slate-800 hover:bg-amber-600 disabled:opacity-50 text-white font-bold py-2 rounded-xl flex items-center justify-center gap-2 transition-colors"
                  >
                    {SOLO_GAME_IDS.includes(g.id) ? (
                      <><ArrowRight size={16} /> Play Now</>
                    ) : (
                      <><Plus size={16} /> Create Room</>
                    )}
                  </button>
                ) : (
                  <span className="block w-full text-center text-xs text-amber-500 font-bold py-2 border border-amber-500/30 rounded-xl">COMING SOON</span>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}