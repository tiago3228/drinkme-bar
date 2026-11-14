ALTER POLICY allowed_media ON storage.objects TO authenticated USING (
  bucket_id = 'course-media'
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.resources r
    WHERE r.path = storage.objects.name
      AND (
        public.can_access_course(r.course_id)
        OR EXISTS (
          SELECT 1 FROM public.modules m
          WHERE m.id = r.module_id AND public.can_access_course(m.course_id)
        )
        OR EXISTS (
          SELECT 1 FROM public.lessons l
          JOIN public.modules m ON m.id = l.module_id
          WHERE (l.id = r.lesson_id OR l.video_path = r.path)
            AND l.published
            AND public.can_access_course(m.course_id)
        )
      )
  )
);
CREATE POLICY public_site_media ON storage.objects FOR SELECT TO anon, authenticated USING (
  bucket_id = 'course-media'
  AND EXISTS (
    SELECT 1 FROM public.resources r
    WHERE r.path = storage.objects.name AND r.is_public = true
  )
);