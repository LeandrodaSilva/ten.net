import { describe, it } from "@std/testing/bdd";
import { assertEquals, assertStringIncludes } from "@std/assert";
import type { Route } from "../../packages/core/src/models/Route.ts";
import { addSeoRoutes } from "../../packages/admin/src/plugins/admin/seo.ts";
import { renderDynamicPage } from "../../packages/core/src/routing/dynamicPageHandler.ts";
import type { StorageItem } from "../../packages/core/src/models/Storage.ts";
import type { AdminContext } from "../../packages/admin/src/plugins/admin/context.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a minimal AdminContext with optional overrides. */
function createCtx(
  overrides?: Partial<AdminContext>,
): AdminContext {
  return {
    kv: null,
    plugins: [],
    appPath: "./app",
    sessionStore: {} as AdminContext["sessionStore"],
    userStore: {} as AdminContext["userStore"],
    ...overrides,
  };
}

/** Invoke addSeoRoutes and return the routes array. */
function buildSeoRoutes(ctx: AdminContext): Route[] {
  const routes: Route[] = [];
  addSeoRoutes(ctx, routes);
  return routes;
}

/** Find a route by path from the array. */
function findRoute(routes: Route[], path: string): Route | undefined {
  return routes.find((r) => r.path === path);
}

// ---------------------------------------------------------------------------
// 1. sitemap.xml
// ---------------------------------------------------------------------------

describe("SEO — sitemap.xml", () => {
  it("addSeoRoutes registers a /sitemap.xml route", () => {
    const routes = buildSeoRoutes(createCtx());
    const route = findRoute(routes, "/sitemap.xml");
    assertEquals(route !== undefined, true);
    assertEquals(route!.method, "GET");
  });

  it("sitemap contains homepage /", async () => {
    const routes = buildSeoRoutes(createCtx());
    const route = findRoute(routes, "/sitemap.xml")!;
    const res = await route.run!(new Request("http://localhost/sitemap.xml"));
    const body = await res.text();
    assertStringIncludes(body, "<loc>http://localhost/</loc>");
  });

  it("sitemap contains published pages from dynamicRegistry", async () => {
    const fakeDynamic = {
      all: () => [
        { slug: "about", title: "About" },
        { slug: "contact", title: "Contact" },
      ],
    };
    const ctx = createCtx({
      dynamicRegistry:
        fakeDynamic as unknown as AdminContext["dynamicRegistry"],
    });
    const routes = buildSeoRoutes(ctx);
    const route = findRoute(routes, "/sitemap.xml")!;
    const res = await route.run!(new Request("http://localhost/sitemap.xml"));
    const body = await res.text();
    assertStringIncludes(body, "<loc>http://localhost/about</loc>");
    assertStringIncludes(body, "<loc>http://localhost/contact</loc>");
  });

  it("sitemap contains published blog posts from blogRegistry", async () => {
    const fakeBlog = {
      listPublished: (
        { page: _p, limit: _l }: { page: number; limit: number },
      ) => ({
        posts: [
          { slug: "hello-world", published_at: "2026-01-15T10:00:00Z" },
          { slug: "second-post", published_at: null },
        ],
        totalPages: 1,
      }),
    };
    const ctx = createCtx({
      blogRegistry: fakeBlog as unknown as AdminContext["blogRegistry"],
    });
    const routes = buildSeoRoutes(ctx);
    const route = findRoute(routes, "/sitemap.xml")!;
    const res = await route.run!(new Request("http://localhost/sitemap.xml"));
    const body = await res.text();
    assertStringIncludes(body, "<loc>http://localhost/blog/hello-world</loc>");
    assertStringIncludes(body, "<lastmod>2026-01-15</lastmod>");
    assertStringIncludes(body, "<loc>http://localhost/blog/second-post</loc>");
  });

  it("sitemap has Content-Type text/xml", async () => {
    const routes = buildSeoRoutes(createCtx());
    const route = findRoute(routes, "/sitemap.xml")!;
    const res = await route.run!(new Request("http://localhost/sitemap.xml"));
    assertEquals(res.headers.get("Content-Type"), "text/xml; charset=utf-8");
  });
});

// ---------------------------------------------------------------------------
// 2. robots.txt
// ---------------------------------------------------------------------------

