import { routerEngine } from "../../src/routerEngine.ts";
import { viewEngine } from "../../src/viewEngine.ts";
import { createRoute, restoreConsole, suppressConsole } from "./_helpers.ts";

suppressConsole();

// --- routerEngine ---

Deno.bench("routerEngine_full", { n: 5, warmup: 1 }, async () => {
  await routerEngine("./example/app", "route.ts");
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
    _appPath: "./example/app",
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
    _appPath: "./example/app",
    route: dataRoute,
    req: new Request("http://localhost/hello"),
    params: {},
  });
});

globalThis.addEventListener("unload", () => {
  restoreConsole();
});
