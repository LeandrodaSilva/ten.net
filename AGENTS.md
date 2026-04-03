# AGENTS.md

This file provides guidance to Codex when working with code in this repository.

## Project Overview

Ten.net (`@leproj/tennet`) is a minimalist, extensible web microframework for
TypeScript runtimes. File-based routing, HTML templating, nested layouts, and a
plugin system. Published to JSR.

## Project Vision & Purpose

- **Production-ready**: Reliable, performant, battle-tested microframework
- **Minimal core**: Routing, templating, and plugin infrastructure only
- **Multi-runtime (roadmap)**: Deno (current), Node.js (planned)
- **Extensible**: Abstract `Plugin` class and `AdminPluginLike` interface
- **Self-contained binary**: Compile app into a single deployable binary with
  AES-256-GCM encryption

## Plugin Ecosystem (separate repos)

- `@leproj/tennet-cms` — Admin dashboard, page builder, widgets, auth, RBAC
- `@leproj/tennet-blog` — Blog posts, categories, RSS/JSON feeds
- `@leproj/tennet-media` — Media library with chunked KV storage
- `@leproj/tennet-audit` — Audit logging with TTL

## Tech Stack

- **Runtime**: Deno 2.x
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

- `packages/core/src/mod.ts` — Public entry point, exports `{ Ten }`
- `packages/core/src/ten.ts` — Core framework class (server, routing, plugins)
- `packages/core/src/routerEngine.ts` — File-system route scanner and transpiler
- `packages/core/src/viewEngine.ts` — HTML template renderer with nested layouts
- `packages/core/src/paramsEngine.ts` — URL parameter extraction
- `packages/core/src/models/` — Route, Plugin, Storage, Permission,
  WidgetResolver
- `packages/core/src/routing/` — Dynamic route registry, dynamic page handler
- `packages/core/src/utils/` — Utility functions
- `packages/core/src/build/` — Build system: collector, code generator, crypto
- `packages/core/src/embedded/` — Embedded router engine for compiled binaries
- `packages/core/src/middleware/` — Middleware type definition
- `packages/core/src/assets/` — Static assets (favicon, document.html)
- `src/bench/` — Benchmarks with history tracking
- `src/test/` — Core tests (~30 test files)
- `app/` — Test fixtures for build/router tests

## Architecture

**File-based routing**: The `app/` directory maps to URL routes.

**Template engine**: `{{key}}` placeholders populated from route handler JSON.

**Build system**: Compiles app into encrypted binary via `deno compile`.

**Plugin system**: Extend `Plugin` class. External plugins register via
`AdminPluginLike` interface and `useAdmin()`.

## Code Conventions

- Use explicit `.ts` file extensions in all imports (Deno requirement)
- Conventional Commits: `feat:`, `fix:`, `refactor:`, `style:`, `ci:`, `test:`
- Format with `deno fmt` before committing

## Testing

Tests are in `src/test/` (~30 test files). Uses `describe/it` from
`@std/testing/bdd`. Assertions from `@std/assert`.

## JSR Entrypoints

- `.` → `packages/core/src/mod.ts`
- `./cli` → `packages/core/src/cli.ts`
- `./build` → `packages/core/src/build/build.ts`
- `./build/manifest` → `packages/core/src/build/manifest.ts`
- `./build/crypto` → `packages/core/src/build/crypto.ts`
- `./assets/favicon` → `packages/core/src/assets/faviconData.ts`