describe("SEO — robots.txt", () => {
  it("addSeoRoutes registers a /robots.txt route", () => {
    const routes = buildSeoRoutes(createCtx());
    const route = findRoute(routes, "/robots.txt");
    assertEquals(route !== undefined, true);
    assertEquals(route!.method, "GET");
  });

  it("robots.txt contains Disallow: /admin/", () => {
    const routes = buildSeoRoutes(createCtx());
    const route = findRoute(routes, "/robots.txt")!;
    const res = route.run!(
      new Request("http://localhost/robots.txt"),
    ) as Response;
    const body = res.text();
    return body.then((text) => {
      assertStringIncludes(text, "Disallow: /admin/");
    });
  });

  it("robots.txt contains Sitemap: with URL", () => {
    const routes = buildSeoRoutes(createCtx());
    const route = findRoute(routes, "/robots.txt")!;
    const res = route.run!(
      new Request("http://localhost/robots.txt"),
    ) as Response;
    return res.text().then((text) => {
      assertStringIncludes(text, "Sitemap: http://localhost/sitemap.xml");
    });
  });

  it("robots.txt has Content-Type text/plain", () => {
    const routes = buildSeoRoutes(createCtx());
    const route = findRoute(routes, "/robots.txt")!;
    const res = route.run!(
      new Request("http://localhost/robots.txt"),
    ) as Response;
    assertEquals(res.headers.get("Content-Type"), "text/plain");
  });
});

// ---------------------------------------------------------------------------
// 3. Open Graph in dynamicPageHandler
// ---------------------------------------------------------------------------

describe("SEO — Open Graph meta tags", () => {
  /** Create a temp directory with a minimal document.html for renderDynamicPage. */
  async function withTempApp(
    fn: (appPath: string) => Promise<void>,
  ): Promise<void> {
    const dir = await Deno.makeTempDir();
    const docHtml =
      `<!DOCTYPE html><html><head><title>Test</title></head><body>{{content}}</body></html>`;
    await Deno.writeTextFile(`${dir}/document.html`, docHtml);
    try {
      await fn(dir);
    } finally {
      await Deno.remove(dir, { recursive: true });
    }
  }

  /** Build a minimal StorageItem for testing. */
  function makeItem(overrides?: Partial<StorageItem>): StorageItem {
    return {
      id: "page-1",
      title: "Test Page",
      body: "<p>Hello</p>",
      seo_title: "SEO Title",
      seo_description: "SEO Description",
      template: "",
      slug: "test",
      status: "published",
      ...overrides,
    };
  }

  it("injects og:title when seo_title present", async () => {
    await withTempApp(async (appPath) => {
      const html = await renderDynamicPage(makeItem(), appPath);
      assertStringIncludes(html, 'property="og:title"');
      assertStringIncludes(html, 'content="SEO Title"');
    });
  });

  it("injects og:description when seo_description present", async () => {
    await withTempApp(async (appPath) => {
      const html = await renderDynamicPage(makeItem(), appPath);
      assertStringIncludes(html, 'property="og:description"');
      assertStringIncludes(html, 'content="SEO Description"');
    });
  });

  it("injects og:url when options.url provided", async () => {
    await withTempApp(async (appPath) => {
      const html = await renderDynamicPage(makeItem(), appPath, undefined, {
        url: "http://example.com/test",
      });
      assertStringIncludes(html, 'property="og:url"');
      assertStringIncludes(html, 'content="http://example.com/test"');
    });
  });

  it("injects og:type with default 'website'", async () => {
    await withTempApp(async (appPath) => {
      const html = await renderDynamicPage(makeItem(), appPath);
      assertStringIncludes(html, 'property="og:type"');
      assertStringIncludes(html, 'content="website"');
    });
  });

  it("injects og:type 'article' when specified", async () => {
    await withTempApp(async (appPath) => {
      const html = await renderDynamicPage(makeItem(), appPath, undefined, {
        type: "article",
      });
      assertStringIncludes(html, 'content="article"');
    });
  });

  it("injects og:image when options.ogImage provided", async () => {
    await withTempApp(async (appPath) => {
      const html = await renderDynamicPage(makeItem(), appPath, undefined, {
        ogImage: "http://example.com/image.jpg",
      });
      assertStringIncludes(html, 'property="og:image"');
      assertStringIncludes(html, 'content="http://example.com/image.jpg"');
    });
  });

  it("twitter:card is 'summary' without image", async () => {
    await withTempApp(async (appPath) => {
      const html = await renderDynamicPage(makeItem(), appPath);
      assertStringIncludes(html, 'name="twitter:card" content="summary"');
    });
  });

  it("twitter:card is 'summary_large_image' with image", async () => {
    await withTempApp(async (appPath) => {
      const html = await renderDynamicPage(makeItem(), appPath, undefined, {
        ogImage: "http://example.com/hero.png",
      });
      assertStringIncludes(
        html,
        'name="twitter:card" content="summary_large_image"',
      );
    });
  });

  it("HTML-escapes values in meta tag attributes", async () => {
    await withTempApp(async (appPath) => {
      const item = makeItem({
        seo_title: 'Title with "quotes" & <tags>',
        seo_description: 'Desc with "special" & <chars>',
      });
      const html = await renderDynamicPage(item, appPath);
      // Attribute values should be escaped (& → &amp;, " → &quot;, < → &lt;, > → &gt;)
      assertStringIncludes(html, "&quot;quotes&quot;");
      assertStringIncludes(html, "&amp;");
      assertStringIncludes(html, "&lt;tags&gt;");
    });
  });
});
