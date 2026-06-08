REVOKE EXECUTE ON FUNCTION public.is_room_member_by_code(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_room_member_by_id(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.join_room_by_code(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_room_member_by_code(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_room_member_by_id(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.join_room_by_code(text) TO authenticated, service_role;