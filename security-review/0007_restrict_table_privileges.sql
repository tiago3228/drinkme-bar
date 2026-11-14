-- RASCUNHO PARA REVISÃO — NÃO APLICADO.
-- BAR PROFISSIONAL: reduzir privilégios diretos de anon/authenticated.
--
-- O repositório já contém drizzle/migrations/0006_controlled_public_photo_delivery.sql.
-- Por isso esta proposta usa o próximo número (0007) e fica fora da pasta
-- drizzle/migrations, que o projeto identifica como gerenciada pelo Lovable.
-- Antes de aplicar: conferir o catálogo remoto, dependências/RLS e o histórico
-- de migrations; esta proposta remove apenas privilégios explícitos de anon e
-- authenticated listados abaixo. Ela não revoga grants herdados via PUBLIC,
-- associação a outros roles, nem altera ACLs de default privileges.
--
-- RLS continua sendo a fronteira que distingue administradores de alunos.
-- service_role e demais roles não são alterados.

BEGIN;

-- Nenhum fluxo da aplicação exige TRUNCATE, REFERENCES ou TRIGGER nestas tabelas.
-- Revogar explicitamente dos dois roles usados pelos clientes da aplicação.
REVOKE TRUNCATE, REFERENCES, TRIGGER ON TABLE
  public.profiles,
  public.user_roles,
  public.courses,
  public.modules,
  public.enrollments,
  public.lessons,
  public.resources,
  public.lesson_progress,
  public.testimonials,
  public.site_settings
FROM anon, authenticated;

-- Visitantes precisam somente das leituras que sustentam o catálogo e a Home.
-- Remover escritas de anon em todas as tabelas e leituras de dados privados.
REVOKE INSERT, UPDATE, DELETE ON TABLE
  public.profiles,
  public.user_roles,
  public.courses,
  public.modules,
  public.enrollments,
  public.lessons,
  public.resources,
  public.lesson_progress,
  public.testimonials,
  public.site_settings
FROM anon;

REVOKE SELECT ON TABLE
  public.profiles,
  public.user_roles,
  public.enrollments,
  public.lessons,
  public.lesson_progress
FROM anon;

-- Profiles: estudante atualiza apenas o próprio perfil sob RLS; admins leem
-- perfis pelo caminho já definido na policy. Não há fluxo de insert/delete.
REVOKE INSERT, DELETE ON TABLE public.profiles FROM authenticated;

-- Papéis: leitura sob RLS, sem escrita por clientes. A atribuição administrativa
-- de papéis deve continuar fora do cadastro público.
REVOKE INSERT, UPDATE, DELETE ON TABLE public.user_roles FROM authenticated;

-- Matrículas: painel administrativo cria e revoga; não há fluxo de UPDATE.
-- RLS own_enrollments/admin_enrollments permanece inalterada.
REVOKE UPDATE ON TABLE public.enrollments FROM authenticated;

-- Progresso: a aplicação lê e faz upsert; não há fluxo de DELETE. A policy
-- própria continua exigindo user_id = auth.uid(); uma proposta separada abaixo
-- endurece quais aulas podem receber progresso.
REVOKE DELETE ON TABLE public.lesson_progress FROM authenticated;

-- Não há GRANT amplo aqui: as migrations existentes já concedem SELECT para
-- authenticated nas tabelas necessárias e DML nas tabelas usadas pelo painel.
-- As policies RLS existentes continuam restringindo DML administrativo.

COMMIT;
