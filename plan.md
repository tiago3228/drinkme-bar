# Plano — PWA DrinkMe Bar

## Objetivo

Adicionar uma experiência instalável ao projeto existente DrinkMe Bar, preservando as rotas, autenticação, área do aluno, painel administrativo, Supabase e identidade visual atuais.

## Implementação

- Declarar um manifest próprio em `public/manifest.webmanifest`, com nome DrinkMe Bar, nome curto DrinkMe, abertura standalone, escopo `/` e cores carvão/âmbar.
- Criar ícones vetoriais e rasterizados com uma taça de coquetel dourada sobre fundo grafite, sem texto, incluindo variantes 192x192, 512x512, maskable e Apple touch icon.
- Registrar `public/sw.js` somente para cache de ícones, manifest, favicon e assets estáticos públicos do próprio site. Navegações, APIs, Supabase, sessões, vídeos, materiais e URLs assinadas nunca entram no cache.
- Adicionar no shell raiz os metadados PWA, o link do manifest, Apple Web App e o registro do service worker.
- Criar um convite não bloqueante de instalação que use `beforeinstallprompt` em Android/Chrome/Edge, orientação específica para iPhone/iPad e instruções de atalho quando não houver prompt nativo.
- Respeitar modo standalone, escolha de dispensa por período limitado e ausência de armazenamento de credenciais ou tokens.

## Design

- **Movimento:** hospitalidade editorial premium, com contraste carvão/âmbar e detalhes de metal escovado.
- **Princípios:** discreto, legível, não intrusivo e consistente com a interface DrinkMe existente.
- **Paleta:** fundo carvão profundo para reforçar a marca; âmbar como sinal de ação e sofisticação; off-white para leitura.
- **Interação:** o convite aparece após a primeira renderização, não bloqueia a navegação e oferece uma saída clara.
- **Ícone:** taça de coquetel minimalista, silhueta forte em tamanhos pequenos, sem texto e com fundo escuro.

## Estrutura

- `public/manifest.webmanifest`: contrato de instalação.
- `public/sw.js`: cache público restrito.
- `public/icons/`: ícones da aplicação.
- `src/features/pwa-install-prompt.tsx`: experiência de instalação.
- `src/routes/__root.tsx`: metadados, registro e montagem do prompt.
- `src/styles.css`: estilos responsivos do convite.

## Gestão de alunos e comunidade

Na aba Configurações, manter o convite de usuários existente e oferecer um atalho à lista de contas da aba Alunos, na qual clique direito e botão de ações acessível permitem promover/rebaixar entre aluno e admin master, editar nome/email e excluir com confirmação. Todos os papéis `admin` são master. As funções de servidor revalidam o papel admin e impedem autoexclusão/rebaixamento.

A área autenticada do aluno ganha mural com texto, foto opcional, autoria e comentários. Autores removem o próprio conteúdo; qualquer admin pode moderar. Feed e publicações usam RLS; fotos são privadas, JPEG/PNG/WebP até 5 MB, no máximo 50 armazenadas por conta, URLs temporárias de uma hora, 30 posts e 100 comentários por janela de 24 horas.

Implementação: `src/features/community-page.tsx`, `community.functions.ts`, `community.database-types.ts` e `member-admin.functions.ts`; migração `drizzle/migrations/0007_community_and_member_management.sql` e estilos/testes correspondentes. Manter os tipos Supabase gerados intactos. Após push, aplicar a migração pelo Lovable antes do uso, pois o repositório não automatiza alterações de schema.
