import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { RoomRow } from "@/lib/room-helpers";

export function useRoom(code: string | undefined) {
  const [room, setRoom] = useState<RoomRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!code) return;
    let active = true;

    const load = async () => {
      const { data, error } = await supabase
        .from("rooms")
        .select("*")
        .eq("code", code.toUpperCase())
        .maybeSingle();
      if (!active) return;
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      if (!data) {
        setError("Room not found");
        setLoading(false);
        return;
      }
      setRoom(data as RoomRow);
      setLoading(false);
    };
    load();

    const channel = supabase
      .channel(`room-${code}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rooms", filter: `code=eq.${code.toUpperCase()}` },
        (payload) => {
          if (!active) return;
          if (payload.eventType === "DELETE") {
            setRoom(null);
            setError("Room closed");
          } else {
            setRoom(payload.new as RoomRow);
          }
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [code]);

  return { room, error, loading };
}