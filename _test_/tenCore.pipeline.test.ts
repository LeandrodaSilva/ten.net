import { describe, it } from "@std/testing/bdd";
import { assertEquals, assertStringIncludes } from "@std/assert";
import { TenCore } from "../src/core/tenCore.ts";
import { Route } from "../src/models/Route.ts";
import type { AppManifest } from "../src/build/manifest.ts";
import type {
  DynamicRouteLike,
  DynamicRouteRegistryLike,
  I18nMap,
} from "../src/core/types.ts";

function adminView(path: string): Route {
  const r = new Route({
    path,
    regex: new RegExp(`^${path}$`),
    hasPage: true,
    transpiledCode: "",
    sourcePath: "",
  });
  r.method = "GET";
  r.page = "<html><head></head><body>page</body></html>";
  r.run = () =>
    new Response(JSON.stringify({}), {
      headers: { "Content-Type": "application/json" },
    });
  return r;
}

function dynRoute(id: string): DynamicRouteLike {
  return {
    id,
    body: "",
    title: "",
    seo_title: "",
    seo_description: "",
    template: "",
  };
}

describe("TenCore — embedded assets", () => {
  it("serves a static asset from the manifest", async () => {
    const manifest = {
      routes: [],
      layouts: {},
      documentHtml: "",
      assets: {
        "/s.css": { dataBase64: btoa("body{}"), mimeType: "text/css" },
      },
    } as unknown as AppManifest;

    const core = new TenCore({ embedded: manifest });
    const res = await core.fetch(new Request("http://x/s.css"));
    assertEquals(res.status, 200);
    assertEquals(res.headers.get("Content-Type"), "text/css");
    assertStringIncludes(res.headers.get("Cache-Control") ?? "", "max-age");
    assertEquals(await res.text(), "body{}");
  });
});

describe("TenCore — i18n locale headers", () => {
  const i18n: I18nMap = { "/admin": { en: {}, "pt-BR": {} } };

  it("sets a language cookie when the locale comes from the URL prefix", async () => {
    const core = new TenCore({ routes: [adminView("/admin/x")], i18n });
    const res = await core.fetch(new Request("http://x/pt-BR/admin/x"));
    assertEquals(res.status, 200);
    assertEquals(res.headers.get("Content-Language"), "pt-BR");
    assertStringIncludes(res.headers.get("Set-Cookie") ?? "", "ten_lang=pt-BR");
  });

  it("varies on Accept-Language when no URL prefix is used", async () => {
    const core = new TenCore({ routes: [adminView("/admin/x")], i18n });
    const res = await core.fetch(
      new Request("http://x/admin/x", {
        headers: { cookie: "ten_lang=pt-BR" },
      }),
    );
    assertEquals(res.status, 200);
    assertEquals(res.headers.get("Content-Language"), "pt-BR");
    assertStringIncludes(res.headers.get("Vary") ?? "", "Accept-Language");
  });
});

describe("TenCore — dynamic pages", () => {
  it("renders a matched dynamic page", async () => {
    const registry: DynamicRouteRegistryLike = {
      match: (p) => (p === "/dyn" ? dynRoute("d1") : null),
      notFoundPage: null,
    };
    const core = new TenCore();
    core.dynamicRegistryOverride = registry;
    core.setDynamicPageRenderer((dr) => Promise.resolve(`<h1>${dr.id}</h1>`));

    const res = await core.fetch(new Request("http://x/dyn"));
    assertEquals(res.status, 200);
    assertStringIncludes(res.headers.get("Content-Type") ?? "", "text/html");
    assertEquals(await res.text(), "<h1>d1</h1>");
  });

  it("returns 500 when no dynamic-page renderer is injected", async () => {
    const registry: DynamicRouteRegistryLike = {
      match: () => dynRoute("d1"),
      notFoundPage: null,
    };
    const core = new TenCore();
    core.dynamicRegistryOverride = registry;
    const res = await core.fetch(new Request("http://x/dyn"));
    assertEquals(res.status, 500);
  });

  it("renders the registry's notFoundPage for unmatched routes", async () => {
    const registry: DynamicRouteRegistryLike = {
      match: () => null,
      notFoundPage: dynRoute("nf"),
    };
    const core = new TenCore();
    core.dynamicRegistryOverride = registry;
    core.setDynamicPageRenderer((dr) => Promise.resolve(`<nf>${dr.id}</nf>`));

    const res = await core.fetch(new Request("http://x/missing"));
    assertEquals(res.status, 404);
    assertEquals(await res.text(), "<nf>nf</nf>");
  });

  it("falls back to plain 404 with no registry", async () => {
    const core = new TenCore();
    const res = await core.fetch(new Request("http://x/missing"));
    assertEquals(res.status, 404);
    assertEquals(await res.text(), "Not found");
  });
});
