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
- [x] Na área do aluno, permitir publicações de texto/foto e comentários; autores podem remover o próprio conteúdo e admins moderar.
- [x] Aplicar RLS e fotos privadas JPEG/PNG/WebP de até 5 MB, no máximo 50 imagens por conta; limitar a 30 publicações e 100 comentários por janela de 24 horas e assinar URLs de imagem por uma hora.
- [x] Exibir mensagens de upload acionáveis para bucket ausente, recusa de permissões/quota, tamanho e formato da foto.
- [x] Verificar Prettier, ESLint direcionado aos arquivos da feature, 21 testes, build de produção e `drizzle-kit check`. A migração foi revisada estaticamente, mas não aplicada neste ambiente.
- [x] Fazer commit e push da feature (`ab375f5`).
- [ ] Aplicar a migração no Lovable; o GitHub não publica o schema automaticamente.
