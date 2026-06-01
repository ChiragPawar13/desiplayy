import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ChatMsg = {
  id: string;
  room_id: string;
  sender_id: string;
  sender_name: string;
  text: string;
  created_at: string;
};

export function useChat(roomId: string | undefined) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);

  useEffect(() => {
    if (!roomId) return;
    let active = true;

    supabase
      .from("room_chats")
      .select("*")
      .eq("room_id", roomId)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (active && data) setMessages(data as ChatMsg[]);
      });

    const channel = supabase
      .channel(`chat-${roomId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "room_chats", filter: `room_id=eq.${roomId}` },
        (payload) => {
          if (!active) return;
          setMessages((prev) => [...prev, payload.new as ChatMsg]);
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  return messages;
}

export async function sendChat(
  roomId: string,
  senderId: string,
  senderName: string,
  text: string
) {
  await supabase.from("room_chats").insert({
    room_id: roomId,
    sender_id: senderId,
    sender_name: senderName,
    text,
  });
}