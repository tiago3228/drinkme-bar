# Auditoria de segurança — BAR PROFISSIONAL

**Status:** revisão estática do clone GitHub; propostas SQL não aplicadas. Nenhuma chamada ao Supabase, query de banco, migration, alteração de tabela/policy/dado/configuração do banco ou operação Git de commit/push foi feita.

## Resumo executivo

A aplicação já usa RLS e mantém a criação de usuários separada da atribuição de papel `admin`. O código de server valida o JWT e usa cliente Supabase com a identidade do usuário para a maior parte das consultas e alterações. A migration `0005` restringe leitura pública de `site_settings` à chave `home`, e `0006_controlled_public_photo_delivery.sql` remove a policy pública de leitura de objetos no Storage; imagens públicas da Home são verificadas por recurso e MIME e assinadas por um handler server-side.

Foram preparados dois rascunhos SQL, fora da pasta gerenciada `drizzle/migrations`: um para retirar privilégios diretos dispensáveis de `anon`/`authenticated` nas dez tabelas e outro para exigir acesso autorizado à aula ao gravar progresso. São propostas condicionadas à validação do catálogo implantado, não instruções aplicadas.

**Não foi possível confirmar o estado atual do Supabase**: as variáveis de conexão Supabase/DB não estão disponíveis nesta tarefa, não há credencial de banco, e `supabase/config.toml` contém apenas `project_id`. Portanto, as policies, ACLs, bucket, MIME/limite e migrations descritos abaixo são o estado do código versionado, não uma observação do banco remoto. Não se pode concluir que as seis migrations citadas pelo solicitante estejam aplicadas.

Há ainda conflito de numeração: o repositório tem `0000_bar_profissional_platform.sql` e migrations `0001` até `0006`, incluindo `0006_controlled_public_photo_delivery.sql`. Se o banco já aplicou `0006`, a proposta de privilégios deve ser a próxima (0007), não pode sobrescrever 0006. Como o próprio `AGENTS.md` declara que o Lovable gerencia o banco e a pasta de migrations, os rascunhos foram deixados em `security-review/` para revisão; não os movi para `drizzle/migrations`.

## Arquivos de revisão

- [Rascunho 0007 — restrição de privilégios](./0007_restrict_table_privileges.sql): remove TRUNCATE, REFERENCES e TRIGGER diretamente de `anon` e `authenticated`, retira escrita de `anon` e DML que a aplicação não utiliza de `authenticated`, mantendo as permissões que as migrations versionadas indicam serem necessárias. Não concede privilégios novos nem altera RLS.
- [Rascunho 0008 — escopo de progresso](./0008_scope_student_progress.sql): modifica a policy existente `own_progress` para aceitar linhas apenas quando o próprio usuário consegue consultar a aula pelas policies vigentes. Não remove nem substitui a policy por outra.

Os nomes `0007`/`0008` são propostas baseadas no último arquivo do repositório e precisam ser ajustados ao histórico verdadeiro do banco/Lovable antes de serem transformados em migrations oficiais.

## Escopo e evidência revisada

Foram lidos os arquivos `drizzle/migrations/0000` a `0006`, `drizzle/schema.ts` (intencionalmente vazio/gerado), `supabase/config.toml`, `drizzle.config.ts`, `README.md`, `AGENTS.md`, rotas autenticadas, middleware, `src/features/platform.functions.ts`, páginas pública/admin/aluno, regras e testes de upload. A revisão de código é estática e não inclui pentest, chamadas HTTP, análise binária de arquivos ou inspeção do projeto hospedado.

### Operações observadas por perfil

- **Visitante (`anon`):** precisa de SELECT em `courses`, `modules`, `resources`, `testimonials` e `site_settings` para carregar conteúdo público. As RLS versionadas restringem cursos/módulos/depoimentos publicados, recursos `is_public`, e `site_settings` à linha `key = 'home'` após a migration 0005. A Home consulta `resources` apenas para selecionar a imagem marcada pública.
- **Usuário autenticado/aluno:** precisa de SELECT das tabelas usadas por `memberContent`; UPDATE de seu `profiles`; SELECT de `user_roles` para policy/RPC; INSERT/UPDATE/SELECT de `lesson_progress` para upsert e exibição; SELECT de matrículas próprias. Não há fluxo observado de DELETE de progresso nem UPDATE de matrícula.
- **Administrador:** a aplicação faz operações CRUD em `courses`, `modules`, `lessons`, `resources`, `testimonials`, `site_settings`; cria e exclui `enrollments`; lê perfis e modifica o conteúdo do próprio perfil no fluxo comum. DML nas tabelas administráveis continua sujeito às policies com `has_role(auth.uid(),'admin')`. `user_roles` não faz parte da allowlist `adminMutation`; a promoção deve continuar por procedimento autorizado fora do cadastro público.

