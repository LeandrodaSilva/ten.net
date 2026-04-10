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
  AES-256-GCM obfuscation packaging

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

- `src/mod.ts` — Public entry point, exports `{ Ten }`
- `src/ten.ts` — Deno adapter class (server, routing, plugins)
- `src/core/` — Runtime-agnostic core (`TenCore`, interfaces)
- `src/routerEngine.ts` — File-system route scanner and transpiler
- `src/viewEngine.ts` — HTML template renderer with nested layouts
- `src/paramsEngine.ts` — URL parameter extraction
- `src/models/` — Route, Plugin, Storage, Permission, WidgetResolver
- `src/routing/` — Dynamic route registry, dynamic page handler
- `src/utils/` — Utility functions
- `src/build/` — Build system: collector, code generator, crypto
- `src/embedded/` — Embedded router engine for compiled binaries
- `src/middleware/` — Middleware type definition
- `src/assets/` — Static assets (favicon, document.html)
- `src/bench/` — Benchmarks with history tracking
- `_test_/` — Core tests
- `example/http/app/` — Test fixtures for build/router tests

## Architecture

**File-based routing**: The `app/` directory maps to URL routes.

**Template engine**: `{{key}}` placeholders populated from route handler JSON.

**Build system**: Compiles app into an obfuscated binary via `deno compile`.

**Plugin system**: Extend `Plugin` class. External plugins register via
`AdminPluginLike` interface and `useAdmin()`.

## Code Conventions

- Use explicit `.ts` file extensions in all imports (Deno requirement)
- Conventional Commits: `feat:`, `fix:`, `refactor:`, `style:`, `ci:`, `test:`
- Format with `deno fmt` before committing

## Testing

Tests are in `_test_/`. Uses `describe/it` from `@std/testing/bdd`. Assertions
from `@std/assert`.

## JSR Entrypoints

- `.` → `src/mod.ts`
- `./core` → `src/core/mod.ts`
- `./cli` → `src/cli.ts`
- `./build` → `src/build/build.ts`
- `./build/manifest` → `src/build/manifest.ts`
- `./build/crypto` → `src/build/crypto.ts`
- `./sw` → `src/sw/mod.ts`
- `./storage/indexeddb` → `src/storage/mod.ts`
- `./assets/favicon` → `src/assets/faviconData.ts`
