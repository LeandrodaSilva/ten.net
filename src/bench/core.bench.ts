import { TenCore } from "../core/tenCore.ts";
import { Route } from "../models/Route.ts";
import { restoreConsole, suppressConsole } from "./_helpers.ts";

suppressConsole();

function apiRoute(): Route {
  const r = new Route({
    path: "/api/x",
    regex: /^\/api\/x$/,
    hasPage: false,
    transpiledCode: "",
    sourcePath: "",
  });
  r.method = "GET";
  r.run = () => new Response("ok");
  return r;
}

// Plain hot path: no middleware, no hooks, no i18n.
const plain = new TenCore({ routes: [apiRoute()] });
Deno.bench("core_fetch_api", async () => {
  const res = await plain.fetch(new Request("http://localhost/api/x"));
  await res.body?.cancel();
});

// Hot path with i18n configured (exercises locale resolution per request).
const i18nCore = new TenCore({
  routes: [apiRoute()],
  i18n: {
    "/": { "en": {}, "pt-BR": {}, "es": {} },
    "/docs": { "en": {}, "pt-BR": {}, "es": {} },
  },
});
Deno.bench("core_fetch_i18n", async () => {
  const res = await i18nCore.fetch(new Request("http://localhost/api/x"));
  await res.body?.cancel();
});

globalThis.addEventListener("unload", () => {
  restoreConsole();
});
