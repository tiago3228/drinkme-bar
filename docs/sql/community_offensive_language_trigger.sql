-- MODERAÇÃO DE LINGUAGEM — COMUNIDADE DRINKME BAR
-- Cole o script inteiro no SQL Editor do Lovable para instalar os triggers.
-- Pré-requisito: as tabelas community_posts e community_comments já existem.
-- Reexecutável: substitui a função e recria apenas os triggers; não cria tabelas,
-- não apaga publicações/comentários e não altera registros existentes.

DO $$
BEGIN
  IF to_regclass('public.community_posts') IS NULL THEN
    RAISE EXCEPTION 'A tabela public.community_posts não existe. Confira se a migration da comunidade foi aplicada.';
  END IF;
  IF to_regclass('public.community_comments') IS NULL THEN
    RAISE EXCEPTION 'A tabela public.community_comments não existe. Confira se a migration da comunidade foi aplicada.';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_community_offensive_language()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  normalized_body text;
BEGIN
  normalized_body := trim(regexp_replace(
    regexp_replace(
      translate(
        lower(coalesce(NEW.body, '')),
        'áàâãäéèêëíìîïóòôõöúùûüç',
        'aaaaaeeeeiiiiooooouuuuc'
      ),
      U&'[\0300-\036F]',
      '',
      'g'
    ),
    '[^a-z0-9]+',
    ' ',
    'g'
  ));

  IF EXISTS (
    SELECT 1
    FROM unnest(ARRAY[
      'arrombada', 'arrombadas', 'arrombado', 'arrombados', 'babaca', 'bosta', 'buceta',
      'cacete', 'caralho', 'corna', 'corno', 'cu', 'desgracada', 'desgracadas',
      'desgracado', 'desgracados', 'foda', 'foda se', 'fode', 'foder', 'fodase',
      'fodida', 'fodidas', 'fodido', 'fodidos', 'filha da puta', 'filho da puta',
      'merda', 'otaria', 'otarias', 'otario', 'otarios', 'piranha', 'piranhas',
      'porra', 'puta', 'putas', 'putaria', 'puto', 'putos', 'retardada', 'retardado',
      'vagabunda', 'vagabundas', 'vagabundo', 'vagabundos', 'veado', 'veados',
      'viado', 'viados', 'vai tomar no cu', 'asshole', 'bitch', 'fuck', 'fucked',
      'fucker', 'fucking', 'shit', 'slut', 'son of a bitch'
    ]::text[]) AS blocked(term)
    WHERE position(' ' || blocked.term || ' ' IN ' ' || normalized_body || ' ') > 0
  ) THEN
    RAISE EXCEPTION 'community_offensive_language' USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.reject_community_offensive_language() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reject_community_offensive_language() TO authenticated, service_role;

DROP TRIGGER IF EXISTS community_posts_offensive_language ON public.community_posts;
CREATE TRIGGER community_posts_offensive_language
  BEFORE INSERT OR UPDATE ON public.community_posts
  FOR EACH ROW EXECUTE FUNCTION public.reject_community_offensive_language();

DROP TRIGGER IF EXISTS community_comments_offensive_language ON public.community_comments;
CREATE TRIGGER community_comments_offensive_language
  BEFORE INSERT OR UPDATE ON public.community_comments
  FOR EACH ROW EXECUTE FUNCTION public.reject_community_offensive_language();
