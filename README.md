# Ten.net

[![CI](https://github.com/LeandrodaSilva/ten.net/actions/workflows/ci.yml/badge.svg)](https://github.com/LeandrodaSilva/ten.net/actions/workflows/ci.yml)
[![JSR](https://jsr.io/badges/@leproj/tennet)](https://jsr.io/@leproj/tennet)
[![JSR Score](https://jsr.io/badges/@leproj/tennet/score)](https://jsr.io/@leproj/tennet)
[![Coverage](https://img.shields.io/badge/coverage-%E2%89%A590%25-brightgreen)](https://github.com/LeandrodaSilva/ten.net/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A minimalist web microframework for [Deno](https://deno.com).

## Features

- **File-based routing** — directories in `app/` map directly to URL paths
- **HTML templating** — `{{mustache}}` placeholders populated from route handler
  data
- **Nested layouts** — `layout.html` and `document.html` wrap pages
  hierarchically
- **Dynamic route parameters** — `[param]/` directories for URL segments
- **Plugin system** — extensible architecture with a built-in admin panel
- **Dev mode** — file watcher with automatic route reload

## Vision

### Self-Contained Binary Deployment

Compile your entire application into a single production-ready binary with all
routes, templates, and assets embedded. No runtime dependencies — just deploy
and run.

### Code Protection

Application code is compressed with gzip and encrypted with AES-256-GCM
(PBKDF2-derived keys, 100 000 iterations) before being embedded into the binary.
This prevents casual inspection and reverse engineering of distributed
deployments.

### Maximum Simplicity

No boilerplate. Directories define routes. HTML files are the frontend engine.
TypeScript files handle server logic. Two lines to start a server.

### Extensible Plugin System

Extend the framework by subclassing `Plugin`. Custom plugins auto-register
routes and appear in the admin dashboard.

### Built-in Admin Panel (Roadmap)

A server-rendered admin dashboard at `/admin` for marketing teams and
non-technical users to manage the application in production. Currently in early
development with basic plugin listing and dashboard structure.

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
deno run --allow-all --unstable-bundle --unstable-raw-imports main.ts
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

If no `document.html` is provided, a default one is used (includes Tailwind CSS
via CDN).

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

Ten.net includes a plugin system with a built-in admin panel at `/admin`:

```ts
import { Ten } from "@leproj/tennet";

const app = Ten.net();
// app.addPlugin(MyPlugin);
await app.start();
```

## Building for Production

Compile your entire application — routes, templates, and static assets — into a
single encrypted binary. The build process:

1. Collects all routes, layouts, and assets from your `app/` and `public/`
   directories
2. Compresses the manifest with gzip
3. Encrypts with AES-256-GCM (PBKDF2-derived key)
4. Compiles into a standalone Deno binary via `deno compile`

The resulting binary has **zero runtime dependencies** — just deploy and run.

### CLI

The fastest way to build:

```bash
deno run -A jsr:@leproj/tennet/cli build
```

Add it as a task in your project's `deno.json`:

```json
{
  "tasks": {
    "build": "deno run -A jsr:@leproj/tennet/cli build"
  }
}
```

Or install globally:

```bash
deno install -A -n tennet jsr:@leproj/tennet/cli
tennet build
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

Use `Ten.build()` for full control over the build process:

```ts
import { Ten } from "@leproj/tennet";

await Ten.build();
```

With options:

```ts
import { Ten } from "@leproj/tennet";

const result = await Ten.build({
  appPath: "./src/app",
  publicPath: "./static",
  output: "./build",
  secret: Deno.env.get("BUILD_SECRET"),
});

console.log(`Built ${result.stats.routes} routes`);
console.log(`Binary: ${result.binaryPath}`);
```

You can also import the build function directly:

```ts
import { build } from "@leproj/tennet/build";

const result = await build({ compile: false, verbose: false });
```

## Development

```bash
deno task dev    # starts dev server with file watching and hot reload
```

Other useful commands:

```bash
deno task test       # run tests
deno task bench:run  # run benchmarks (human-readable output)
deno task bench      # run benchmarks + save history + update README table
deno task bench:check # check for performance regressions
deno task fmt        # format code
deno task lint       # lint code
deno task check      # type check
```

## Performance

Benchmarks run against the demo app with `deno task bench`.

<!-- BENCH:START -->

| Benchmark              | Avg     | Min     | Max     | p75     | p99     | Iterations |
| ---------------------- | ------- | ------- | ------- | ------- | ------- | ---------- |
| findDocumentLayoutRoot | 8.2us   | 8.1us   | 8.5us   | 8.2us   | 8.5us   | 17         |
| findOrderedLayouts     | 47.6us  | 37.9us  | 277.3us | 42.2us  | 112.6us | 10509      |
| getRegexRoute_dynamic  | 928ns   | 917ns   | 986ns   | 931ns   | 986ns   | 64         |
| getRegexRoute_static   | 799ns   | 783ns   | 1.0us   | 799ns   | 1.0us   | 73         |
| http_404               | 110.0us | 91.3us  | 1.41ms  | 110.4us | 183.5us | 4556       |
| http_admin             | 203.6us | 184.0us | 1.12ms  | 213.0us | 282.2us | 2466       |
| http_api               | 117.0us | 106.9us | 654.3us | 115.7us | 165.2us | 4283       |
| http_dynamic_param     | 138.4us | 118.0us | 1.51ms  | 149.5us | 209.3us | 3626       |
| http_post_redirect     | 211.4us | 183.2us | 920.2us | 221.6us | 307.5us | 2375       |
| http_static_page       | 435.7us | 376.5us | 1.49ms  | 451.5us | 695.6us | 1157       |
| http_view_template     | 267.5us | 243.8us | 6.86ms  | 272.7us | 357.0us | 1880       |
| paramsEngine           | 533ns   | 523ns   | 905ns   | 531ns   | 664ns   | 104        |
| pathNamedParams        | 275ns   | 262ns   | 492ns   | 272ns   | 487ns   | 192        |
| regex_test_match       | 23ns    | 22ns    | 50ns    | 22ns    | 45ns    | 2195       |
| regex_test_nomatch     | 19ns    | 16ns    | 120ns   | 17ns    | 37ns    | 2702       |
| routerEngine_full      | 28.23ms | 27.59ms | 28.85ms | 28.75ms | 28.85ms | 6          |
| toSlug                 | 722ns   | 712ns   | 816ns   | 723ns   | 816ns   | 80         |
| viewEngine_data        | 92.8us  | 83.2us  | 2.36ms  | 91.8us  | 162.7us | 5399       |
| viewEngine_static      | 52.5us  | 46.7us  | 690.3us | 49.6us  | 94.6us  | 9531       |

<!-- BENCH:END -->

> Full history tracked in [`benchmarks/history.json`](benchmarks/history.json)

## License

[MIT](LICENSE)
