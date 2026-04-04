# Ten.net Playground — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar um playground online interativo onde iniciantes editam rotas, templates e layouts do Ten.net no browser e veem o resultado ao vivo via Service Worker — sem backend, sem instalar nada.

**Architecture:** SPA estatica com um unico Service Worker controlando o preview. O playground envia manifests atualizados via `postMessage` ao SW, que faz hot-swap no TenCore. O preview roda em iframe apontando para `/preview/*`. CodeMirror 6 para edicao, Material Design 3 + TypeScript Blue para UI.

**Tech Stack:** Deno 2.x, TypeScript, TenCore, Service Worker API, CodeMirror 6, esbuild, Material Design 3, Material Symbols Outlined.

**Spec:** `docs/superpowers/specs/2026-04-03-playground-design.md`

**Security note:** The playground renders user-edited HTML templates in a sandboxed iframe via Service Worker. All demo content is pre-defined and trusted. The CodeMirror editor handles text content safely through its own DOM API. The embed web component uses Shadow DOM for encapsulation.

---

## File Map

### Core changes (src/)

| File | Action | Responsibility |
|------|--------|----------------|
| `src/core/tenCore.ts` | Modify | Add `updateManifest()` method |
| `src/core/types.ts` | Modify | Add `pathPrefix` to `TenCoreOptions` |
| `src/sw/adapter.ts` | Modify | Add `pathPrefix` filtering to `handle()`/`fire()` |
| `src/sw/types.ts` | Modify | Add `pathPrefix` to `TenServiceWorkerOptions` |
| `_test_/tenCore.test.ts` | Modify | Tests for `updateManifest()` |
| `_test_/sw-adapter.test.ts` | Modify | Tests for `pathPrefix` filtering |

### Playground (playground/)

| File | Action | Responsibility |
|------|--------|----------------|
| `playground/index.html` | Create | SPA shell — loads app.ts |
| `playground/sw.ts` | Create | SW bootstrap: TenCore + message listener |
| `playground/src/app.ts` | Create | Bootstrap: register SW, mount UI via DOM API |
| `playground/src/types.ts` | Create | Shared types: Demo, DemoFile, DemoCategory |
| `playground/src/components/sidebar.ts` | Create | Category nav + demo cards + search |
| `playground/src/components/editor.ts` | Create | CodeMirror 6 wrapper |
| `playground/src/components/preview.ts` | Create | iframe + SW communication |
| `playground/src/components/tabs.ts` | Create | File tabs (route.ts, page.html, layout.html) |
| `playground/src/components/url-bar.ts` | Create | Simulated URL bar |
| `playground/src/components/top-bar.ts` | Create | Logo, version, Reset/Run buttons |
| `playground/src/demos/registry.ts` | Create | Demo index + manifest builder |
| `playground/src/demos/hello-world/` | Create | Demo: Hello World |
| `playground/src/demos/dynamic-routes/` | Create | Demo: Rotas Dinamicas |
| `playground/src/demos/api-rest/` | Create | Demo: API REST |
| `playground/src/demos/page-layout/` | Create | Demo: Page + Layout |
| `playground/src/demos/nested-layouts/` | Create | Demo: Nested Layouts |
| `playground/src/demos/contact-form/` | Create | Demo: Formulario de Contato |
| `playground/src/demos/landing-page/` | Create | Demo: Landing Page Promocional |
| `playground/src/demos/todo-offline/` | Create | Demo: TODO App Offline |
| `playground/src/embed/tennet-playground.ts` | Create | Web component `<tennet-playground>` |
| `playground/src/theme/tokens.css` | Create | M3 design tokens + TS Blue |
| `playground/src/theme/components.css` | Create | Component styles |
| `playground/build.ts` | Create | esbuild build script |
| `playground/serve.ts` | Create | Dev server for dist/ |

---

## Phase 1: Core Changes (TenCore + SW adapter)

### Task 1: TenCore.updateManifest()

**Files:**
- Modify: `src/core/tenCore.ts:42-169`
- Test: `_test_/tenCore.test.ts`

- [ ] **Step 1: Write the failing test for updateManifest()**

Add to `_test_/tenCore.test.ts` inside the `describe("TenCore")` block:

