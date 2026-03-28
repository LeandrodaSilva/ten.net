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

### Code Protection (Roadmap)

Future versions will include obfuscation and encryption for bundled application
code, preventing reverse engineering in distributed deployments.

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
| findOrderedLayouts     | 44.0us  | 35.7us  | 284.7us | 42.6us  | 78.4us  | 11375      |
| getRegexRoute_dynamic  | 934ns   | 920ns   | 983ns   | 935ns   | 983ns   | 64         |
| getRegexRoute_static   | 805ns   | 792ns   | 926ns   | 804ns   | 926ns   | 73         |
| http_404               | 107.2us | 89.9us  | 977.6us | 107.1us | 169.8us | 4673       |
| http_admin             | 200.0us | 185.0us | 1.07ms  | 206.2us | 242.4us | 2510       |
| http_api               | 123.1us | 106.9us | 2.69ms  | 130.3us | 197.3us | 4070       |
| http_dynamic_param     | 130.7us | 117.8us | 959.9us | 129.8us | 192.7us | 3837       |
| http_post_redirect     | 208.0us | 184.3us | 884.8us | 214.7us | 335.0us | 2413       |
| http_static_page       | 428.2us | 363.2us | 951.5us | 444.3us | 691.9us | 1177       |
| http_view_template     | 296.9us | 246.0us | 4.04ms  | 316.5us | 485.7us | 1693       |
| paramsEngine           | 546ns   | 530ns   | 971ns   | 541ns   | 782ns   | 102        |
| pathNamedParams        | 272ns   | 258ns   | 571ns   | 270ns   | 541ns   | 194        |
| regex_test_match       | 22ns    | 22ns    | 32ns    | 22ns    | 25ns    | 2294       |
| regex_test_nomatch     | 17ns    | 16ns    | 35ns    | 16ns    | 20ns    | 2994       |
| routerEngine_full      | 25.13ms | 24.55ms | 25.57ms | 25.56ms | 25.57ms | 6          |
| toSlug                 | 727ns   | 718ns   | 819ns   | 730ns   | 819ns   | 79         |
| viewEngine_data        | 91.5us  | 83.8us  | 582.9us | 90.1us  | 129.6us | 5476       |
| viewEngine_static      | 52.6us  | 48.0us  | 667.9us | 50.5us  | 85.1us  | 9512       |

<!-- BENCH:END -->

> Full history tracked in [`benchmarks/history.json`](benchmarks/history.json)

## License

[MIT](LICENSE)
