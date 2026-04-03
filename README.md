# Ten.net

[![CI](https://github.com/LeandrodaSilva/ten.net/actions/workflows/ci.yml/badge.svg)](https://github.com/LeandrodaSilva/ten.net/actions/workflows/ci.yml)
[![JSR](https://jsr.io/badges/@leproj/tennet)](https://jsr.io/@leproj/tennet)
[![JSR Score](https://jsr.io/badges/@leproj/tennet/score)](https://jsr.io/@leproj/tennet)
[![Coverage](https://img.shields.io/badge/coverage-%E2%89%A590%25-brightgreen)](https://github.com/LeandrodaSilva/ten.net/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A minimalist, extensible web microframework for TypeScript runtimes.

## Features

- **File-based routing** — directories in `app/` map directly to URL paths
- **HTML templating** — `{{mustache}}` placeholders populated from route handler
  data
- **Nested layouts** — `layout.html` and `document.html` wrap pages
  hierarchically
- **Dynamic route parameters** — `[param]/` directories for URL segments
- **Plugin system** — extensible architecture via abstract `Plugin` class and
  `AdminPluginLike` interface
- **Self-contained binary** — compile your entire app into a single deployable
  binary
- **Dev mode** — file watcher with automatic route reload

## Vision

Ten.net is a **production-ready microframework** focused on reliability,
performance, flexibility, and extensibility. The core is intentionally minimal —
advanced features like CMS, blog, media, and audit are available as independent
plugins.

### Design Principles

- **Minimal core** — routing, templating, and plugin infrastructure only
- **Production-ready** — reliable, performant, battle-tested
- **Extensible** — plugin system for adding any functionality
- **Multi-runtime** — designed to support multiple JS/TS runtimes

### Plugin Ecosystem

The admin panel and CMS features are separate packages:

| Package                                                       | Description                                        |
| ------------------------------------------------------------- | -------------------------------------------------- |
| [`@leproj/tennet-cms`](https://jsr.io/@leproj/tennet-cms)     | Admin dashboard, page builder, widgets, auth, RBAC |
| [`@leproj/tennet-blog`](https://jsr.io/@leproj/tennet-blog)   | Blog posts, categories, RSS/JSON feeds             |
| [`@leproj/tennet-media`](https://jsr.io/@leproj/tennet-media) | Media library with chunked KV storage              |
| [`@leproj/tennet-audit`](https://jsr.io/@leproj/tennet-audit) | Audit logging with TTL                             |

### Roadmap

- **Reliability** — comprehensive error handling, graceful shutdown, connection
  draining
- **Performance** — route caching, template precompilation, zero-allocation hot
  paths
- **Flexibility** — middleware composition, custom renderers, response
  interceptors
- **Extensibility** — lifecycle hooks, event system, plugin communication
- **Node.js runtime support** — run the same app on Node.js in addition to Deno
- **Code protection** — AES-256-GCM encryption for compiled binaries (available)

## Installation

```bash
deno add jsr:@leproj/tennet
```

Or import directly:

```ts
import { Ten } from "jsr:@leproj/tennet";
```

## Quick Start

Create a server entry point:

```ts
// main.ts
import { Ten } from "@leproj/tennet";

const app = Ten.net();
await app.start();
```

Create a route with a page template:

```ts
// app/hello/route.ts
export function GET(_req: Request): Response {
  return new Response(
    JSON.stringify({ name: "World" }),
    { headers: { "Content-Type": "application/json" } },
  );
}
```

```html
<!-- app/hello/page.html -->
<h1>Hello {{name}}!</h1>
```

Run the server:

```bash
deno run --allow-all --unstable-raw-imports main.ts
```

Visit `http://localhost:8000/hello` to see "Hello World!".

## File-Based Routing

The `app/` directory defines your routes. Each subdirectory can contain:

| File            | Purpose                                                             |
| --------------- | ------------------------------------------------------------------- |
| `route.ts`      | Exports HTTP method handlers (`GET`, `POST`, `PUT`, `DELETE`, etc.) |
| `page.html`     | HTML template with `{{placeholder}}` syntax                         |
| `layout.html`   | Wrapping layout — nests via `{{content}}`                           |
| `document.html` | Root HTML document (typically at `app/` root only)                  |

### Route types

| Structure                | Behavior                                                         |
| ------------------------ | ---------------------------------------------------------------- |
| `route.ts` + `page.html` | **View route** — GET renders the page with data from the handler |
| `route.ts` only          | **API route** — returns the raw Response from the handler        |
| `page.html` only         | **Static page** — renders the HTML as-is                         |

### Directory-to-URL mapping

```
app/
├── page.html                  → /
├── hello/
│   ├── route.ts               → /hello
│   └── page.html
├── form/
│   ├── route.ts               → /form (POST)
│   ├── page.html              → /form (GET)
│   └── congrats/
│       ├── route.ts           → /form/congrats
│       └── page.html
└── api/
    └── hello/
        ├── route.ts           → /api/hello
        └── [name]/
            └── route.ts       → /api/hello/:name
```

## Route Handlers

Route files export functions named after HTTP methods:

```ts
// app/api/hello/route.ts
export function GET(_req: Request): Response {
  return new Response("Hello World");
}
```

```ts
// app/form/route.ts
export async function POST(req: Request): Promise<Response> {
  const formData = await req.formData();
  const name = formData.get("name");
  return new Response(
    JSON.stringify({ name }),
    { status: 302, headers: { Location: `/form/congrats?name=${name}` } },
  );
}
```

## Dynamic Parameters

Use `[param]` directories for dynamic URL segments:

```ts
// app/api/hello/[name]/route.ts
export function GET(_req: Request, ctx: {
  params: { name: string };
}): Response {
  return new Response(
    JSON.stringify({ message: `Hello ${ctx.params.name}` }),
    { headers: { "Content-Type": "application/json" } },
  );
}
```

`GET /api/hello/John` returns `{ "message": "Hello John" }`.

## Templates

Page templates use `{{key}}` placeholders that are replaced with values from the
route handler's JSON response:

```html
<!-- app/hello/page.html -->
<h1>Hello {{name}}!</h1>
```

```ts
// app/hello/route.ts — returns { name: "Leandro" }
export function GET(_req: Request): Response {
  return new Response(
    JSON.stringify({ name: "Leandro" }),
    { headers: { "Content-Type": "application/json" } },
  );
}
```

Result: `<h1>Hello Leandro!</h1>`

## Layouts

### Document layout

Place a `document.html` at the `app/` root to define the outer HTML shell. Use
`{{content}}` as the injection point:

```html
<!-- app/document.html -->
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <title>My App</title>
  </head>
  <body>
    {{content}}
  </body>
</html>
```

If no `document.html` is provided, a default one is used.

### Nested layouts

Add `layout.html` files at any directory level. They nest from root to leaf,
each using `{{content}}` to wrap inner content:

```
app/
├── layout.html          ← outermost layout
├── dashboard/
│   ├── layout.html      ← wraps dashboard pages
│   └── settings/
│       └── page.html    ← innermost content
```

## Plugins

Extend Ten.net with plugins:

```ts
import { Ten } from "@leproj/tennet";

const app = Ten.net();
await app.useAdmin(myAdminPlugin); // register an admin plugin
await app.start();
```

With the CMS plugin:

```ts
import { Ten } from "@leproj/tennet";
import { AdminPlugin, PagePlugin } from "@leproj/tennet-cms";

const app = Ten.net();
await app.useAdmin(new AdminPlugin({ plugins: [PagePlugin] }));
await app.start();
```

## Building for Production

Compile your entire application — routes, templates, and static assets — into a
single encrypted binary:

1. Collects all routes, layouts, and assets from `app/`
2. Compresses with gzip
3. Encrypts with AES-256-GCM (PBKDF2-derived key)
4. Compiles into a standalone Deno binary via `deno compile`

The resulting binary has **zero runtime dependencies**.

### CLI

```bash
deno run -A jsr:@leproj/tennet/cli build
```

Add as a task:

```json
{
  "tasks": {
    "build": "deno run -A jsr:@leproj/tennet/cli build"
  }
}
```

#### CLI options

| Option          | Default    | Description                                   |
| --------------- | ---------- | --------------------------------------------- |
| `--secret`      | (auto)     | Encryption secret (auto-generated if omitted) |
| `--output`      | `./dist`   | Output directory                              |
| `--app-path`    | `./app`    | Application root directory                    |
| `--public-path` | `./public` | Public/static assets directory                |
| `--no-compile`  | `false`    | Generate compiled TS only, skip binary        |

### Programmatic API

```ts
import { Ten } from "@leproj/tennet";

const result = await Ten.build({
  appPath: "./app",
  output: "./dist",
  secret: Deno.env.get("BUILD_SECRET"),
});

console.log(`Built ${result.stats.routes} routes`);
```

## Development

```bash
deno task test       # run tests
deno task bench:run  # run benchmarks
deno task fmt        # format code
deno task lint       # lint code
deno task check      # type check
```

## Performance

Benchmarks run with `deno task bench`.

<!-- BENCH:START -->

| Benchmark              | Avg     | Min     | Max     | p75     | p99     | Iterations |
| ---------------------- | ------- | ------- | ------- | ------- | ------- | ---------- |
| findDocumentLayoutRoot | 9.5us   | 8.0us   | 10.7us  | 10.3us  | 10.7us  | 16         |
| findOrderedLayouts     | 9.3us   | 2.4us   | 11.96ms | 9.3us   | 24.6us  | 53569      |
| getRegexRoute_dynamic  | 929ns   | 917ns   | 971ns   | 933ns   | 971ns   | 64         |
| getRegexRoute_static   | 814ns   | 799ns   | 915ns   | 814ns   | 915ns   | 72         |
| paramsEngine           | 461ns   | 453ns   | 527ns   | 463ns   | 514ns   | 119        |
| pathNamedParams        | 244ns   | 231ns   | 621ns   | 243ns   | 460ns   | 215        |
| regex_test_match       | 23ns    | 22ns    | 37ns    | 23ns    | 25ns    | 2209       |
| regex_test_nomatch     | 17ns    | 17ns    | 35ns    | 17ns    | 20ns    | 2872       |
| routerEngine_full      | 6.79ms  | 4.61ms  | 11.91ms | 7.79ms  | 11.91ms | 7          |
| toSlug                 | 654ns   | 644ns   | 756ns   | 656ns   | 756ns   | 87         |
| viewEngine_data        | 234.4us | 192.9us | 501.5us | 241.5us | 338.2us | 2144       |
| viewEngine_static      | 192.8us | 148.5us | 6.51ms  | 199.0us | 253.8us | 2602       |

<!-- BENCH:END -->

> Full history tracked in [`benchmarks/history.json`](benchmarks/history.json)

## License

[MIT](LICENSE)