```typescript
describe("updateManifest()", () => {
  it("should replace routes from old manifest with new manifest routes", async () => {
    const oldManifest = makeManifest({
      routes: [
        {
          path: "/old",
          regexSource: "^\\/old$",
          regexFlags: "",
          hasPage: false,
          transpiledCode:
            'export function GET() { return new Response("old"); }',
          pageContent: "",
        },
      ],
    });

    const core = new TenCore({ embedded: oldManifest });
    // Trigger init to load old routes
    await core.fetch(new Request("http://localhost/old"));

    const newManifest = makeManifest({
      routes: [
        {
          path: "/new",
          regexSource: "^\\/new$",
          regexFlags: "",
          hasPage: false,
          transpiledCode:
            'export function GET() { return new Response("new"); }',
          pageContent: "",
        },
      ],
    });

    core.updateManifest(newManifest);

    // Old route should be gone
    const oldRes = await core.fetch(new Request("http://localhost/old"));
    assertEquals(oldRes.status, 404);

    // New route should work (route is matched even if dynamic import may fail)
    const newRes = await core.fetch(new Request("http://localhost/new"));
    assertEquals(newRes.status !== 404 || (await newRes.clone().text()) !== "Not found", true);
  });

  it("should update embedded assets after manifest swap", async () => {
    const oldManifest = makeManifest({
      routes: [],
      assets: {
        "/style.css": { mimeType: "text/css", dataBase64: btoa("old") },
      },
    });

    const core = new TenCore({ embedded: oldManifest });
    const res1 = await core.fetch(new Request("http://localhost/style.css"));
    assertEquals(await res1.text(), "old");

    const newManifest = makeManifest({
      routes: [],
      assets: {
        "/style.css": { mimeType: "text/css", dataBase64: btoa("new") },
      },
    });

    core.updateManifest(newManifest);
    const res2 = await core.fetch(new Request("http://localhost/style.css"));
    assertEquals(await res2.text(), "new");
  });

  it("should replace all routes including manual ones after manifest swap", async () => {
    const core = new TenCore({ embedded: makeManifest() });
    await core.fetch(new Request("http://localhost/init"));

    const manualRoute = makeRoute({
      path: "/manual",
      regex: /^\/manual$/,
      method: "GET",
      run: () => new Response("manual"),
    });
    core.addRoutes([manualRoute]);

    core.updateManifest(makeManifest({
      routes: [
        {
          path: "/swapped",
          regexSource: "^\\/swapped$",
          regexFlags: "",
          hasPage: false,
          transpiledCode: 'export function GET() { return new Response("swapped"); }',
          pageContent: "",
        },
      ],
    }));

    // Manual route should NOT be preserved — updateManifest replaces everything
    const manualRes = await core.fetch(new Request("http://localhost/manual"));
    assertEquals(manualRes.status, 404);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `deno test _test_/tenCore.test.ts --filter "updateManifest" --allow-all --unstable-raw-imports --unstable-kv`
Expected: FAIL with "core.updateManifest is not a function"

- [ ] **Step 3: Implement updateManifest()**

In `src/core/tenCore.ts`, add after the `clearRoutes()` method (line ~110):

```typescript
/**
 * Replace the embedded manifest and rebuild routes from it.
 * Used for hot-swapping app content at runtime (e.g., playground).
 * Clears all existing routes and reloads from the new manifest.
 */
