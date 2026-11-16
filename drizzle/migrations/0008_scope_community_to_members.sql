CREATE OR REPLACE FUNCTION public.is_community_member()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL AND (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.enrollments e WHERE e.user_id = auth.uid())
  )
$$;
REVOKE EXECUTE ON FUNCTION public.is_community_member() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_community_member() TO authenticated, service_role;

DROP POLICY IF EXISTS community_posts_read ON public.community_posts;
CREATE POLICY community_posts_read ON public.community_posts
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_community_member());

DROP POLICY IF EXISTS community_comments_read ON public.community_comments;
CREATE POLICY community_comments_read ON public.community_comments
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_community_member());

DROP POLICY IF EXISTS community_media_read ON storage.objects;
CREATE POLICY community_media_read ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'community-media'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR (
        public.is_community_member()
        AND EXISTS (SELECT 1 FROM public.community_posts p WHERE p.image_path = storage.objects.name)
      )
    )
  );
