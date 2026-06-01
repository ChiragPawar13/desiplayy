import { useEffect, useRef, useState } from "react";
import { MessageSquare, ArrowRight } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import type { User } from "@supabase/supabase-js";
import { useChat, sendChat } from "@/hooks/use-chat";
import { displayNameOf } from "@/hooks/use-auth";
import { generateBanter } from "@/lib/ai.functions";
import { GAMES } from "@/lib/games-data";
import type { RoomRow } from "@/lib/room-helpers";

export function ChatBox({ room, user, compact = false }: { room: RoomRow; user: User; compact?: boolean }) {
  const messages = useChat(room.id);
  const [msg, setMsg] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const banterFn = useServerFn(generateBanter);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!msg.trim()) return;
    const text = msg.trim();
    setMsg("");
    await sendChat(room.id, user.id, displayNameOf(user), text);
  };

  const onBanter = async () => {
    setIsGenerating(true);
    try {
      const gameName = GAMES.find((g) => g.id === room.game_id)?.name || "this game";
      const result = await banterFn({ data: { gameName } });
      setMsg(result.text);
    } catch {
      setMsg("Khel jaari rakho!");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className={`flex flex-col bg-slate-800 rounded-2xl sm:rounded-3xl border border-slate-700 shadow-xl overflow-hidden ${compact ? "flex-1 min-h-[250px]" : "w-full lg:w-80 h-[400px] lg:h-[500px]"}`}>
      <div className="bg-slate-900 p-3 sm:p-4 border-b border-slate-700 flex items-center gap-2 shrink-0">
        <MessageSquare size={16} className="text-amber-500 sm:w-[18px] sm:h-[18px]" />
        <h3 className="font-bold text-white text-sm sm:text-base">Room Chat</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">
        {messages.length === 0 ? (
          <p className="text-slate-500 text-center text-xs sm:text-sm mt-10 italic">No messages yet. Say hello!</p>
        ) : (
          messages.map((c) => (
            <div key={c.id} className={`flex flex-col ${c.sender_id === user.id ? "items-end" : "items-start"}`}>
              <span className="text-[9px] sm:text-[10px] text-slate-500 mb-0.5 px-1">{c.sender_name}</span>
              <div className={`px-2 py-1.5 sm:px-3 sm:py-2 rounded-2xl max-w-[90%] text-xs sm:text-sm ${c.sender_id === user.id ? "bg-amber-600 text-white rounded-br-sm" : "bg-slate-700 text-slate-200 rounded-bl-sm"}`}>
                {c.text}
              </div>
            </div>
          ))
        )}
        <div ref={chatEndRef} />
      </div>
      <form onSubmit={sendMessage} className="p-2 sm:p-3 bg-slate-900 border-t border-slate-700 flex gap-2 shrink-0">
        <button type="button" onClick={onBanter} disabled={isGenerating} className="bg-indigo-600 hover:bg-indigo-500 text-white p-1.5 sm:p-2 rounded-xl disabled:opacity-50 transition-colors flex items-center justify-center min-w-[36px] sm:min-w-[40px]" title="AI Desi Trash-Talk">
          {isGenerating ? <span className="animate-spin block text-sm">⏳</span> : <span className="text-sm">✨</span>}
        </button>
        <input
          type="text"
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          placeholder="Message..."
          className="flex-1 bg-slate-800 border border-slate-700 text-white text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl focus:outline-none focus:border-amber-500"
        />
        <button type="submit" disabled={!msg.trim()} className="bg-amber-600 hover:bg-amber-500 text-white p-1.5 sm:p-2 rounded-xl disabled:opacity-50 transition-colors">
          <ArrowRight size={16} className="sm:w-[18px] sm:h-[18px]" />
        </button>
      </form>
    </div>
  );
}