A matriz proposta está limitada às ACLs diretas de `anon`/`authenticated`. Para todos os usuários, inclusive admins, RLS continua determinando quais linhas são visíveis/modificáveis. As grants de `service_role` não são alteradas.

## Privilégios: remoções e preservações propostas

### Remover

1. `TRUNCATE`, `REFERENCES` e `TRIGGER` dos dois roles nas dez tabelas públicas (`profiles`, `user_roles`, `courses`, `modules`, `enrollments`, `lessons`, `resources`, `lesson_progress`, `testimonials`, `site_settings`). Nenhuma operação de aplicação observada precisa desses privilégios.
2. Todo `INSERT`, `UPDATE` e `DELETE` direto de `anon`; e SELECT anônimo em dados de perfil, papel, matrícula, aulas e progresso.
3. INSERT/DELETE autenticados em `profiles`; todo DML autenticado em `user_roles`; UPDATE autenticado em `enrollments`; DELETE autenticado em `lesson_progress`. Não há esses fluxos no código observado. Os privilégios SQL administrativos nos demais dados permanecem para que o painel funcione, com RLS como controle de admin.

### Preservar

- SELECT anônimo de cursos, módulos, recursos, depoimentos e configurações do site (RLS limita as linhas públicas).
- SELECT autenticado necessário às consultas da área de aluno/admin; UPDATE de perfil; INSERT/UPDATE de progresso; SELECT de `user_roles`.
- DML autenticado nas tabelas usadas pelo painel administrativo; em `enrollments`, SELECT/INSERT/DELETE para conceder e revogar; em `lesson_progress`, SELECT/INSERT/UPDATE.
- Triggers, funções e grants de `service_role` existentes. A função trigger `create_student_profile()` roda pelo mecanismo de trigger, não requer execução direta pelo cliente.

**Limite importante:** o rascunho não elimina privilégios concedidos a `PUBLIC`, recebidos por membership/herança de outros roles, nem altera default privileges de um dono de objetos desconhecido. Isso é intencional: não há snapshot ACL remoto para avaliar impactos e nomes dos donos/grupos para corrigir defaults com segurança. As consultas de verificação abaixo são pré-requisito antes de tratar o rascunho como completo.

## Policies RLS e controle de acesso

O histórico versionado contém policies de leitura/escrita por tabela. Em síntese: perfil do próprio usuário (admin lê perfis); leitura de papel próprio/admin; cursos e módulos públicos quando o curso está publicado, com policy CRUD admin; matrícula própria só para leitura e CRUD admin; aula visível a usuário autenticado quando publicada e o curso é acessível, ou por policy admin; recursos públicos/admin/aluno matriculado conforme associação; progresso próprio; depoimentos publicados; configurações públicas apenas `home` após 0005. O rascunho 0007 não toca nessas policies.

### Problema de progresso

A policy `own_progress` em `0000` permite ao usuário inserir/alterar seu progresso desde que `user_id = auth.uid()` e o `lesson_id` exista. Ela **não exige** que a aula seja publicada ou que o aluno esteja matriculado. O endpoint `saveProgress` valida o acesso consultando `lessons` primeiro, mas um cliente autenticado pode chamar a API diretamente e contornar esse endpoint. Isso não revela automaticamente conteúdo protegido, mas permite criar/modificar progresso fora do curso autorizado e polui a integridade dos dados. O rascunho 0008 alinha a policy da tabela com a capacidade de SELECT de `lessons` sob RLS. Confirmar o nome e a expressão da policy implantada antes de aplicar.

### Função `has_role`

