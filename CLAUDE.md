# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
code in this repository.

## Project Overview

Ten.net (`@leproj/tennet`) is a minimalist Deno web microframework with
file-based routing, HTML templating, nested layouts, and a plugin system.
Published to JSR.

## Project Vision & Purpose

- **Self-contained binary**: The framework compiles the entire application
  (server, routes, templates, static assets) into a single deployable binary. No
  runtime dependencies required in production.
- **Code protection (roadmap)**: Future obfuscation and encryption to prevent
  reverse engineering of distributed application binaries.
- **Maximum simplicity**: Directory-based routing, HTML templates, `.ts` route
  files. No decorators, no configuration ceremony, no boilerplate.
- **Plugin extensibility**: Abstract `Plugin` class with auto-registered admin
  routes. Users extend functionality without modifying the core.
- **Admin panel for non-developers**: `/admin` React SSR dashboard designed for
  marketing teams and end-users to manage the production application. Available
  since v0.8.0 with 10 built-in plugins (posts, pages, categories, media
  library, users, groups, roles, settings, audit log, admin dashboard), page
  builder, media library, and RBAC.

## Tech Stack

- **Runtime**: Deno 2.x (NOT Node.js — no npm, no package.json)
- **Language**: TypeScript with TSX for React components
- **UI**: React 19 (server-side rendering only via `renderToString`), Tailwind
  CSS (via CDN)
- **Package registry**: JSR (`@leproj/tennet`)

## Commands

```bash
deno task dev        # Start dev server (with --watch, --inspect, file watcher)
deno task test       # Run all tests in parallel
deno task coverage   # Run tests with coverage
deno task fmt        # Format code
deno task lint       # Lint code
deno task check      # Type check all TypeScript files
deno task build      # Compile app into a single self-contained binary
deno task bench      # Run benchmarks with history tracking
```

## Project Structure

This is a monorepo with three packages:

**`packages/core/src/`** — Core framework:

- `mod.ts` — Public entry point, exports `{ Ten }`
- `ten.ts` — Core framework class (server, routing, plugin registration)
- `routerEngine.ts` — File-system route scanner and transpiler
- `viewEngine.ts` — HTML template renderer with nested layouts
- `paramsEngine.ts` — URL parameter extraction
- `models/` — Route, Plugin, Storage data models
- `routing/` — Dynamic route registry, blog route registry, page/widget handlers
- `utils/` — Utility functions (regex matching, transpilation, slug conversion,
  layout discovery)
- `build/` — Build system: collector, code generator, manifest types, crypto
  (AES-256-GCM), CLI entry point
- `embedded/` — Embedded router engine for compiled binaries
- `middleware/` — Auth, CSRF, security headers middleware
- `assets/` — Static assets (favicon data)

**`packages/admin/src/`** — Admin panel (React SSR):

- `app.tsx` — Admin app root component
- `plugins/` — 10 built-in plugins: adminPlugin, pagePlugin, postsPlugin,
  categoriesPlugin, mediaPlugin, usersPlugin, groupsPlugin, rolesPlugin,
  settingsPlugin, auditLogPlugin
- `components/` — Shared UI components (page builder, media library, CRUD, etc.)
- `auth/` — Authentication handlers, session store, user store, password hasher
- `storage/` — Deno KV-backed storage implementations
- `layout/` — Admin layout components

**`packages/widgets/src/`** — Built-in widgets:

- `builtins/` — 10 widgets: hero, richText, image, gallery, columns, ctaButton,
  html, spacer, embed, contactForm
- `widgetRegistry.ts` — Widget registration and lookup
- `widgetStore.ts`, `widgetPermissionsStore.ts`, `widgetAuditLogger.ts` — Widget
  data and audit infrastructure
- `mediaStore.ts` — Media storage for widgets
- `types.ts` — Widget type definitions

**Other:**

- `app/demo.ts` — Dev server entry point (used by `deno task dev`)
- `src/test/` — All tests (101 test files)
- `src/bench/` — Benchmarks with history tracking and regression thresholds
- `app/` — Demo application using file-based routes

## Architecture

**File-based routing**: The `app/` directory maps to URL routes. Each directory
can have:

- `route.ts` — exports HTTP method handlers (`GET`, `POST`, etc.)
- `page.html` — HTML template with `{{variable}}` mustache-style placeholders
- `layout.html` — wrapping layout (nests via `{{content}}`)
- `document.html` — root HTML wrapper (app root only)
- `[param]/` — dynamic route segments

**Template engine**: Route handler JSON responses populate `{{key}}`
placeholders in page templates. Layouts nest hierarchically from root to leaf
using `{{content}}`.

**Route transpilation**: TypeScript route files are transpiled at startup via
`@deno/emit` and loaded as dynamic data URI imports.

**Build system**: `deno task build` compiles the entire application into a
single binary. The collector scans `app/`, transpiles routes, and gathers assets
into an `AppManifest`. The code generator produces a self-contained TypeScript
file that uses `embeddedRouterEngine` instead of filesystem scanning. Optional
AES-256-GCM encryption for code protection. Entry point:
`packages/core/src/build/buildCommand.ts`.

**Plugin system**: Extend abstract `Plugin` class with `name`, `description`,
`model`. Plugins auto-register admin routes and appear in the admin dashboard.
The `packages/admin` package ships 10 built-in plugins; the framework core
(`packages/core`) handles registration and routing.

## Code Conventions

- Use explicit `.ts`/`.tsx` file extensions in all imports (Deno requirement)
- Conventional Commits: `feat:`, `fix:`, `refactor:`, `style:`, `ci:`, `test:`
- Format with `deno fmt` before committing
- React components: functional components with Tailwind CSS classes

## Environment Setup

- Requires Deno 2.x with `--unstable-kv` and `--unstable-raw-imports` flags
  (already configured in `deno.json` tasks)
- No environment variables required for development
- `deno task dev` starts server with file watcher and inspector

## Testing

Tests are in `src/test/` (101 test files). Uses `Deno.test()` and `describe/it`
from `@std/testing/bdd`. Assertions from `@std/assert` (preferred) and
`@deno-assert` (legacy). Snapshot tests use `assertSnapshot` from
`@std/testing/snapshot`, stored in `src/test/__snapshots__/`. CI enforces a
**90% coverage threshold** via LCOV analysis.

## Release Process

Tag with `v*` pattern → CI runs checks → publishes to JSR via `deno publish` →
creates GitHub Release.

## JSR Entrypoints

- `.` → `packages/core/src/mod.ts` — Main entry, exports `{ Ten }`
- `./cli` → `packages/core/src/cli.ts` — CLI entry point
- `./build` → `packages/core/src/build/build.ts` — Build system
- `./build/manifest` → `packages/core/src/build/manifest.ts` — Build manifest
  types (`EmbeddedRoute`, `AppManifest`)
- `./build/crypto` → `packages/core/src/build/crypto.ts` — AES-256-GCM
  encryption utilities
- `./assets/favicon` → `packages/core/src/assets/faviconData.ts` — Favicon data
- `./admin` → `packages/admin/src/mod.ts` — Admin panel
- `./widgets` → `packages/widgets/src/mod.ts` — Built-in widgets

## Gotchas

- Most tasks require `--unstable-raw-imports` flag (already configured in
  `deno.json` tasks)
- `deno task check` has a double-space typo in deno.json but works correctly
- `deno task build` uses `packages/core/src/build/buildCommand.ts` (not
  `build.ts`) as entry
