# TODO — PWA DrinkMe Bar

- [ ] Disponibilizar `manifest.webmanifest` com nome DrinkMe Bar, nome curto DrinkMe, ícones, `display: standalone`, `start_url` `/`, `scope` `/`, orientação e cores carvão/âmbar.
- [ ] Criar ícones 192x192, 512x512, maskable e Apple touch icon com taça de coquetel dourada, fundo escuro, sem texto e sem emoji.
- [ ] Registrar service worker compatível com a aplicação atual e limitar o cache a manifest, favicon, ícones e recursos estáticos públicos; nunca armazenar sessão, tokens, respostas privadas, rotas autenticadas, vídeos, materiais ou URLs assinadas.
- [ ] Exibir convite não bloqueante com o texto “Tenha o DrinkMe sempre com você!” e botão “ADICIONAR À TELA INICIAL”, sem repetição a cada navegação e sem aparecer em modo standalone.
- [ ] Usar `beforeinstallprompt` quando disponível e confirmar o resultado real da decisão do usuário.
- [ ] Exibir orientação específica para iPhone/iPad usando Compartilhar → Adicionar à Tela de Início.
- [ ] Oferecer orientação para computador quando não houver instalação nativa, sem prometer criação automática de atalho.
- [ ] Preservar autenticação, redirecionamentos e comportamento normal do site sem instalação.
- [ ] Validar manifest, build, testes automatizados e ausência de cache de conteúdo privado.

## Gestão de alunos e comunidade

- [x] No painel, mostrar ações acessíveis para contas existentes: elevar/rebaixar papel admin master, editar nome/email e excluir com confirmação; a conta atual não pode se excluir nem retirar seu próprio acesso. As Configurações oferecem atalho à lista de contas na aba Alunos.
- [x] No painel `/admin`, disponibilizar aba Comunidade para o administrador ver e remover publicações e comentários, sem sair do painel.
- [x] Na área do aluno, permitir publicações de texto/foto e comentários; autores podem remover o próprio conteúdo e admins moderar.
- [x] Bloquear termos ofensivos em formulários de publicações e comentários e nas funções autenticadas do servidor; normalizar caixa, acentos e pontuação.
- [x] Entregar SQL autônomo e reexecutável para triggers de posts/comentários no arquivo `docs/sql/community_offensive_language_trigger.sql`; ele não cria tabelas nem altera dados existentes.
- [ ] Aplicar o SQL manualmente no Lovable para impedir bypass via REST; nenhum SQL foi executado neste ambiente.
- [x] Aplicar RLS e fotos privadas JPEG/PNG/WebP de até 5 MB, no máximo 50 imagens por conta; limitar a 30 publicações e 100 comentários por janela de 24 horas e assinar URLs de imagem por uma hora.
- [x] Exibir mensagens de upload acionáveis para bucket ausente, recusa de permissões/quota, tamanho e formato da foto.
- [x] Verificar Prettier, ESLint direcionado aos arquivos da feature, 29 testes, `tsc --noEmit`, build de produção e `drizzle-kit check`. A migração foi revisada estaticamente, mas não aplicada neste ambiente.
- [x] Fazer commit e push da feature (`ab375f5`).
- [x] Tornar a migration 0007 reexecutável após execução parcial sem apagar tabelas ou registros existentes.
- [ ] Aplicar a migração no Lovable; o GitHub não publica o schema automaticamente.

## Galeria pública de drinks

- [x] Adicionar botão/entrada “Galeria” na home e rota pública acessível sem login ou compra de curso.
- [x] Permitir que admins publiquem foto com título e descrição, editem os dados e retirem itens publicados no `/admin`.
- [x] Guardar título/descrição em `site_settings.home.gallery_items` e usar `resources`/bucket privado `course-media`, sem criar schema ou bucket público.
- [x] Garantir leitura pública apenas de itens configurados e fotos explicitamente públicas assinadas no servidor; escritas e gestão restritas a admin.
- [x] Validar por testes locais sem gravar na base compartilhada: 29 testes, TypeScript, ESLint, build e checagem Drizzle concluídos.
