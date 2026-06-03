
-- Helper: check membership by room code
CREATE OR REPLACE FUNCTION public.is_room_member_by_code(_code text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.rooms r
    WHERE r.code = upper(_code)
      AND (
        r.host_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM jsonb_array_elements(r.players) p
          WHERE p->>'uid' = auth.uid()::text
        )
      )
  );
$$;

-- Helper: check membership by room id
CREATE OR REPLACE FUNCTION public.is_room_member_by_id(_room_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.rooms r
    WHERE r.id = _room_id
      AND (
        r.host_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM jsonb_array_elements(r.players) p
          WHERE p->>'uid' = auth.uid()::text
        )
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_room_member_by_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_room_member_by_id(uuid) TO authenticated;

-- Tighten rooms UPDATE: must be host or a listed player
DROP POLICY IF EXISTS "Authenticated users can update rooms" ON public.rooms;
CREATE POLICY "Members can update rooms"
ON public.rooms
FOR UPDATE
TO authenticated
USING (
  auth.uid() = host_id
  OR EXISTS (
    SELECT 1 FROM jsonb_array_elements(players) p
    WHERE p->>'uid' = auth.uid()::text
  )
)
WITH CHECK (
  auth.uid() = host_id
  OR EXISTS (
    SELECT 1 FROM jsonb_array_elements(players) p
    WHERE p->>'uid' = auth.uid()::text
  )
);

-- Tighten room_chats INSERT: sender must be the caller and a room member
DROP POLICY IF EXISTS "Authenticated users can post chats" ON public.room_chats;
CREATE POLICY "Members can post chats"
ON public.room_chats
FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid()::text
  AND public.is_room_member_by_id(room_id)
);

-- Tighten room_chats SELECT: only members can read
DROP POLICY IF EXISTS "Authenticated users can read chats" ON public.room_chats;
CREATE POLICY "Members can read chats"
ON public.room_chats
FOR SELECT
TO authenticated
USING (public.is_room_member_by_id(room_id));

-- Realtime channel authorization: limit topic subscriptions to room members.
-- Topics used: `room-<CODE>` and `chat-<ROOM_UUID>`
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can read realtime topics" ON realtime.messages;
CREATE POLICY "Members can read realtime topics"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  CASE
    WHEN realtime.topic() LIKE 'room-%'
      THEN public.is_room_member_by_code(substring(realtime.topic() from 6))
    WHEN realtime.topic() LIKE 'chat-%'
      THEN public.is_room_member_by_id(
        NULLIF(substring(realtime.topic() from 6), '')::uuid
      )
    ELSE false
  END
);

DROP POLICY IF EXISTS "Members can write realtime topics" ON realtime.messages;
CREATE POLICY "Members can write realtime topics"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  CASE
    WHEN realtime.topic() LIKE 'room-%'
      THEN public.is_room_member_by_code(substring(realtime.topic() from 6))
    WHEN realtime.topic() LIKE 'chat-%'
      THEN public.is_room_member_by_id(
        NULLIF(substring(realtime.topic() from 6), '')::uuid
      )
    ELSE false
  END
);
