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
- **Admin panel for non-developers (roadmap)**: `/admin` React SSR dashboard
  designed for marketing teams and end-users to manage the production
  application. Currently in early development.

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

- `src/mod.ts` — Public entry point, exports `{ Ten }`
- `src/ten.ts` — Core framework class (server, routing, plugin registration)
- `src/routerEngine.ts` — File-system route scanner and transpiler
- `src/viewEngine.ts` — HTML template renderer with nested layouts
- `src/paramsEngine.ts` — URL parameter extraction
- `src/models/` — Route and Plugin data models
- `src/plugins/` — Built-in plugins (admin, page)
- `src/utils/` — Utility functions (regex matching, transpilation, slug
  conversion, layout discovery)
- `src/build/` — Build system: collector, code generator, manifest types, crypto
  (AES-256-GCM), CLI entry point
- `src/embedded/` — Embedded router engine for compiled binaries
- `src/admin/` — Admin panel React components (SSR with renderToString)
- `src/bench/` — Benchmarks with history tracking and regression thresholds
- `src/test/` — All tests (25 test files)
- `app/` — Demo application using file-based routes
- `demo.ts` — Dev server entry point (used by `deno task dev`)

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
AES-256-GCM encryption for code protection.

**Plugin system**: Extend abstract `Plugin` class with `name`, `description`,
`model`. Plugins auto-register admin routes and appear in the admin dashboard.

## Code Conventions

- Use explicit `.ts`/`.tsx` file extensions in all imports (Deno requirement)
- Conventional Commits: `feat:`, `fix:`, `refactor:`, `style:`, `ci:`, `test:`
- Format with `deno fmt` before committing
- React components: functional components with Tailwind CSS classes

## Testing

Tests are in `src/test/` (25 test files). Uses `Deno.test()` and `describe/it`
from `@std/testing/bdd`. Assertions from `@std/assert` (preferred) and
`@deno-assert` (legacy). Snapshot tests use `assertSnapshot` from
`@std/testing/snapshot`, stored in `src/test/__snapshots__/`. CI enforces a
**90% coverage threshold** via LCOV analysis.

## Release Process

Tag with `v*` pattern → CI runs checks → publishes to JSR via `deno publish` →
creates GitHub Release.

## JSR Entrypoints

- `.` → `src/mod.ts` — Main entry, exports `{ Ten }`
- `./cli` → `src/cli.ts` — CLI entry point
- `./build` → `src/build/build.ts` — Build system
- `./build/manifest` → `src/build/manifest.ts` — Build manifest types
  (`EmbeddedRoute`, `AppManifest`)
- `./build/crypto` → `src/build/crypto.ts` — AES-256-GCM encryption utilities

## Gotchas

- Most tasks require `--unstable-raw-imports` flag (already configured in
  `deno.json` tasks)
- `deno task check` has a double-space typo in deno.json but works correctly
- `deno task build` uses `src/build/buildCommand.ts` (not `build.ts`) as entry
