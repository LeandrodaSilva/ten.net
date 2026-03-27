# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
code in this repository.

## Project Overview

Ten.net (`@leproj/tennet`) is a minimalist Deno web microframework with
file-based routing, HTML templating, nested layouts, and a plugin system.
Published to JSR.

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
- `src/admin/` — Admin panel React components (SSR with renderToString)
- `src/test/` — All tests
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
`Deno.bundle()` and loaded as dynamic data URI imports.

**Plugin system**: Extend abstract `Plugin` class with `name`, `description`,
`model`. Plugins auto-register admin routes and appear in the admin dashboard.

## Code Conventions

- Use explicit `.ts`/`.tsx` file extensions in all imports (Deno requirement)
- Conventional Commits: `feat:`, `fix:`, `refactor:`, `style:`, `ci:`, `test:`
- Format with `deno fmt` before committing
- React components: functional components with Tailwind CSS classes

## Testing

Tests are in `src/test/`. Uses `Deno.test()` and `describe/it` from
`@std/testing/bdd`. Assertions from `@std/assert` (preferred) and `@deno-assert`
(legacy). Snapshot tests use `assertSnapshot` from `@std/testing/snapshot`,
stored in `src/test/__snapshots__/`.

## Release Process

Tag with `v*` pattern → CI runs checks → publishes to JSR via `deno publish` →
creates GitHub Release.
