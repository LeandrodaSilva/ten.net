# packages/admin

Admin panel CMS: React SSR dashboard with auth, CRUD, page builder, blog, media
library, and RBAC.

## Key Files

- `src/plugins/adminPlugin.tsx` — Orchestrator (166 loc). `init()` sets up
  storage, auth, routes, returns
  `{ routes, middlewares, dynamicRegistry,
  blogRegistry, kv }`
- `src/app.tsx` — React SSR setup. `renderAdminPage()` and `renderBuilderPage()`
  use `renderToString()` + `<!DOCTYPE html>` prefix
- `src/plugins/admin/crud.tsx` — CRUD routes (538 loc). List, create, edit,
  delete for all plugins. 20 items/page
- `src/plugins/admin/builder.ts` — Page builder routes (599 loc). Widget CRUD
  API + preview
- `src/plugins/admin/blog.ts` — Public blog routes: /blog, /blog/:slug,
  RSS/sitemap
- `src/plugins/admin/media.ts` — Media upload/serve routes, uses MediaStore from
  widgets package

## Subsystems

- **auth/** — PBKDF2-SHA256 password hashing, cookie-based sessions
  (`__tennet_sid`), CSRF tokens, RBAC with 3 default roles (Admin, Editor,
  Viewer), security headers
- **storage/** — Deno KV implementations: `denoKvStorage` (plugins),
  `denoKvSessionStore` (TTL sessions), `denoKvUserStore`. Schema migrations
  (v1→v3)
- **plugins/** — 10 content plugins: admin, page, posts, categories, media,
  users, groups, roles, settings, auditLog. All extend `Plugin` from core
- **components/** — 30 React components: CRUD (list, form, table), page builder
  (editor, widget-form, palette), media (library, picker, upload), RBAC (roles,
  permissions-matrix)
- **layout/** — `dashboard.tsx` (sidebar + header), `builder-layout.tsx` (page
  builder wrapper)

## Patterns

- Content plugins: extend `Plugin`, define `model` (field types), override
  `validate()` (sync) and `validateAsync()` (async, e.g. slug uniqueness)
- React SSR: functional components + Tailwind CSS v4 via CDN (browser compiler)
- Auth middleware: extracts resource from URL path, maps HTTP method to
  permission, checks role. Session stored in `WeakMap<Request, Session>`
- CRUD flow: validate sync → validate async → save to storage → redirect
- `AdminContext` interface: shared state passed to all admin sub-modules

## Gotchas

- Schema migrations in `storage/schema.ts` — current version: 3. Migrations run
  on every init (idempotent)
- `AuditLogPlugin` is read-only — blocks writes in CRUD routes
- `seedDefaultAdmin()` creates `admin/admin` user if no users exist
- Dynamic pages skip admin layouts (`route.isAdmin` check prevents wrapping)
- Blog routes are public (no auth middleware) — served under /blog/*
- Session cleanup: `deleteByUserId()` removes all sessions atomically via KV
  index

## Dependencies

`@leproj/tennet` (Plugin, Route, Storage, registries), `@leproj/tennet-widgets`
(WidgetStore, MediaStore, WidgetRegistry), `react`, `react-dom`.
