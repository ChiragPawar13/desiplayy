REVOKE EXECUTE ON FUNCTION public.join_room_by_code(text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_room_member_by_code(text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_room_member_by_id(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.join_room_by_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_room_member_by_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_room_member_by_id(uuid) TO authenticated;