
CREATE TABLE public.rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  game_id text NOT NULL,
  host_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'waiting',
  players jsonb NOT NULL DEFAULT '[]'::jsonb,
  game_state jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rooms TO authenticated;
GRANT ALL ON public.rooms TO service_role;

ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can read any room (needed to join by code)
CREATE POLICY "Authenticated users can read rooms"
  ON public.rooms FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create rooms"
  ON public.rooms FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = host_id);

-- Any authenticated user can update a room (to join, play turns, chat etc.)
-- App logic enforces correctness. Open multiplayer game, low-trust state.
CREATE POLICY "Authenticated users can update rooms"
  ON public.rooms FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Host can delete room"
  ON public.rooms FOR DELETE
  TO authenticated
  USING (auth.uid() = host_id);

CREATE TABLE public.room_chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  sender_id text NOT NULL,
  sender_name text NOT NULL,
  text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_room_chats_room_id_created_at ON public.room_chats(room_id, created_at);

GRANT SELECT, INSERT ON public.room_chats TO authenticated;
GRANT ALL ON public.room_chats TO service_role;

ALTER TABLE public.room_chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read chats"
  ON public.room_chats FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can post chats"
  ON public.room_chats FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_chats;
ALTER TABLE public.rooms REPLICA IDENTITY FULL;
ALTER TABLE public.room_chats REPLICA IDENTITY FULL;

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_rooms_updated_at
BEFORE UPDATE ON public.rooms
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
