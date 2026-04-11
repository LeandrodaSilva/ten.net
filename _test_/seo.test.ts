import {
  assertEquals,
  assertNotMatch,
  assertStringIncludes,
} from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { Route } from "../src/models/Route.ts";
import { DynamicRouteRegistry } from "../src/routing/dynamicRouteRegistry.ts";
import { Ten } from "../src/ten.ts";
import { getRegexRoute } from "../src/utils/getRegexRoute.ts";

function makeRoute(overrides: {
  path: string;
  method?: string;
  hasPage?: boolean;
  page?: string;
  sourcePath?: string;
}): Route {
  const route = new Route({
    path: overrides.path,
    regex: getRegexRoute(overrides.path),
    hasPage: overrides.hasPage ?? false,
    transpiledCode: "",
    sourcePath: overrides.sourcePath ?? "app/route.ts",
  });
  route.method = overrides.method ?? "GET";
  if (overrides.page !== undefined) {
    route.page = overrides.page;
  }
  return route;
}

function getRoutes(app: Ten): Route[] {
  return (app as unknown as { _routes: Route[] })._routes;
}

function setDynamicRegistry(app: Ten, registry: DynamicRouteRegistry): void {
  (app as unknown as { _dynamicRegistry: DynamicRouteRegistry })
    ._dynamicRegistry = registry;
}

async function handle(app: Ten, url: string): Promise<Response> {
  return await (app as unknown as {
    _handleRequest: (req: Request) => Promise<Response>;
  })._handleRequest(new Request(url));
}

describe("SEO endpoints", () => {
  it("auto-generates sitemap.xml from public static, dynamic, and plugin routes", async () => {
    const app = Ten.net({ appPath: "./example/http/app" });
    app.setCanonicalBaseUrl("https://example.com");

    const routes = getRoutes(app);
    routes.push(
      makeRoute({ path: "/" }),
      makeRoute({ path: "/about" }),
      makeRoute({ path: "/admin", sourcePath: "app/admin/route.ts" }),
      makeRoute({ path: "/contact", method: "POST" }),
      makeRoute({ path: "/docs", hasPage: true, page: "<h1>Docs</h1>" }),
      makeRoute({
        path: "/posts/[slug]",
        sourcePath: "app/posts/[slug]/route.ts",
      }),
      makeRoute({ path: "/_internal", sourcePath: "app/_internal/route.ts" }),
      makeRoute({
        path: "/preview/post",
        sourcePath: "app/preview/post/route.ts",
      }),
    );

    const registry = new DynamicRouteRegistry();
    registry.register({
      id: "page-1",
      slug: "dynamic-page",
      title: "Dynamic Page",
      body: "<p>Hello</p>",
      status: "published",
      seo_title: "Dynamic Page",
      seo_description: "A published dynamic page",
      template: "",
      author_id: "",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    setDynamicRegistry(app, registry);

    await app.useAdmin({
      init: () => Promise.resolve({ routes: [], middlewares: [] }),
      getSitemapEntries: () =>
        Promise.resolve([{ path: "/plugin-page", priority: 0.8 }]),
    });

    const response = await handle(app, "http://localhost/sitemap.xml");
    const xml = await response.text();

    assertEquals(response.status, 200);
    assertEquals(
      response.headers.get("Content-Type"),
      "application/xml; charset=utf-8",
    );
    assertStringIncludes(xml, "<urlset");
    assertStringIncludes(xml, "<loc>https://example.com/</loc>");
    assertStringIncludes(xml, "<loc>https://example.com/about</loc>");
    assertStringIncludes(xml, "<loc>https://example.com/dynamic-page</loc>");
    assertStringIncludes(xml, "<loc>https://example.com/plugin-page</loc>");
    assertNotMatch(xml, /https:\/\/example\.com\/admin/);
    assertNotMatch(xml, /https:\/\/example\.com\/contact/);
    assertNotMatch(xml, /https:\/\/example\.com\/docs/);
    assertNotMatch(xml, /https:\/\/example\.com\/posts\/\[slug\]/);
    assertNotMatch(xml, /https:\/\/example\.com\/_internal/);
    assertNotMatch(xml, /https:\/\/example\.com\/preview\/post/);
    assertNotMatch(xml, /https:\/\/example\.com\/robots\.txt/);
    assertNotMatch(xml, /https:\/\/example\.com\/sitemap\.xml/);
  });

  it("auto-generates robots.txt and disallows all crawling outside production", async () => {
    const app = Ten.net({ appPath: "./example/http/app" });
    app.setCanonicalBaseUrl("https://example.com");
    app.setEnvironment("development");

    const response = await handle(app, "http://localhost/robots.txt");
    const body = await response.text();

    assertEquals(response.status, 200);
    assertEquals(
      response.headers.get("Content-Type"),
      "text/plain; charset=utf-8",
    );
    assertStringIncludes(body, "User-agent: *");
    assertStringIncludes(body, "Disallow: /");
    assertStringIncludes(body, "Sitemap: https://example.com/sitemap.xml");
  });

  it("auto-generates robots.txt with production disallow rules", async () => {
    const app = Ten.net({ appPath: "./example/http/app" });
    app.setCanonicalBaseUrl("https://example.com");
    app.setEnvironment("production");

    const response = await handle(app, "http://localhost/robots.txt");
    const body = await response.text();

    assertEquals(response.status, 200);
    assertStringIncludes(body, "Disallow: /admin");
    assertStringIncludes(body, "Disallow: /admin/");
    assertStringIncludes(body, "Disallow: /auth/");
    assertStringIncludes(body, "Disallow: /account/");
    assertStringIncludes(body, "Disallow: /preview/");
    assertStringIncludes(body, "Disallow: /draft/");
    assertStringIncludes(body, "Disallow: /_/");
    assertNotMatch(body, /^Disallow: \/$/m);
    assertStringIncludes(body, "Sitemap: https://example.com/sitemap.xml");
  });
});
