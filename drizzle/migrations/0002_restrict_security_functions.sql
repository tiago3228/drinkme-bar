REVOKE EXECUTE ON FUNCTION public.create_student_profile() FROM PUBLIC,anon,authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid,public.app_role) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid,public.app_role) TO authenticated,service_role;
REVOKE EXECUTE ON FUNCTION public.can_access_course(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.can_access_course(uuid) TO authenticated,service_role;