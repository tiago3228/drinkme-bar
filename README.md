# BAR PROFISSIONAL — DO BALCÃO À GESTÃO.

Escola digital de Warley Jean para coquetelaria, gestão e operações de bar. Site institucional, treinamento, área do aluno e administração de conteúdo com armazenamento protegido.

## Tecnologias e estrutura

React 19, TypeScript, TanStack Start/Router/Query, Tailwind CSS v4, componentes Radix e Lovable Cloud (autenticação, PostgreSQL e arquivos).

- `src/routes/`: páginas públicas e páginas protegidas em `_authenticated`.
- `src/features/`: visualizações, regras de arquivos e funções de conteúdo.
- `src/components/ui/`: componentes de interface.
- `src/styles.css`: identidade visual e estilos adaptados aos dispositivos.
- `src/assets/`: referências permanentes de mídia, sem arquivos pessoais.
- `drizzle/migrations/`: histórico das alterações do banco, gerenciado pelo Lovable.
- `src/test/`: testes das regras de arquivos e navegação.

## Desenvolvimento

Instale Bun e execute `bun install` e `bun run dev`. Execute `bun run test` para testes. Para gerar uma versão de produção fora do editor, `bun run build`. O ambiente publicado usa um runtime compatível com Workers; não introduza dependências nativas de Node nos serviços.

## Lovable Cloud

Email e senha habilitados, confirmação de email mantida. Perfis são criados automaticamente; papéis ficam em tabela separada. Acesso aos cursos é concedido por matrículas. Nenhum cadastro público concede administração.

O proprietário precisa cadastrar a conta de Warley e informar qual conta deve receber o papel administrativo. A atribuição deve ser feita por uma operação autorizada no Lovable; nunca adicione uma senha fixa nem um botão de promoção pública. Administradores autorizam alunos no painel.

Variáveis públicas gerenciadas pelo Lovable: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`. No servidor: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. Não coloque valores secretos neste documento ou no repositório. O Lovable gerencia as variáveis; não edite os arquivos de integração gerados.

Uploads vão para o bucket privado `course-media`, com limite inicial de 50 MB por arquivo e tipos permitidos. URLs são temporárias e dependem das permissões. Mídia pública do site é marcada explicitamente como pública na biblioteca. O bloqueio de buckets públicos do workspace permanece ativo. Para vídeos maiores, ajuste o limite do Cloud e da aplicação juntos ou use YouTube/Vimeo.

## Administração

`/admin`: cursos, módulos, aulas, biblioteca, alunos, conteúdo da Home, biografia, seleção de imagens, checkout, perguntas frequentes e depoimentos reais. `/aluno`: cursos autorizados, aula, materiais, progresso e perfil. O preço inicial é editável no curso. Sem checkout configurado, o site encaminha consultas ao Instagram e não confirma pagamentos.

As seis propostas de módulo foram organizadas a partir dos temas do briefing; revise o programa e envie aulas antes de vender acesso. Nenhuma aula, avaliação, depoimento ou certificado fictício foi criado.

## Identidade e mídia

O perfil público oficial foi consultado em 14/11/2026. A extração retornou links de fotos e vídeos com autoria apresentada como “Jean Oliveira”, mas não revelou a biografia, legendas ou detalhes profissionais. Não foi possível confirmar trajetória ou certificações. Foram usadas duas imagens do perfil indicado pelo proprietário: registro de trabalho no bar e coquetel. Não foram geradas fotos de pessoas. Substitua por arquivos originais autorizados pela biblioteca quando fornecidos. Nenhuma afirmação profissional adicional é inferida da autoria exibida pelo Instagram.

## GitHub privado e histórico

Somente o proprietário pode concluir a integração oficial: abra **Configurações do projeto → Git → Conectar GitHub**, conecte a conta ou organização e autorize o aplicativo Lovable. A integração cria um novo repositório privado; não conecta repositórios já existentes. Nome sugerido: `bar-profissional-warley-jean`.

Confira a privacidade e a sincronização no cartão Git do Lovable e verifique os commits na aba de histórico do GitHub. O agente não consegue confirmar essa conexão ou seu estado pelo ambiente de desenvolvimento. Não use tokens no código. Evite reescrever o histórico ou fazer force-push. Migrações vindas do GitHub não são aplicadas automaticamente: peça ao Lovable para aplicá-las.

## Publicação, atualização e backup

Publique pelo botão **Publicar** no Lovable depois de validar a conta administrativa, conteúdos e checkout. Alterações futuras são feitas pelo editor ou por commits na branch sincronizada. O painel publica conteúdos sem editar código. Novas funções devem manter autenticação nos serviços e as políticas de acesso do banco, com testes de negação de acesso.

Código: mantenha uma cópia do repositório privado. Dados: exporte em **Mais → Banco de dados → Gerenciar → Configurações → Exportar dados**. Arquivos não são copiados para o GitHub: mantenha os originais em backup separado. Nunca exporte dados de alunos para o repositório.