`has_role(uuid, app_role)` é `SECURITY DEFINER` e tem EXECUTE concedido a `authenticated` pela migration 0002. O argumento `_user_id` é fornecido pelo chamador, então um aluno pode chamar diretamente a RPC para testar se outros UUIDs têm o papel `admin` (enumeração de papel/identidade). O código de login chama a função com o ID da própria sessão, e as policies também passam `auth.uid()`, mas isso não impede chamadas RPC arbitrárias.

Recomendação: validar dependências no banco e revisar a função para restringir a avaliação à identidade autenticada (`auth.uid()`), mantendo assinatura/compatibilidade ou migrando consumidores com cuidado. Não foi incluído SQL para `has_role`, porque não foi possível verificar funções/policies adicionais e dependências no banco real, owner, ACL efetiva e grants posteriores. `create_student_profile()`, `has_role()` e `can_access_course()` têm `search_path=public` no arquivo base e referências a tabelas qualificadas; confirmar `proconfig`, owner e EXECUTE no remoto antes de recomendar mudança de owner/search_path/ACL. `can_access_course` consulta matrícula do chamador; `create_student_profile` tem execução direta revogada em 0002.

### Cursos não publicados/retirados do catálogo

No snapshot atual, cursos publicados são legíveis publicamente e módulos só são SELECT quando o curso está publicado (ou pela policy admin). A policy de aulas verifica aula publicada e `can_access_course`, que considera matrícula/admin, mas não checa `courses.published`. Assim, um aluno matriculado pode ainda satisfazer o teste de aula/vídeo por identificador, mas a interface do aluno não consegue listar o curso nem seus módulos se ele não está publicado. Esse comportamento é incoerente, e não garante nem uma política uniforme de “retirar do catálogo mas manter acesso” nem uma revogação completa.

**Recomendação de produto:** tratar `published=false` como “oculto de novas vendas/catálogo”, mantendo acesso de alunos já matriculados enquanto as aulas estiverem publicadas; para retirada por revogação/takedown, tratar como ação distinta que corta explicitamente acesso. Isso exige decisão do proprietário e ajuste coordenado das policies de cursos/módulos/aulas/recursos; nenhum SQL foi preparado para essa decisão nem o comportamento foi alterado.

## Uploads e Supabase Storage

- Aplicação: `MAX_UPLOAD = 50 * 1024 * 1024` bytes (**50 MiB**, exibidos pela UI como MB), e extensões permitidas: `mp4`, `webm`, `mov`, `jpg`, `jpeg`, `png`, `webp`, `pdf`, `xlsx`, `xls`, `csv`, `txt` (`src/features/content.ts`). A função server rejeita extensões fora da lista e metadado de tamanho acima de 52.428.800 bytes.
- Lacuna de MIME: a validação da UI é por extensão, não valida a correspondência entre extensão, `file.type` e conteúdo real. O browser informa MIME ao upload, mas esse valor pode ser vazio ou forjado. A função server recebe `mime_type` e `size` como metadados declarados e não inspeciona o arquivo. A aplicação fornece `application/octet-stream` se `file.type` estiver vazio.
- Caminho: nome é sanitizado e objeto recebe prefixo com user ID/UUID; contudo, não há validação server-side de prefixo esperado nem associação obrigatória e consistente a curso/módulo/aula na mutation. O acesso de upload observado é restrito a admin pela policy de `storage.objects`.
- Bucket: a migration define `course-media` privado por uso de signed URLs e policies, mas bucket, `file_size_limit` e `allowed_mime_types` não constam no `supabase/config.toml` nem nas migrations inspecionadas. O relatório anterior alegando ausência de limites específicos não pode ser confirmado no serviço remoto.
- Storage RLS: migration 0000 cria policy de escrita admin e leitura por resource; migration 0004 substitui a policy de leitura autenticada por verificação de matrícula/associação; migration 0004 também cria leitura pública para `resources.is_public=true`; migration 0006 remove essa policy pública de objetos. Portanto, a fonte versionada atual evita leitura anônima direta dos objetos; a Home entrega imagens públicas selecionadas por URLs assinadas no servidor. Confirmar policies/grants remotas.
- Assinatura: `mediaUrl` gera URL de 10 minutos após leitura do recurso sob RLS; `lessonVideoUrl` gera URL de vídeo de 60 minutos após consulta de aula sob RLS; a imagem pública da Home é assinada por 60 minutos após confirmar `is_public=true` e MIME JPEG/PNG/WebP. A URL assinada é um bearer link compartilhável e tende a funcionar até expirar; remoção posterior de matrícula não invalida uma URL já emitida. Avaliar se a duração de 60 minutos para vídeo cabe no modelo de ameaça.

