# Relatorio E2E — Admin Ten.net

**Data**: 2026-04-02 **Suite**: 220 testes passando | 0 falhas | 1 ignorado
**Tempo**: ~65s (inclui Puppeteer browser tests)

## Links Quebrados

| Rota                       | Status  | Onde aparece                   | Prioridade                                         |
| -------------------------- | ------- | ------------------------------ | -------------------------------------------------- |
| ~~`/admin/profile`~~       | ~~404~~ | ~~Header/dropdown do usuario~~ | ~~Media~~ **CORRIGIDO 2026-04-02** (link removido) |
| ~~`/admin/plugins/pages`~~ | ~~404~~ | ~~Dashboard cards~~            | ~~Alta~~ **CORRIGIDO 2026-04-02**                  |
| ~~`/admin/plugins/posts`~~ | ~~404~~ | ~~Dashboard cards~~            | ~~Alta~~ **CORRIGIDO 2026-04-02**                  |
| ~~`/admin/plugins/media`~~ | ~~404~~ | ~~Dashboard cards~~            | ~~Alta~~ **CORRIGIDO 2026-04-02**                  |
| ~~`/admin/plugins/users`~~ | ~~404~~ | ~~Dashboard cards~~            | ~~Alta~~ **CORRIGIDO 2026-04-02**                  |

**Causa raiz**: O componente de dashboard stats (`HomeDashboardStats`) usa
resource names (`pages`, `posts`, `media`, `users`) nos links em vez dos plugin
slugs (`page-plugin`, `post-plugin`, `media-plugin`, `user-plugin`). O
mapeamento esta em `packages/admin/src/plugins/admin/crud.tsx` linhas 99-104.

**Sugestao de fix**: Corrigir os hrefs no componente de dashboard para usar os
slugs corretos dos plugins. Verificar se o componente renderiza os cards com
`/admin/plugins/${plugin.slug}` em vez de `/admin/plugins/${resourceName}`.

## Forms sem CSRF

Nenhum formulario sem CSRF encontrado. Todos os forms admin incluem
`<input type="hidden" name="_csrf">`. O page builder inclui
`<meta name="csrf-token">` para fetch requests JSON.

## Elementos Interativos com Problema

| Componente            | Problema                                             | Prioridade |
| --------------------- | ---------------------------------------------------- | ---------- |
| `/admin/profile` link | Link no header do admin aponta para rota inexistente | Media      |
| Dashboard stat cards  | Links nos cards de estatisticas usam nomes errados   | **Alta**   |

## Comportamento Inesperado

- **SettingsPlugin**: admin tem permissoes `["read", "update"]` mas o form
  `/admin/plugins/settings-plugin/new` (create) renderiza normalmente. O POST
  retorna 403 corretamente (RBAC bloqueia), mas o UX e confuso — o usuario pode
  preencher o form inteiro so para receber 403.

- **Viewer role settings**: viewer tem `settings: []` (array vazio), o que
  bloqueia ate o read. Isso impede que viewers vejam configuracoes, o que pode
  ser intencional mas vale confirmar.

## Cobertura de Rotas por Tipo

### Rotas testadas nesta sessao (novos testes)

| Rota                      | Metodo    | Status   | Arquivo                     |
| ------------------------- | --------- | -------- | --------------------------- |
| `/sitemap.xml`            | GET       | 200      | e2e-routes-coverage.test.ts |
| `/robots.txt`             | GET       | 200      | e2e-routes-coverage.test.ts |
| `/admin/preview/{id}`     | GET       | 200, 404 | e2e-routes-coverage.test.ts |
| `/blog/category/{slug}`   | GET       | 200, 404 | e2e-routes-coverage.test.ts |
| RBAC editor (7 cenarios)  | GET, POST | 200, 403 | e2e-routes-coverage.test.ts |
| RBAC viewer (6 cenarios)  | GET, POST | 200, 403 | e2e-routes-coverage.test.ts |
| Validation edge cases (6) | POST      | 400      | e2e-routes-coverage.test.ts |
| Settings delete           | POST      | 403      | e2e-admin.test.ts           |
| Media search/pagination   | GET       | 200      | e2e-admin.test.ts           |
| Dashboard link checker    | GET       | 200, 404 | e2e-admin.test.ts           |

### Cobertura total de rotas (70 rotas)

- **Auth** (3/3): login GET, login POST, logout POST
- **Dashboard** (2/2): GET /admin, GET /admin/favicon.ico
- **Plugin CRUD** (45/45): all 9 plugins x 5 routes
- **Preview** (1/1): GET /admin/preview/{id}
- **Builder** (8/8): builder UI, preview, widgets CRUD, reorder, duplicate
- **Media** (5/5): list, upload, picker, delete, serve
- **Blog** (4/4): list, RSS, category, post
- **SEO** (2/2): sitemap.xml, robots.txt

**Total: 70/70 rotas cobertas**

## Recomendacoes de Correcao

1. **[Alta]** Corrigir hrefs nos dashboard stat cards — usar `plugin.slug` em
   vez de resource names. Arquivo: `packages/admin/src/plugins/admin/crud.tsx`
   ou componente que renderiza `HomeDashboardStats`.

2. **[Media]** Implementar rota `/admin/profile` ou remover o link do layout
   admin. Arquivo: `packages/admin/src/layout/dashboard.tsx` (provavelmente).

3. **[Baixa]** Considerar esconder o botao "New" no SettingsPlugin list quando o
   usuario nao tem permissao de `create` — evita UX confuso de form que sempre
   retorna 403.

4. **[Baixa]** Revisar permissoes do viewer para settings — confirmar se
   `settings: []` (sem read) e intencional.
