# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
code in this repository.

## Project Overview

Ten.net (`@leproj/tennet`) is a minimalist, extensible web microframework for
TypeScript runtimes. File-based routing, HTML templating, nested layouts, and a
plugin system. Published to JSR.

## Project Vision & Purpose

- **Production-ready**: Reliable, performant, battle-tested microframework
- **Minimal core**: Routing, templating, and plugin infrastructure only — no
  admin, CMS, or UI bundled in core
- **Multi-runtime (roadmap)**: Designed to support Deno (current) and Node.js
  (planned)
- **Extensible**: Abstract `Plugin` class and `AdminPluginLike` interface for
  external plugins
- **Self-contained binary**: Compile entire app into a single deployable binary
  with AES-256-GCM encryption
- **Maximum simplicity**: Directory-based routing, HTML templates, `.ts` route
  files. No decorators, no configuration ceremony

## Roadmap

- **Reliability** — error handling, graceful shutdown, connection draining
- **Performance** — route caching, template precompilation, zero-allocation hot
  paths
- **Flexibility** — middleware composition, custom renderers, response
  interceptors
- **Extensibility** — lifecycle hooks, event system, plugin communication
- **Node.js support** — run the same app on Node.js in addition to Deno

## Related Packages

The CMS ecosystem is split into separate repositories and JSR packages:

- `@leproj/tennet-cms` — Admin dashboard, page builder, widgets, auth, RBAC
- `@leproj/tennet-blog` — Blog posts, categories, RSS/JSON feeds
- `@leproj/tennet-media` — Media library with chunked KV storage
- `@leproj/tennet-audit` — Audit logging with TTL

## Tech Stack

- **Runtime**: Deno 2.x (NOT Node.js — no npm, no package.json)
- **Language**: TypeScript
- **Package registry**: JSR (`@leproj/tennet`)

## Commands

```bash
deno task test       # Run all tests in parallel
deno task coverage   # Run tests with coverage
deno task fmt        # Format code
deno task lint       # Lint code
deno task check      # Type check all TypeScript files
deno task build      # Compile app into a single self-contained binary
deno task bench      # Run benchmarks with history tracking
```

## Project Structure

**`packages/core/src/`** — Core framework:

- `mod.ts` — Public entry point, exports `{ Ten }`
- `ten.ts` — Core framework class (server, routing, plugin registration)
- `routerEngine.ts` — File-system route scanner and transpiler
- `viewEngine.ts` — HTML template renderer with nested layouts
- `paramsEngine.ts` — URL parameter extraction
- `models/` — Route, Plugin, Storage, Permission, WidgetResolver data models
- `routing/` — Dynamic route registry, blog route registry, dynamic page handler
- `utils/` — Utility functions (regex matching, transpilation, slug conversion,
  layout discovery)
- `build/` — Build system: collector, code generator, manifest types, crypto
  (AES-256-GCM), CLI entry point
- `embedded/` — Embedded router engine for compiled binaries
- `middleware/` — Middleware type definition
- `assets/` — Static assets (favicon data)

**Other:**

- `app/` — Test fixtures (minimal app for build/router tests)
- `src/test/` — Core framework tests (~30 test files)
- `src/bench/` — Benchmarks with history tracking and regression thresholds

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
`model`. The `AdminPluginLike` interface allows external admin plugins (like
`@leproj/tennet-cms`) to register routes and middlewares. The
`WidgetPageRenderer` type allows widget resolution to be injected externally.

## Code Conventions

- Use explicit `.ts` file extensions in all imports (Deno requirement)
- Conventional Commits: `feat:`, `fix:`, `refactor:`, `style:`, `ci:`, `test:`
- Format with `deno fmt` before committing

## Environment Setup

- Requires Deno 2.x with `--unstable-kv` and `--unstable-raw-imports` flags
  (already configured in `deno.json` tasks)
- No environment variables required for development

## Testing

Tests are in `src/test/` (~30 test files, core only). Uses `Deno.test()` and
`describe/it` from `@std/testing/bdd`. Assertions from `@std/assert` (preferred)
and `@deno-assert` (legacy). Snapshot tests use `assertSnapshot` from
`@std/testing/snapshot`, stored in `src/test/__snapshots__/`.

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

## Gotchas

- Most tasks require `--unstable-raw-imports` flag (already configured in
  `deno.json` tasks)
- `deno task check` has a double-space typo in deno.json but works correctly
- `deno task build` uses `packages/core/src/build/buildCommand.ts` (not
  `build.ts`) as entry
- `app/` directory contains test fixtures, not a production demo app
