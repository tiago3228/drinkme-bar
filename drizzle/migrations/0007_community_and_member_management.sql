-- Safe to rerun after partial execution: existing tables/rows are preserved.
CREATE TABLE IF NOT EXISTS public.community_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body text NOT NULL DEFAULT '',
  image_path text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT community_posts_body_length CHECK (char_length(body) <= 2000),
  CONSTRAINT community_posts_nonempty CHECK (length(btrim(body)) > 0 OR image_path IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS public.community_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT community_comments_body_nonempty CHECK (length(btrim(body)) > 0),
  CONSTRAINT community_comments_body_length CHECK (char_length(body) <= 1200)
);

CREATE INDEX IF NOT EXISTS community_posts_created_idx ON public.community_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS community_posts_user_idx ON public.community_posts(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS community_posts_image_path_unique
  ON public.community_posts(image_path) WHERE image_path IS NOT NULL;
CREATE INDEX IF NOT EXISTS community_comments_post_created_idx ON public.community_comments(post_id, created_at);
CREATE INDEX IF NOT EXISTS community_comments_user_idx ON public.community_comments(user_id);

CREATE OR REPLACE FUNCTION public.enforce_community_daily_limits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE recent_count integer;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.user_id::text, 0));
  IF TG_TABLE_NAME = 'community_posts' THEN
    SELECT count(*) INTO recent_count FROM public.community_posts
    WHERE user_id = NEW.user_id AND created_at >= now() - interval '24 hours';
    IF recent_count >= 30 THEN
      RAISE EXCEPTION 'community_post_daily_limit' USING ERRCODE = 'P0001';
    END IF;
  ELSE
    SELECT count(*) INTO recent_count FROM public.community_comments
    WHERE user_id = NEW.user_id AND created_at >= now() - interval '24 hours';
    IF recent_count >= 100 THEN
      RAISE EXCEPTION 'community_comment_daily_limit' USING ERRCODE = 'P0001';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.enforce_community_daily_limits() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enforce_community_daily_limits() TO authenticated, service_role;
DROP TRIGGER IF EXISTS community_posts_daily_limit ON public.community_posts;
CREATE TRIGGER community_posts_daily_limit
  BEFORE INSERT ON public.community_posts
  FOR EACH ROW EXECUTE FUNCTION public.enforce_community_daily_limits();
DROP TRIGGER IF EXISTS community_comments_daily_limit ON public.community_comments;
CREATE TRIGGER community_comments_daily_limit
  BEFORE INSERT ON public.community_comments
  FOR EACH ROW EXECUTE FUNCTION public.enforce_community_daily_limits();

CREATE OR REPLACE FUNCTION public.community_media_quota_ok()
RETURNS boolean
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = public, storage
AS $$
  SELECT auth.uid() IS NOT NULL AND (
    SELECT count(*) < 50 FROM storage.objects AS object
    WHERE object.bucket_id = 'community-media'
      AND (storage.foldername(object.name))[1] = auth.uid()::text
  )
$$;
REVOKE ALL ON FUNCTION public.community_media_quota_ok() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.community_media_quota_ok() TO authenticated;

GRANT SELECT, INSERT, DELETE ON public.community_posts TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.community_comments TO authenticated;
GRANT ALL ON public.community_posts TO service_role;
GRANT ALL ON public.community_comments TO service_role;
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS community_posts_read ON public.community_posts;
CREATE POLICY community_posts_read ON public.community_posts
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS community_posts_create ON public.community_posts;
CREATE POLICY community_posts_create ON public.community_posts
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (image_path IS NULL OR (storage.foldername(image_path))[1] = auth.uid()::text)
  );
DROP POLICY IF EXISTS community_posts_delete ON public.community_posts;
CREATE POLICY community_posts_delete ON public.community_posts
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS community_comments_read ON public.community_comments;
CREATE POLICY community_comments_read ON public.community_comments
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS community_comments_create ON public.community_comments;
CREATE POLICY community_comments_create ON public.community_comments
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS community_comments_delete ON public.community_comments;
CREATE POLICY community_comments_delete ON public.community_comments
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('community-media', 'community-media', false, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS community_media_read ON storage.objects;
CREATE POLICY community_media_read ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'community-media'
    AND EXISTS (
      SELECT 1 FROM public.community_posts p WHERE p.image_path = name
    )
  );
DROP POLICY IF EXISTS community_media_upload ON storage.objects;
CREATE POLICY community_media_upload ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'community-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND array_length(storage.foldername(name), 1) = 1
    AND lower(storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'webp')
    AND public.community_media_quota_ok()
  );
DROP POLICY IF EXISTS community_media_delete ON storage.objects;
CREATE POLICY community_media_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'community-media'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.has_role(auth.uid(), 'admin')
    )
  );

CREATE OR REPLACE FUNCTION public.community_author_names(_user_ids uuid[])
RETURNS TABLE (id uuid, display_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.display_name
  FROM public.profiles p
  WHERE auth.uid() IS NOT NULL
    AND p.id = ANY(_user_ids)
    AND (
      EXISTS (SELECT 1 FROM public.community_posts cp WHERE cp.user_id = p.id)
      OR EXISTS (SELECT 1 FROM public.community_comments cc WHERE cc.user_id = p.id)
    )
$$;
REVOKE ALL ON FUNCTION public.community_author_names(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.community_author_names(uuid[]) TO authenticated;