**Proposta operacional (não aplicada):** confirmar no painel/Storage API o bucket atual; definir teto de 52.428.800 bytes e allowlist MIME que corresponda às extensões suportadas (`video/mp4`, `video/webm`, `video/quicktime`, `image/jpeg`, `image/png`, `image/webp`, `application/pdf`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, `application/vnd.ms-excel`, `text/csv`, `text/plain`). Antes de ativar MIME estrito, alinhar o cliente para rejeitar MIME vazio/desconhecido (hoje envia `application/octet-stream` como fallback) e confirmar valores reais enviados pelos navegadores. Allowlist Storage valida cabeçalho/MIME declarado; não equivale a antivírus nem detecção do conteúdo binário. Como o usuário proibiu alteração de configuração nesta etapa e o bucket remoto não está acessível, não criei UPDATE SQL especulativo para `storage.buckets`.

## Compatibilidade da aplicação

- `publicContent` usa cliente publishable e lê cursos, módulos, configurações e depoimentos; a RLS é necessária para não expor cursos/dados internos.
- `memberContent` consulta tabelas através do JWT do usuário. O filtro por aluno vem das policies, não de filtros client-side como controle de segurança.
- `adminMutation` tem allowlist de tabelas e verifica `has_role` antes da mutation; a RLS deve continuar impondo o mesmo controle para chamadas diretas.
- `saveProfile` só aceita `display_name`; a policy impede alterar o próprio ID. Papéis vivem em tabela separada sem escrita autenticada concedida no histórico.
- `saveProgress` faz upsert com `user_id=context.userId`; política 0008 proposta reforça validação na camada de banco.
- Upload só no painel admin conforme policy de Storage. Remoção de resources faz remoção do objeto, e substituições atualizam caminhos de vídeos que aparecem no conjunto carregado da aplicação.

Nenhuma alteração visual/funcional foi feita. Testes automatizados não foram executados: `bun run test` falhou porque `bun` não está instalado no sandbox. Nenhum fallback com instalação de dependências foi feito.

## Verificações somente leitura antes de qualquer aplicação

Executar em SQL Editor conectado ao projeto correto, com uma conta que possa ver os catálogos; não é comando de aplicação. Comparar resultado real com o histórico de migrations e guardar snapshot antes de qualquer mudança.

### Privilégios efetivos nas dez tabelas

```sql
WITH target(table_name) AS (VALUES
  ('profiles'), ('user_roles'), ('courses'), ('modules'), ('enrollments'),
  ('lessons'), ('resources'), ('lesson_progress'), ('testimonials'), ('site_settings')
), privilege(privilege_name) AS (VALUES
  ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE'), ('TRUNCATE'), ('REFERENCES'), ('TRIGGER')
)
SELECT t.table_name, p.privilege_name,
       has_table_privilege('anon', format('public.%I', t.table_name), p.privilege_name) AS anon_effective,
       has_table_privilege('authenticated', format('public.%I', t.table_name), p.privilege_name) AS authenticated_effective
FROM target t CROSS JOIN privilege p
ORDER BY t.table_name, p.privilege_name;
```

### Policies e RLS (incluindo Storage)

```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE (schemaname = 'public' AND tablename IN
  ('profiles','user_roles','courses','modules','enrollments','lessons','resources','lesson_progress','testimonials','site_settings'))
   OR (schemaname = 'storage' AND tablename = 'objects')
ORDER BY schemaname, tablename, policyname;

SELECT n.nspname AS schema_name, c.relname AS table_name, c.relrowsecurity AS rls_enabled,
       c.relforcerowsecurity AS rls_forced
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE (n.nspname = 'public' AND c.relname IN
  ('profiles','user_roles','courses','modules','enrollments','lessons','resources','lesson_progress','testimonials','site_settings'))
   OR (n.nspname = 'storage' AND c.relname = 'objects')
ORDER BY 1,2;
```

### Grants diretos, memberships, default ACLs

