import { describe, it } from "@std/testing/bdd";
import { assertEquals, assertStringIncludes } from "@std/assert";
import { TenCore } from "../src/core/tenCore.ts";
import { Route } from "../src/models/Route.ts";
import type { AppManifest } from "../src/build/manifest.ts";
import type {
  AdminPluginLikeCore,
  DynamicRouteRegistryLike,
} from "../src/core/types.ts";

describe("TenCore — config setters", () => {
  it("exposes kv, environment, sitemap and robots setters", () => {
    const core = new TenCore();
    core.kv = { marker: 1 };
    assertEquals((core.kv as { marker: number }).marker, 1);

    core.environment = "PROD";
    assertEquals(core.environment, "prod");
    core.environment = undefined;
    assertEquals(core.environment, "development");

    core.sitemapEnabled = false;
    assertEquals(core.sitemapEnabled, false);
    core.robotsEnabled = false;
    assertEquals(core.robotsEnabled, false);
  });
});

describe("TenCore — useAdmin", () => {
  it("wires routes, registry, kv, widget renderer, and sitemap provider", async () => {
    const adminRoute = new Route({
      path: "/admin/api",
      regex: /^\/admin\/api$/,
      hasPage: false,
      transpiledCode: "",
      sourcePath: "",
    });
    adminRoute.method = "GET";
    adminRoute.run = () => new Response("admin-ok");

    const registry: DynamicRouteRegistryLike = {
      match: () => null,
      notFoundPage: null,
    };

    const admin: AdminPluginLikeCore = {
      init: () =>
        Promise.resolve({
          routes: [adminRoute],
          middlewares: [],
          dynamicRegistry: registry,
          kv: { marker: 7 },
          widgetRenderer: (_id, body) => Promise.resolve(body),
        }),
      getSitemapEntries: () => Promise.resolve([{ path: "/from-admin" }]),
    };

    const core = new TenCore({ canonicalBaseUrl: "https://s.com" });
    await core.useAdmin(admin);

    assertEquals((core.kv as { marker: number }).marker, 7);
    assertEquals(core.dynamicRegistry, registry);
    assertEquals(core.widgetRenderer !== undefined, true);

    const routed = await core.fetch(new Request("http://x/admin/api"));
    assertEquals(await routed.text(), "admin-ok");

    const sitemap =
      await (await core.fetch(new Request("http://x/sitemap.xml")))
        .text();
    assertStringIncludes(sitemap, "https://s.com/from-admin");
  });
});

describe("TenCore — updateManifest", () => {
  it("applies the manifest i18n map", () => {
    const core = new TenCore();
    core.updateManifest(
      {
        routes: [],
        layouts: {},
        assets: {},
        documentHtml: "",
        i18n: { "/": { en: { a: "1" } } },
      } as unknown as AppManifest,
    );
    assertEquals(core.i18n["/"].en, { a: "1" });
  });
});

describe("TenCore — sitemap path filtering for provider entries", () => {
  it("drops sensitive, private, dynamic, and reserved paths", async () => {
    const core = new TenCore({
      canonicalBaseUrl: "https://s.com",
      sitemapEntriesProviders: [() => [
        { path: "/ok" },
        { path: "/admin/secret" }, // sensitive
        { path: "/_internal" }, // private
        { path: "/users/[id]" }, // dynamic
        { path: "/sitemap.xml" }, // reserved
        { path: "/robots.txt" }, // reserved
      ]],
    });

    const xml = await (await core.fetch(new Request("http://x/sitemap.xml")))
      .text();
    assertStringIncludes(xml, "https://s.com/ok");
    assertEquals(xml.includes("/admin/secret"), false);
    assertEquals(xml.includes("_internal"), false);
    assertEquals(xml.includes("/users/"), false);
  });
});
