import { routerEngine } from "../../src/routerEngine.ts";
import { viewEngine } from "../../src/viewEngine.ts";
import { createRoute, restoreConsole, suppressConsole } from "./_helpers.ts";

suppressConsole();

// --- routerEngine ---

Deno.bench("routerEngine_full", { n: 5, warmup: 1 }, async () => {
  await routerEngine("./example/http/app", "route.ts");
});

// --- viewEngine ---

const staticRoute = createRoute({
  path: "/",
  hasPage: true,
  page: "<h1>Home</h1>",
});
staticRoute.method = "GET";

Deno.bench("viewEngine_static", async () => {
  await viewEngine({
    _appPath: "./example/http/app",
    route: staticRoute,
    req: new Request("http://localhost/"),
    params: {},
  });
});

const dataRoute = createRoute({
  path: "/hello",
  hasPage: true,
  page: "<h1>Hello {{name}}!</h1>",
});
dataRoute.method = "GET";
dataRoute.run = () =>
  new Response(JSON.stringify({ name: "Benchmark" }), {
    headers: { "Content-Type": "application/json" },
  });

Deno.bench("viewEngine_data", async () => {
  await viewEngine({
    _appPath: "./example/http/app",
    route: dataRoute,
    req: new Request("http://localhost/hello"),
    params: {},
  });
});

// --- viewEngine with the shell cache (template precompilation) ---
// A persistent cache means the assembled layout/document shell is built once
// and reused, so these measure the cached hot path versus the uncached ones.

const staticShellCache = new Map<string, string>();
Deno.bench("viewEngine_static_cached", async () => {
  await viewEngine({
    _appPath: "./example/http/app",
    route: staticRoute,
    req: new Request("http://localhost/"),
    params: {},
    shellCache: staticShellCache,
  });
});

const dataShellCache = new Map<string, string>();
Deno.bench("viewEngine_data_cached", async () => {
  await viewEngine({
    _appPath: "./example/http/app",
    route: dataRoute,
    req: new Request("http://localhost/hello"),
    params: {},
    shellCache: dataShellCache,
  });
});

globalThis.addEventListener("unload", () => {
  restoreConsole();
});
