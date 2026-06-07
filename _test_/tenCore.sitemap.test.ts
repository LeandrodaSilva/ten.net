import { describe, it } from "@std/testing/bdd";
import { assertEquals, assertStringIncludes } from "@std/assert";
import { TenCore } from "../src/core/tenCore.ts";
import { Route } from "../src/models/Route.ts";
import type {
  DynamicRouteRegistryLike,
  SitemapEntriesProvider,
} from "../src/core/types.ts";

function route(opts: {
  path: string;
  method?: string;
  hasPage?: boolean;
  sourcePath?: string;
}): Route {
  const r = new Route({
    path: opts.path,
    regex: new RegExp(`^${opts.path.replace(/[[\]]/g, "\\$&")}$`),
    hasPage: opts.hasPage ?? false,
    transpiledCode: "",
    sourcePath: opts.sourcePath ?? "",
  });
  r.method = opts.method ?? "GET";
  return r;
}

function silenceErrors<T>(fn: () => Promise<T>): Promise<T> {
  const original = console.error;
  console.error = () => {};
  return fn().finally(() => {
    console.error = original;
  });
}

describe("TenCore robots.txt", () => {
  it("returns 404 when robots are disabled", async () => {
    const core = new TenCore({ robotsEnabled: false });
    const res = await core.fetch(new Request("http://x/robots.txt"));
    assertEquals(res.status, 404);
  });

  it("disallows everything outside production", async () => {
    const core = new TenCore({ environment: "development" });
    const body = await (await core.fetch(new Request("http://x/robots.txt")))
      .text();
    assertStringIncludes(body, "User-agent: *");
    assertStringIncludes(body, "Disallow: /");
  });

  it("disallows sensitive prefixes and links the sitemap in production", async () => {
    const core = new TenCore({
      environment: "production",
      canonicalBaseUrl: "https://site.com",
    });
    const body = await (await core.fetch(new Request("http://x/robots.txt")))
      .text();
    assertStringIncludes(body, "Disallow: /admin");
    assertStringIncludes(body, "Disallow: /auth/");
    assertStringIncludes(body, "Sitemap: https://site.com/sitemap.xml");
  });

  it("omits the sitemap line when the sitemap is disabled", async () => {
    const core = new TenCore({
      environment: "production",
      sitemapEnabled: false,
    });
    const body = await (await core.fetch(new Request("http://x/robots.txt")))
      .text();
    assertEquals(body.includes("Sitemap:"), false);
  });
});

describe("TenCore sitemap.xml", () => {
  it("returns 404 when the sitemap is disabled", async () => {
    const core = new TenCore({ sitemapEnabled: false });
    const res = await core.fetch(new Request("http://x/sitemap.xml"));
    assertEquals(res.status, 404);
  });

  it("includes public GET routes and excludes admin/view/private/dynamic", async () => {
    const core = new TenCore({
      canonicalBaseUrl: "https://site.com",
      routes: [
        route({ path: "/about" }), // included
        route({ path: "/contact" }), // included
        route({ path: "/admin/x" }), // excluded: admin
        route({ path: "/page", hasPage: true }), // excluded: view
        route({ path: "/_secret" }), // excluded: private
        route({ path: "/users/[id]" }), // excluded: dynamic
        route({ path: "/submit", method: "POST" }), // excluded: not GET
        route({ path: "/hidden", sourcePath: "app/_hidden/route.ts" }), // private via sourcePath
      ],
    });

    const res = await core.fetch(new Request("http://x/sitemap.xml"));
    assertEquals(res.status, 200);
    assertStringIncludes(
      res.headers.get("Content-Type") ?? "",
      "application/xml",
    );
    const xml = await res.text();
    assertStringIncludes(xml, "<loc>https://site.com/about</loc>");
    assertStringIncludes(xml, "<loc>https://site.com/contact</loc>");
    assertEquals(xml.includes("/admin/x"), false);
    assertEquals(xml.includes("/page"), false);
    assertEquals(xml.includes("_secret"), false);
    assertEquals(xml.includes("/users/"), false);
    assertEquals(xml.includes("/submit"), false);
    assertEquals(xml.includes("/hidden"), false);
  });

  it("includes dynamic registry entries", async () => {
    const registry: DynamicRouteRegistryLike = {
      match: () => null,
      notFoundPage: null,
      all: () => [
        {
          id: "p1",
          slug: "first-post",
          body: "",
          title: "",
          seo_title: "",
          seo_description: "",
          template: "",
          updated_at: "2024-05-01T00:00:00.000Z",
        },
        // /404 must be skipped
        {
          id: "nf",
          slug: "404",
          body: "",
          title: "",
          seo_title: "",
          seo_description: "",
          template: "",
        },
      ],
    };
    const core = new TenCore({ canonicalBaseUrl: "https://site.com" });
    core.dynamicRegistryOverride = registry;

    const xml = await (await core.fetch(new Request("http://x/sitemap.xml")))
      .text();
    assertStringIncludes(xml, "<loc>https://site.com/first-post</loc>");
    assertStringIncludes(xml, "<lastmod>2024-05-01T00:00:00.000Z</lastmod>");
    assertEquals(xml.includes("/404"), false);
  });

  it("includes provider entries, normalizes fields, and drops foreign origins", async () => {
    const provider: SitemapEntriesProvider = () => [
      {
        loc: "https://site.com/from-provider",
        lastmod: "2024-06-15",
        changefreq: "weekly",
        priority: 5, // clamped to 1.0
      },
      { loc: "https://other.com/foreign" }, // dropped: different origin
      { path: "/bad-date", lastmod: "not-a-date" }, // lastmod omitted
    ];
    const core = new TenCore({
      canonicalBaseUrl: "https://site.com",
      sitemapEntriesProviders: [provider],
    });

    const xml = await (await core.fetch(new Request("http://x/sitemap.xml")))
      .text();
    assertStringIncludes(xml, "<loc>https://site.com/from-provider</loc>");
    assertStringIncludes(xml, "<changefreq>weekly</changefreq>");
    assertStringIncludes(xml, "<priority>1.0</priority>");
    assertStringIncludes(xml, "<loc>https://site.com/bad-date</loc>");
    assertEquals(xml.includes("other.com"), false);
  });

  it("survives a throwing provider", async () => {
    const core = new TenCore({
      canonicalBaseUrl: "https://site.com",
      routes: [route({ path: "/about" })],
      sitemapEntriesProviders: [() => {
        throw new Error("provider boom");
      }],
    });
    const res = await silenceErrors(() =>
      core.fetch(new Request("http://x/sitemap.xml"))
    );
    assertEquals(res.status, 200);
    assertStringIncludes(await res.text(), "/about");
  });

  it("derives the base URL from the request origin when no canonical is set", async () => {
    const core = new TenCore({ routes: [route({ path: "/about" })] });
    const xml = await (await core.fetch(
      new Request("https://req-origin.test/sitemap.xml"),
    )).text();
    assertStringIncludes(xml, "<loc>https://req-origin.test/about</loc>");
  });
});

describe("TenCore SEO config setters", () => {
  it("normalizes a trailing slash on the canonical base URL", async () => {
    const core = new TenCore({ routes: [route({ path: "/about" })] });
    core.canonicalBaseUrl = "https://site.com/";
    assertEquals(core.canonicalBaseUrl, "https://site.com");
    const xml = await (await core.fetch(new Request("http://x/sitemap.xml")))
      .text();
    assertStringIncludes(xml, "https://site.com/about");
  });
});