```sql
SELECT table_schema, table_name, grantee, privilege_type, is_grantable
FROM information_schema.table_privileges
WHERE table_schema = 'public' AND table_name IN
  ('profiles','user_roles','courses','modules','enrollments','lessons','resources','lesson_progress','testimonials','site_settings')
ORDER BY table_name, grantee, privilege_type;

SELECT r.rolname AS granted_role, m.rolname AS member_role, am.admin_option, am.inherit_option
FROM pg_auth_members am
JOIN pg_roles r ON r.oid = am.roleid
JOIN pg_roles m ON m.oid = am.member
WHERE r.rolname IN ('anon','authenticated') OR m.rolname IN ('anon','authenticated')
ORDER BY 1,2;

SELECT pg_get_userbyid(d.defaclrole) AS object_owner, n.nspname AS schema_name,
       d.defaclobjtype, d.defaclacl
FROM pg_default_acl d LEFT JOIN pg_namespace n ON n.oid = d.defaclnamespace
WHERE n.nspname = 'public' OR d.defaclnamespace = 0;
```

### Bucket e funções SECURITY DEFINER

```sql
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id = 'course-media';

SELECT p.oid::regprocedure AS function_signature,
       r.rolname AS owner, p.prosecdef AS security_definer, p.proconfig, p.proacl
FROM pg_proc p JOIN pg_roles r ON r.oid = p.proowner
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('create_student_profile','has_role','can_access_course')
ORDER BY 1;
```

`has_table_privilege` mostra acesso efetivo ao role e pode refletir herança; verificar em conjunto com grants diretos, memberships e ACLs de `PUBLIC`. A consulta de bucket não lê nem altera objetos. Confirmar também no painel qual projeto Supabase está conectado e o histórico real de migrations, pois não há caminho de migração observado para provar aplicação.

## Riscos, impactos e reversão

- **Risco de 0007:** se algum consumidor externo ao código revisado depender de INSERT/UPDATE/DELETE de matrícula ou DELETE de progresso por `authenticated`, o acesso deixa de funcionar; não há consumidor desse tipo no repo. Grants herdados de `PUBLIC` ou outros roles podem manter privilégios efetivos. Revisar ACLs antes e depois.
- **Risco de 0008:** tentativas diretas de alterar progresso em aula não publicada/sem autorização passam a falhar; esse é o endurecimento intencional. A policy existente é modificada in-place, não apagada.
- **Risco de Storage:** não há proposta SQL de bucket para evitar configurar MIME incompatível com upload real. O limite no código não limita por si só Storage.
- **Reversão:** antes de aplicar qualquer migration, exportar/salvar o resultado das consultas de ACL/policies. Reversão fiel depende desse snapshot; os grants do histórico original podem ser re-concedidos por tabela como último recurso, mas isso restaura privilégios excessivos e não deve ser usado sem análise. Para 0008, o rollback ao comportamento anterior seria `ALTER POLICY own_progress ON public.lesson_progress USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.lessons WHERE id = lesson_id));` — isso restaura a lacuna de segurança. Não usar rollback automático sem aprovação.

## Validação esperada se, depois, houver autorização para aplicar

1. Conferir projeto/ambiente, histórico, nomes e definição exata das policies; obter snapshot da matriz ACL/RLS, memberships, default ACL e bucket.
2. Aplicar via fluxo oficial do Lovable, nunca executar este rascunho diretamente sem aprovação; preservar migrações anteriores. A configuração de bucket deve ser feita em fluxo próprio depois de validar MIME no cliente.
3. Reexecutar as consultas acima: anon sem TRUNCATE/REFERENCES/TRIGGER/escrita e sem leitura de linhas privadas; authenticated sem os privilégios retirados; leitura pública só pela RLS; políticas e bucket conforme decisão.
4. Testar com usuário anônimo, aluno sem matrícula, aluno matriculado, admin e service role (segredos nunca no cliente): visitante lê só catálogo/Home públicos; aluno não lista nem escreve progresso em aula inacessível; aluno não cria matrícula nem promove papel; aluno matriculado acessa apenas os cursos autorizados; admin mantém CRUD e criação/revogação de matrícula; uploads dentro do limite/MIME; URL assinada expira como esperado.
5. Reexecutar testes/build da aplicação em ambiente com dependências; os testes locais desta sessão não rodaram por falta de `bun`.

**Nenhuma migration foi aplicada, nenhum dado ou configuração de banco foi modificado, e não foi feito commit/push.**
