import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { RoomRow } from "@/lib/room-helpers";

export function useRoom(code: string | undefined) {
  const [room, setRoom] = useState<RoomRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!code) return;
    const { data, error } = await supabase
      .from("rooms")
      .select("*")
      .eq("code", code.toUpperCase())
      .maybeSingle();
    if (error) {
      setError(error.message);
      return;
    }
    if (!data) {
      setError("Room not found");
      return;
    }
    setRoom(data as RoomRow);
  }, [code]);

  useEffect(() => {
    if (!code) return;
    let active = true;

    (async () => {
      await refetch();
      if (active) setLoading(false);
    })();

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
  }, [code, refetch]);

  return { room, error, loading, refetch };
}