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
