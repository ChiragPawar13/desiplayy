-- 1. SECURITY DEFINER RPC to join room (lets non-members join without exposing game_state)
CREATE OR REPLACE FUNCTION public.join_room_by_code(_code text)
RETURNS public.rooms
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.rooms;
  uid uuid := auth.uid();
  uname text;
  player_limit int;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO r FROM public.rooms WHERE code = upper(_code);
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Room does not exist';
  END IF;

  IF r.host_id = uid OR EXISTS (
    SELECT 1 FROM jsonb_array_elements(r.players) p WHERE p->>'uid' = uid::text
  ) THEN
    RETURN r;
  END IF;

  IF r.status <> 'waiting' THEN
    RAISE EXCEPTION 'Game already started';
  END IF;

  IF jsonb_array_length(r.players) >= 8 THEN
    RAISE EXCEPTION 'Room is full';
  END IF;

  SELECT coalesce(raw_user_meta_data->>'display_name', email, 'Player')
    INTO uname FROM auth.users WHERE id = uid;

  UPDATE public.rooms
  SET players = players || jsonb_build_array(
        jsonb_build_object('uid', uid::text, 'name', coalesce(uname, 'Player'))
      )
  WHERE id = r.id
  RETURNING * INTO r;

  RETURN r;
END;
$$;

REVOKE ALL ON FUNCTION public.join_room_by_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.join_room_by_code(text) TO authenticated;

-- 2. Restrict rooms SELECT to members only (hides game_state from non-members)
DROP POLICY IF EXISTS "Authenticated users can read rooms" ON public.rooms;
CREATE POLICY "Members can read rooms"
  ON public.rooms
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = host_id OR EXISTS (
      SELECT 1 FROM jsonb_array_elements(players) p
      WHERE p->>'uid' = auth.uid()::text
    )
  );

-- 3. Prevent tampering with immutable room columns via trigger
CREATE OR REPLACE FUNCTION public.rooms_protect_immutable()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.host_id IS DISTINCT FROM OLD.host_id THEN
    RAISE EXCEPTION 'host_id is immutable';
  END IF;
  IF NEW.code IS DISTINCT FROM OLD.code THEN
    RAISE EXCEPTION 'code is immutable';
  END IF;
  IF NEW.game_id IS DISTINCT FROM OLD.game_id THEN
    RAISE EXCEPTION 'game_id is immutable';
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS rooms_protect_immutable_trg ON public.rooms;
CREATE TRIGGER rooms_protect_immutable_trg
BEFORE UPDATE ON public.rooms
FOR EACH ROW EXECUTE FUNCTION public.rooms_protect_immutable();

-- 4. Stop chat sender_name spoofing: overwrite from auth.users server-side
CREATE OR REPLACE FUNCTION public.room_chats_set_sender_name()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uname text;
BEGIN
  IF NEW.sender_id IS DISTINCT FROM auth.uid()::text THEN
    RAISE EXCEPTION 'sender_id must match auth user';
  END IF;
  SELECT coalesce(raw_user_meta_data->>'display_name', email, 'Player')
    INTO uname FROM auth.users WHERE id = auth.uid();
  NEW.sender_name = coalesce(uname, 'Player');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS room_chats_set_sender_name_trg ON public.room_chats;
CREATE TRIGGER room_chats_set_sender_name_trg
BEFORE INSERT ON public.room_chats
FOR EACH ROW EXECUTE FUNCTION public.room_chats_set_sender_name();