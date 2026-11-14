-- RASCUNHO PARA REVISÃO — NÃO APLICADO.
-- Endurece a policy existente sem removê-la: o usuário só pode ler/escrever
-- progresso próprio para aulas que consegue consultar sob as policies atuais
-- de public.lessons (aula publicada e curso autorizado, ou acesso admin).
--
-- Depende de public.own_progress e das policies atuais de public.lessons ainda
-- existirem como no histórico versionado. Conferir o estado implantado antes.

BEGIN;

ALTER POLICY own_progress ON public.lesson_progress
  USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.lessons AS l
      WHERE l.id = lesson_progress.lesson_id
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.lessons AS l
      WHERE l.id = lesson_progress.lesson_id
    )
  );

COMMIT;
