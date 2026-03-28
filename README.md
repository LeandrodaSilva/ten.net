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
| findDocumentLayoutRoot | 8.2us   | 8.1us   | 8.6us   | 8.2us   | 8.6us   | 17         |
| findOrderedLayouts     | 46.2us  | 39.5us  | 259.8us | 43.5us  | 88.9us  | 10838      |
| getRegexRoute_dynamic  | 944ns   | 926ns   | 1.2us   | 943ns   | 1.2us   | 63         |
| getRegexRoute_static   | 791ns   | 775ns   | 937ns   | 790ns   | 937ns   | 74         |
| http_404               | 106.3us | 89.9us  | 893.6us | 108.2us | 170.4us | 4712       |
| http_admin             | 198.1us | 183.7us | 939.7us | 202.4us | 236.8us | 2534       |
| http_api               | 119.2us | 106.3us | 752.4us | 120.5us | 175.3us | 4205       |
| http_dynamic_param     | 128.2us | 116.9us | 963.2us | 129.2us | 183.6us | 3911       |
| http_post_redirect     | 225.9us | 185.0us | 828.8us | 233.2us | 324.6us | 2224       |
| http_static_page       | 414.4us | 357.3us | 1.37ms  | 435.6us | 655.4us | 1216       |
| http_view_template     | 271.1us | 244.5us | 3.97ms  | 274.7us | 406.3us | 1854       |
| paramsEngine           | 529ns   | 518ns   | 674ns   | 530ns   | 584ns   | 105        |
| pathNamedParams        | 277ns   | 254ns   | 579ns   | 272ns   | 542ns   | 191        |
| regex_test_match       | 22ns    | 22ns    | 45ns    | 22ns    | 44ns    | 2250       |
| regex_test_nomatch     | 17ns    | 16ns    | 51ns    | 16ns    | 34ns    | 2897       |
| routerEngine_full      | 25.72ms | 24.81ms | 27.71ms | 25.81ms | 27.71ms | 6          |
| toSlug                 | 751ns   | 729ns   | 891ns   | 750ns   | 891ns   | 77         |
| viewEngine_data        | 93.0us  | 84.1us  | 636.6us | 93.5us  | 175.3us | 5388       |
| viewEngine_static      | 52.6us  | 47.3us  | 571.0us | 50.2us  | 98.8us  | 9510       |

<!-- BENCH:END -->

> Full history tracked in [`benchmarks/history.json`](benchmarks/history.json)

## License

[MIT](LICENSE)