updateManifest(manifest: AppManifest): void {
  this._embedded = manifest;
  this._routes = [];
  this._initialized = false;
  this.init();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `deno test _test_/tenCore.test.ts --filter "updateManifest" --allow-all --unstable-raw-imports --unstable-kv`
Expected: 3 tests PASS

- [ ] **Step 5: Run full test suite**

Run: `deno task test`
Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
git add src/core/tenCore.ts _test_/tenCore.test.ts
git commit -m "feat(core): add TenCore.updateManifest() for runtime manifest hot-swap"
```

---

### Task 2: SW adapter pathPrefix filtering

**Files:**
- Modify: `src/sw/types.ts:12-15`
- Modify: `src/sw/adapter.ts`
- Test: `_test_/sw-adapter.test.ts`

- [ ] **Step 1: Write failing tests for pathPrefix**

Add to `_test_/sw-adapter.test.ts`:

```typescript
describe("SW Adapter — pathPrefix", () => {
  it("should intercept requests matching pathPrefix", async () => {
    const route = makeRoute({
      path: "/hello",
      regex: /^\/hello$/,
      method: "GET",
      run: () => new Response("intercepted", { status: 200 }),
    });
    const core = new TenCore({ routes: [route] });

    const { event, getRespondedWith } = makeFetchEvent(
      "http://localhost/preview/hello",
    );
    const handler = handle(core, { pathPrefix: "/preview" });
    handler(event);

    const res = await getRespondedWith();
    assertEquals((res as Response).status, 200);
    assertEquals(await (res as Response).text(), "intercepted");
  });

  it("should passthrough requests NOT matching pathPrefix", async () => {
    const core = new TenCore({
      routes: [
        makeRoute({
          path: "/hello",
          regex: /^\/hello$/,
          method: "GET",
          run: () => new Response("should not reach"),
        }),
      ],
    });

    let fallbackCalled = false;
    const fallback: typeof fetch = () => {
      fallbackCalled = true;
      return Promise.resolve(new Response("passthrough", { status: 200 }));
    };

    const { event, getRespondedWith } = makeFetchEvent(
      "http://localhost/other/path",
    );
    const handler = handle(core, { pathPrefix: "/preview", fallback });
    handler(event);

    const res = await getRespondedWith();
    assertEquals(fallbackCalled, true);
    assertEquals(await (res as Response).text(), "passthrough");
  });

  it("should strip pathPrefix before passing to TenCore", async () => {
    let receivedUrl = "";
    const route = makeRoute({
      path: "/api/status",
      regex: /^\/api\/status$/,
      method: "GET",
      run: (req) => {
        receivedUrl = new URL(req.url).pathname;
        return new Response("ok");
      },
    });
    const core = new TenCore({ routes: [route] });

    const { event, getRespondedWith } = makeFetchEvent(
      "http://localhost/preview/api/status",
    );
    const handler = handle(core, { pathPrefix: "/preview" });
    handler(event);

    await getRespondedWith();
    assertEquals(receivedUrl, "/api/status");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `deno test _test_/sw-adapter.test.ts --filter "pathPrefix" --allow-all --unstable-raw-imports --unstable-kv`
Expected: FAIL — pathPrefix option not recognized yet

- [ ] **Step 3: Add pathPrefix to TenServiceWorkerOptions**

In `src/sw/types.ts`, modify the `TenServiceWorkerOptions` interface:

```typescript
export interface TenServiceWorkerOptions {
  /** Fallback fetch when route returns 404 (e.g., network passthrough). */
  fallback?: typeof fetch;
  /** Only intercept requests whose pathname starts with this prefix.
   *  The prefix is stripped before passing the request to TenCore.
   *  Requests that don't match are sent to `fallback` (or ignored). */
  pathPrefix?: string;
}
```

- [ ] **Step 4: Implement pathPrefix filtering in adapter**

Replace `src/sw/adapter.ts` with:

```typescript
import type { TenCore } from "../core/tenCore.ts";
import type { FetchEvent, TenServiceWorkerOptions } from "./types.ts";

/**
 * Creates a FetchEvent handler that delegates to TenCore.
 * Use with: self.addEventListener("fetch", handle(core))
 */
export function handle(
  core: TenCore,
  opts: TenServiceWorkerOptions = {},
): (evt: FetchEvent) => void {
  return (evt) => {
    evt.respondWith(
      (async () => {
        const url = new URL(evt.request.url);

        // pathPrefix filtering: only intercept matching paths
        if (opts.pathPrefix) {
          if (!url.pathname.startsWith(opts.pathPrefix)) {
            if (opts.fallback) return opts.fallback(evt.request);
            return fetch(evt.request);
          }
          // Strip prefix and create new request with cleaned URL
          const strippedPath = url.pathname.slice(opts.pathPrefix.length) || "/";
          const strippedUrl = new URL(strippedPath, url.origin);
          strippedUrl.search = url.search;
          strippedUrl.hash = url.hash;
          const strippedReq = new Request(strippedUrl.href, {
            method: evt.request.method,
            headers: evt.request.headers,
            body: evt.request.body,
          });
          const res = await core.fetch(strippedReq);
          if (res.status === 404 && opts.fallback) {
            return opts.fallback(evt.request);
          }
          return res;
        }

        const res = await core.fetch(evt.request);
        if (res.status === 404 && opts.fallback) {
          return opts.fallback(evt.request);
        }
        return res;
      })(),
    );
  };
}

/**
 * Convenience: registers the fetch listener automatically.
 * Call once at SW top level: fire(core)
 */
export function fire(
  core: TenCore,
  opts: TenServiceWorkerOptions = {},
): void {
  (self as unknown as EventTarget).addEventListener(
    "fetch",
    handle(core, opts) as EventListener,
  );
}
```

- [ ] **Step 5: Run pathPrefix tests to verify they pass**

Run: `deno test _test_/sw-adapter.test.ts --filter "pathPrefix" --allow-all --unstable-raw-imports --unstable-kv`
Expected: 3 tests PASS

- [ ] **Step 6: Run full test suite**

Run: `deno task test`
Expected: All tests pass (including existing adapter tests)

- [ ] **Step 7: Commit**

```bash
git add src/sw/adapter.ts src/sw/types.ts _test_/sw-adapter.test.ts
git commit -m "feat(sw): add pathPrefix option for scoped route interception"
```

---

### Task 3: SW message listener for manifest swap

**Files:**
- Modify: `src/sw/adapter.ts`
- Modify: `src/sw/mod.ts`
- Test: `_test_/sw-adapter.test.ts`

- [ ] **Step 1: Write failing test for message listener**

Add to `_test_/sw-adapter.test.ts`:

```typescript
import { fire, handle, listenForManifestUpdates } from "../src/sw/adapter.ts";
import type { AppManifest } from "../src/build/manifest.ts";

describe("SW Adapter — listenForManifestUpdates()", () => {
  it("should update TenCore manifest when receiving UPDATE_MANIFEST message", async () => {
    const oldManifest: AppManifest = {
      routes: [],
      layouts: {},
      documentHtml: "",
      assets: {
        "/old.css": { mimeType: "text/css", dataBase64: btoa("old") },
      },
    };

    const core = new TenCore({ embedded: oldManifest });
    await core.fetch(new Request("http://localhost/old.css"));
    assertEquals(await (await core.fetch(new Request("http://localhost/old.css"))).text(), "old");

    let messageHandler: ((evt: MessageEvent) => void) | null = null;
    const original = (self as unknown as Record<string, unknown>)
      .addEventListener as (...args: unknown[]) => void;
    (self as unknown as Record<string, unknown>).addEventListener = (
      type: unknown,
      handler: unknown,
    ) => {
      if (type === "message") {
        messageHandler = handler as (evt: MessageEvent) => void;
      }
    };

    try {
      listenForManifestUpdates(core);
      assertEquals(typeof messageHandler, "function");

      const newManifest: AppManifest = {
        routes: [],
        layouts: {},
        documentHtml: "",
        assets: {
          "/new.css": { mimeType: "text/css", dataBase64: btoa("new") },
        },
      };

      messageHandler!(new MessageEvent("message", {
        data: { type: "UPDATE_MANIFEST", manifest: newManifest },
      }));

      const oldRes = await core.fetch(new Request("http://localhost/old.css"));
      assertEquals(oldRes.status, 404);

      const newRes = await core.fetch(new Request("http://localhost/new.css"));
      assertEquals(newRes.status, 200);
      assertEquals(await newRes.text(), "new");
    } finally {
      (self as unknown as Record<string, unknown>).addEventListener = original;
    }
  });

  it("should ignore messages with unknown type", async () => {
    const manifest: AppManifest = {
      routes: [],
      layouts: {},
      documentHtml: "",
      assets: {
        "/keep.css": { mimeType: "text/css", dataBase64: btoa("keep") },
      },
    };

    const core = new TenCore({ embedded: manifest });
    await core.fetch(new Request("http://localhost/keep.css"));

    let messageHandler: ((evt: MessageEvent) => void) | null = null;
    const original = (self as unknown as Record<string, unknown>)
      .addEventListener as (...args: unknown[]) => void;
    (self as unknown as Record<string, unknown>).addEventListener = (
      type: unknown,
      handler: unknown,
    ) => {
      if (type === "message") messageHandler = handler as (evt: MessageEvent) => void;
    };

    try {
      listenForManifestUpdates(core);
      messageHandler!(new MessageEvent("message", {
        data: { type: "UNKNOWN", foo: "bar" },
      }));

      const res = await core.fetch(new Request("http://localhost/keep.css"));
      assertEquals(res.status, 200);
    } finally {
      (self as unknown as Record<string, unknown>).addEventListener = original;
    }
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `deno test _test_/sw-adapter.test.ts --filter "listenForManifestUpdates" --allow-all --unstable-raw-imports --unstable-kv`
Expected: FAIL — `listenForManifestUpdates` not exported

- [ ] **Step 3: Implement listenForManifestUpdates()**

Add to `src/sw/adapter.ts` after the `fire()` function:

```typescript
/**
 * Listen for postMessage events to hot-swap the TenCore manifest.
 * Expected message format: { type: "UPDATE_MANIFEST", manifest: AppManifest }
 */
export function listenForManifestUpdates(core: TenCore): void {
  (self as unknown as EventTarget).addEventListener(
    "message",
    ((evt: MessageEvent) => {
      if (evt.data?.type === "UPDATE_MANIFEST" && evt.data.manifest) {
        core.updateManifest(evt.data.manifest);
      }
    }) as EventListener,
  );
}
```

- [ ] **Step 4: Export from mod.ts**

In `src/sw/mod.ts`, add:

```typescript
export { fire, handle, listenForManifestUpdates } from "./adapter.ts";
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `deno test _test_/sw-adapter.test.ts --filter "listenForManifestUpdates" --allow-all --unstable-raw-imports --unstable-kv`
Expected: 2 tests PASS

- [ ] **Step 6: Run full test suite**

Run: `deno task test`
Expected: All tests pass

- [ ] **Step 7: Commit**

```bash
git add src/sw/adapter.ts src/sw/mod.ts _test_/sw-adapter.test.ts
git commit -m "feat(sw): add listenForManifestUpdates() for runtime manifest hot-swap"
```

---

## Phase 2: Playground Foundation

### Task 4: Design tokens and base CSS

**Files:**
- Create: `playground/src/theme/tokens.css`
- Create: `playground/src/theme/components.css`

- [ ] **Step 1: Create tokens.css with M3 + TS Blue design tokens**

```css
:root {
  --md-primary: #3178c6;
  --md-on-primary: #ffffff;
  --md-primary-shadow: rgba(49, 120, 198, 0.3);
  --md-surface: #eef1f6;
  --md-surface-card: #ffffff;
  --md-surface-inactive: #f5f7fa;
  --md-surface-editor: #1b1b1f;
  --md-on-surface: #1a1c1e;
  --md-on-surface-secondary: #5f6368;
  --md-on-surface-tertiary: #80868b;
  --md-outline: #dadce0;
  --md-elevation-1: 0 1px 3px rgba(0, 0, 0, 0.06);
  --md-elevation-2: 0 1px 3px rgba(0, 0, 0, 0.08);
  --md-elevation-active: 0 2px 8px var(--md-primary-shadow), 0 1px 3px rgba(49, 120, 198, 0.2);
  --md-elevation-button: 0 1px 3px var(--md-primary-shadow), 0 1px 2px rgba(0, 0, 0, 0.06);
  --md-radius-container: 16px;
  --md-radius-item: 12px;
  --md-radius-button: 20px;
  --md-font-family: 'Google Sans', 'Roboto', system-ui, sans-serif;
  --md-font-mono: 'Roboto Mono', 'Fira Code', monospace;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: var(--md-font-family);
  background: var(--md-surface);
  color: var(--md-on-surface);
  -webkit-font-smoothing: antialiased;
}
```

- [ ] **Step 2: Create components.css**

See spec mockup v6 for the complete M3 component styles. Key classes: `.top-bar`, `.btn-text`, `.btn-filled`, `.sidebar`, `.sidebar-search`, `.category-header`, `.category-label`, `.demo-item`, `.demo-item.active`, `.demo-title`, `.demo-desc`, `.tab`, `.tab.active`, `.editor-panel`, `.url-bar`, `.chip`. All use CSS custom properties from tokens.css.

- [ ] **Step 3: Commit**

```bash
git add playground/src/theme/
git commit -m "feat(playground): add M3 + TS Blue design tokens and component CSS"
```

---

### Task 5: Shared types

**Files:**
- Create: `playground/src/types.ts`

- [ ] **Step 1: Create shared types**

```typescript
import type { AppManifest } from "../../src/build/manifest.ts";

export interface DemoFile {
  name: string;
  content: string;
  language: "typescript" | "html";
  editable: boolean;
}

export interface Demo {
  id: string;
  title: string;
  description: string;
  category: DemoCategory;
  files: DemoFile[];
  manifest: AppManifest;
  previewPath: string;
}

export type DemoCategory =
  | "routing"
  | "templates"
  | "forms"
  | "showcase"
  | "offline";

export interface CategoryMeta {
  id: DemoCategory;
  label: string;
  icon: string;
}

export const CATEGORIES: CategoryMeta[] = [
  { id: "routing", label: "Routing", icon: "route" },
  { id: "templates", label: "Templates", icon: "web" },
  { id: "forms", label: "Forms", icon: "edit_note" },
  { id: "showcase", label: "Showcase", icon: "star" },
  { id: "offline", label: "Offline / SW", icon: "cloud_off" },
];
```

- [ ] **Step 2: Commit**

```bash
git add playground/src/types.ts
git commit -m "feat(playground): add shared types for demos and categories"
```

---

### Task 6: Demo registry + Hello World demo

**Files:**
- Create: `playground/src/demos/registry.ts`
- Create: `playground/src/demos/hello-world/demo.ts`

- [ ] **Step 1: Create Hello World demo definition**

```typescript
import type { Demo } from "../../types.ts";
import type { AppManifest } from "../../../../src/build/manifest.ts";

const routeTs = `export function GET() {
  return {
    title: "Hello Ten.net",
    message: "Welcome to the playground!",
  };
}`;

const pageHtml = `<h1>{{title}}</h1>
<p>{{message}}</p>`;

const manifest: AppManifest = {
  routes: [
    {
      path: "/",
      regexSource: "^\\/$",
      regexFlags: "",
      hasPage: true,
      transpiledCode: routeTs,
      pageContent: pageHtml,
    },
  ],
  layouts: {},
  documentHtml: "<!DOCTYPE html><html><head><meta charset=\"utf-8\"><title>{{title}}</title></head><body>{{content}}</body></html>",
  assets: {},
};

export const helloWorld: Demo = {
  id: "hello-world",
  title: "Hello World",
  description: "Rota basica com GET handler",
  category: "routing",
  files: [
    { name: "route.ts", content: routeTs, language: "typescript", editable: true },
    { name: "page.html", content: pageHtml, language: "html", editable: true },
  ],
  manifest,
  previewPath: "/",
};
```

- [ ] **Step 2: Create demo registry**

```typescript
import type { Demo, DemoCategory } from "../types.ts";
import { helloWorld } from "./hello-world/demo.ts";

const ALL_DEMOS: Demo[] = [
  helloWorld,
];

export function getDemos(): Demo[] {
  return ALL_DEMOS;
}

export function getDemoById(id: string): Demo | undefined {
  return ALL_DEMOS.find((d) => d.id === id);
}

export function getDemosByCategory(category: DemoCategory): Demo[] {
  return ALL_DEMOS.filter((d) => d.category === category);
}
```

- [ ] **Step 3: Commit**

```bash
git add playground/src/demos/
git commit -m "feat(playground): add demo registry and Hello World demo"
```

---

### Task 7: Service Worker for playground

**Files:**
- Create: `playground/sw.ts`

- [ ] **Step 1: Create playground Service Worker**

```typescript
import { TenCore } from "../src/core/tenCore.ts";
import { fire, listenForManifestUpdates } from "../src/sw/adapter.ts";
import type { AppManifest } from "../src/build/manifest.ts";

const emptyManifest: AppManifest = {
  routes: [],
  layouts: {},
  documentHtml: "",
  assets: {},
};

const core = new TenCore({ embedded: emptyManifest });

fire(core, {
  pathPrefix: "/preview",
  fallback: (req) => fetch(req),
});

listenForManifestUpdates(core);

// Activate immediately
declare const self: ServiceWorkerGlobalScope & typeof globalThis;

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (evt) => {
  evt.waitUntil(self.clients.claim());
});
```

- [ ] **Step 2: Commit**

```bash
git add playground/sw.ts
git commit -m "feat(playground): add Service Worker with manifest swap and pathPrefix"
```

---

### Task 8: Playground SPA shell + app bootstrap

**Files:**
- Create: `playground/index.html`
- Create: `playground/src/app.ts`

- [ ] **Step 1: Create index.html**

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Ten.net Playground</title>
  <link href="https://fonts.googleapis.com/icon?family=Material+Symbols+Outlined" rel="stylesheet">
  <link rel="stylesheet" href="./src/theme/tokens.css">
  <link rel="stylesheet" href="./src/theme/components.css">
</head>
<body>
  <div id="app"></div>
  <script type="module" src="./src/app.ts"></script>
</body>
</html>
```

- [ ] **Step 2: Create app.ts bootstrap**

The app.ts module manages state (`currentDemo`, `currentFileIndex`, `swReady`), registers the Service Worker, and renders the UI using safe DOM creation methods (createElement, textContent, setAttribute). It binds events for demo selection, tab switching, Run/Reset buttons, and search filtering. On demo change, it sends the new manifest to the SW via `postMessage` and refreshes the preview iframe `src`. All DOM rendering uses the programmatic DOM API — no raw HTML string injection.

Key functions:
- `registerSW()` — registers `/sw.js`, waits for activation
- `sendManifestToSW(manifest)` — posts `UPDATE_MANIFEST` message
- `render()` — rebuilds the full UI from state using DOM API
- `renderSidebar(container)` — creates category headers and demo items
- `renderEditorPanel(container)` — creates tabs, code area, preview iframe
- `bindEvents()` — attaches click/input handlers

- [ ] **Step 3: Commit**

```bash
git add playground/index.html playground/src/app.ts
git commit -m "feat(playground): add SPA shell and app bootstrap with SW registration"
```

---

### Task 9: Build script + dev server

**Files:**
- Create: `playground/build.ts`
- Create: `playground/serve.ts`

- [ ] **Step 1: Create build script**

Uses esbuild with `denoPlugins()` to bundle `playground/sw.ts` into `playground/dist/sw.js` and `playground/src/app.ts` into `playground/dist/app.js`. Copies `index.html` and CSS files to `dist/`, updating paths in the HTML.

```typescript
import * as esbuild from "esbuild";
import { denoPlugins } from "esbuild-deno-loader";

async function build(): Promise<void> {
  await esbuild.build({
    plugins: [...denoPlugins()],
    entryPoints: ["playground/sw.ts"],
    outfile: "playground/dist/sw.js",
    bundle: true,
    format: "esm",
    target: "es2022",
    minify: true,
  });

  await esbuild.build({
    plugins: [...denoPlugins()],
    entryPoints: ["playground/src/app.ts"],
    outfile: "playground/dist/app.js",
    bundle: true,
    format: "esm",
    target: "es2022",
    minify: true,
  });

  await Deno.copyFile("playground/src/theme/tokens.css", "playground/dist/tokens.css");
  await Deno.copyFile("playground/src/theme/components.css", "playground/dist/components.css");

  let html = await Deno.readTextFile("playground/index.html");
  html = html.replace('./src/app.ts', './app.js');
  html = html.replace('./src/theme/tokens.css', './tokens.css');
  html = html.replace('./src/theme/components.css', './components.css');
  await Deno.writeTextFile("playground/dist/index.html", html);

  console.log("Playground built to playground/dist/");
  esbuild.stop();
}

build();
```

- [ ] **Step 2: Create dev server**

Simple file server for `playground/dist/` with SPA fallback to `index.html`. Uses `Deno.serve` on port 3000.

- [ ] **Step 3: Add tasks to deno.json**

```json
"playground:build": "deno run --allow-all playground/build.ts",
"playground:serve": "deno run --allow-all playground/serve.ts"
```

- [ ] **Step 4: Commit**

```bash
git add playground/build.ts playground/serve.ts deno.json
git commit -m "feat(playground): add esbuild build script and dev server"
```

---

## Phase 3: Remaining Demos

### Task 10: Dynamic Routes demo

**Files:**
- Create: `playground/src/demos/dynamic-routes/demo.ts`
- Modify: `playground/src/demos/registry.ts`

- [ ] **Step 1: Create demo** — Route with `[name]` param, page showing `Hello, {{name}}!`. Manifest has regex `^\\/hello\\/([^\\/]+)$`. Preview path: `/hello/world`.

- [ ] **Step 2: Add to registry**

- [ ] **Step 3: Commit**

```bash
git add playground/src/demos/dynamic-routes/ playground/src/demos/registry.ts
git commit -m "feat(playground): add Dynamic Routes demo"
```

---

### Task 11: API REST demo

**Files:**
- Create: `playground/src/demos/api-rest/demo.ts`
- Modify: `playground/src/demos/registry.ts`

- [ ] **Step 1: Create demo** — Route with GET/POST/PUT/DELETE handlers returning JSON. No page template. Preview path: `/api/items`.

- [ ] **Step 2: Add to registry**

- [ ] **Step 3: Commit**

```bash
git add playground/src/demos/api-rest/ playground/src/demos/registry.ts
git commit -m "feat(playground): add API REST demo"
```

---

### Task 12: Page + Layout demo

**Files:**
- Create: `playground/src/demos/page-layout/demo.ts`
- Modify: `playground/src/demos/registry.ts`

- [ ] **Step 1: Create demo** — Route handler returns `{ title, content, year }`. Page has `<article>` with `{{title}}`, `{{content}}`. Layout wraps with header, main `{{content}}`, footer. 3 editable files.

- [ ] **Step 2: Add to registry**

- [ ] **Step 3: Commit**

```bash
git add playground/src/demos/page-layout/ playground/src/demos/registry.ts
git commit -m "feat(playground): add Page + Layout demo"
```

---

### Task 13: Nested Layouts demo

**Files:**
- Create: `playground/src/demos/nested-layouts/demo.ts`
- Modify: `playground/src/demos/registry.ts`

- [ ] **Step 1: Create demo** — Root layout (nav bar + content) + section layout (border-left accent + content). Route at `/section/page`. Layouts map: `"/":[rootLayout]`, `"/section":[rootLayout, sectionLayout]`. 2 editable files (page.html, section layout.html).

- [ ] **Step 2: Add to registry**

- [ ] **Step 3: Commit**

```bash
git add playground/src/demos/nested-layouts/ playground/src/demos/registry.ts
git commit -m "feat(playground): add Nested Layouts demo"
```

---

### Task 14: Contact Form demo

**Files:**
- Create: `playground/src/demos/contact-form/demo.ts`
- Modify: `playground/src/demos/registry.ts`

- [ ] **Step 1: Create demo** — GET returns form template, POST validates and returns thank-you message. Page has form with name, email, message fields. Conditional display via `{{formStyle}}`/`{{resultStyle}}` template vars.

- [ ] **Step 2: Add to registry**

- [ ] **Step 3: Commit**

```bash
git add playground/src/demos/contact-form/ playground/src/demos/registry.ts
git commit -m "feat(playground): add Contact Form demo"
```

---

### Task 15: Landing Page Promocional demo

**Files:**
- Create: `playground/src/demos/landing-page/demo.ts`
- Modify: `playground/src/demos/registry.ts`

- [ ] **Step 1: Create demo** — Full LP with hero section, features grid (3 cards), pricing table, and contact form. Route handler returns all section data. Page.html has polished inline styles with TS Blue accent. Layout.html wraps with nav and footer. 3 editable files.

- [ ] **Step 2: Add to registry**

- [ ] **Step 3: Commit**

```bash
git add playground/src/demos/landing-page/ playground/src/demos/registry.ts
git commit -m "feat(playground): add Landing Page Promocional demo"
```

---

### Task 16: TODO App Offline demo

**Files:**
- Create: `playground/src/demos/todo-offline/demo.ts`
- Modify: `playground/src/demos/registry.ts`

- [ ] **Step 1: Create demo** — Two routes: `/` for the TODO UI (GET renders list, POST adds item) and `/api/sync` as mock endpoint (GET returns empty sync response). Page has TODO list with add form, delete buttons, online/offline status badge. Uses in-memory array for state. Manifest includes both routes. The mock sync endpoint demonstrates the StorageSync API pattern. 2 editable files.

- [ ] **Step 2: Add to registry**

- [ ] **Step 3: Commit**

```bash
git add playground/src/demos/todo-offline/ playground/src/demos/registry.ts
git commit -m "feat(playground): add TODO App Offline demo with mock sync"
```

---

## Phase 4: CodeMirror Integration

### Task 17: CodeMirror 6 editor component

**Files:**
- Create: `playground/src/components/editor.ts`
- Modify: `playground/src/app.ts`
- Modify: `deno.json` (add CodeMirror imports)

- [ ] **Step 1: Add CodeMirror dependencies to deno.json imports**

```json
"codemirror": "npm:codemirror@^6",
"@codemirror/lang-javascript": "npm:@codemirror/lang-javascript@^6",
"@codemirror/lang-html": "npm:@codemirror/lang-html@^6",
"@codemirror/theme-one-dark": "npm:@codemirror/theme-one-dark@^6"
```

- [ ] **Step 2: Create editor component**

`playground/src/components/editor.ts` exports a `createEditor(container, file, onChange)` function. It creates an EditorView with:
- `javascript()` extension for `.ts` files, `html()` for `.html` files
- `oneDark` theme with custom background `#1b1b1f`
- `onChange` callback that fires with the new content string

```typescript
import { EditorView, basicSetup } from "codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { html } from "@codemirror/lang-html";
import { oneDark } from "@codemirror/theme-one-dark";
import type { DemoFile } from "../types.ts";

export function createEditor(
  container: HTMLElement,
  file: DemoFile,
  onChange: (content: string) => void,
): EditorView {
  const langExt = file.language === "typescript"
    ? javascript({ typescript: true })
    : html();

  const view = new EditorView({
    doc: file.content,
    extensions: [
      basicSetup,
      langExt,
      oneDark,
      EditorView.theme({
        "&": { backgroundColor: "#1b1b1f" },
        ".cm-gutters": { backgroundColor: "#1b1b1f" },
      }),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          onChange(update.state.doc.toString());
        }
      }),
      EditorView.editable.of(file.editable),
    ],
    parent: container,
  });

  return view;
}
```

- [ ] **Step 3: Wire editor into app.ts**

Replace the raw code display in `renderEditorPanel` with a call to `createEditor()`. On content change, update the current file's content and rebuild the manifest.

- [ ] **Step 4: Commit**

```bash
git add playground/src/components/editor.ts playground/src/app.ts deno.json
git commit -m "feat(playground): integrate CodeMirror 6 with TS/HTML modes"
```

---

## Phase 5: Embed Web Component

### Task 18: `<tennet-playground>` web component

**Files:**
- Create: `playground/src/embed/tennet-playground.ts`

- [ ] **Step 1: Create web component**

Custom element `tennet-playground` with Shadow DOM. Accepts `demo` and `height` attributes. Renders a compact editor/preview split. Registers shared SW and sends demo manifest. Includes "Abrir no Playground" and "Copiar codigo" chip buttons. Responsive: stacks vertically below 600px. Uses safe DOM APIs within the Shadow DOM boundary.

- [ ] **Step 2: Commit**

```bash
git add playground/src/embed/tennet-playground.ts
git commit -m "feat(playground): add <tennet-playground> web component for embed"
```

---

## Phase 6: Build, Test & Polish

### Task 19: Build smoke test

**Files:**
- Create: `_test_/playground-smoke.test.ts`

- [ ] **Step 1: Write smoke test**

```typescript
import { describe, it } from "@std/testing/bdd";
import { assertEquals } from "@std/assert";

describe("Playground build", () => {
  it("should build playground dist files", async () => {
    const cmd = new Deno.Command("deno", {
      args: ["run", "--allow-all", "playground/build.ts"],
    });
    const { code } = await cmd.output();
    assertEquals(code, 0);

    const indexStat = await Deno.stat("playground/dist/index.html");
    assertEquals(indexStat.isFile, true);

    const swStat = await Deno.stat("playground/dist/sw.js");
    assertEquals(swStat.isFile, true);

    const appStat = await Deno.stat("playground/dist/app.js");
    assertEquals(appStat.isFile, true);
  });
});
```

- [ ] **Step 2: Run test**

Run: `deno test _test_/playground-smoke.test.ts --allow-all --unstable-raw-imports`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add _test_/playground-smoke.test.ts
git commit -m "test: add playground build smoke test"
```

---

### Task 20: Manual integration test

- [ ] **Step 1: Build** — `deno task playground:build`
- [ ] **Step 2: Serve** — `deno task playground:serve`
- [ ] **Step 3: Verify in browser** — open `http://localhost:3000`:
  - Top bar with logo, version, Reset, Run
  - Sidebar with 5 categories and 8 demos
  - Click each demo — preview updates
  - Edit code in CodeMirror → Run → preview shows changes
  - Reset restores original
  - Search filters demos
- [ ] **Step 4: Run full CI** — `deno task fmt && deno task lint && deno task check && deno task test`
- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat(playground): complete v1 with 8 demos, CodeMirror, and embed component"
```
