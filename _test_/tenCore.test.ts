import { describe, it } from "@std/testing/bdd";
import { assertEquals, assertStringIncludes } from "@std/assert";
import { TenCore } from "../src/core/tenCore.ts";
import { Route } from "../src/models/Route.ts";
import type { AppManifest } from "../src/build/manifest.ts";
import type {
  AdminPluginLikeCore,
  DynamicRouteLike,
  DynamicRouteRegistryLike,
} from "../src/core/types.ts";
import type { Middleware } from "../src/middleware/middleware.ts";

// ---------------------------------------------------------------------------
// Helpers — NO Deno-specific APIs
// ---------------------------------------------------------------------------

function makeRoute(overrides: {
  path: string;
  regex: RegExp;
  method?: string;
  hasPage?: boolean;
  page?: string;
  run?: (
    req: Request,
    ctx?: { params: Record<string, string> },
  ) => Response | Promise<Response>;
}): Route {
  const route = new Route({
    path: overrides.path,
    regex: overrides.regex,
    hasPage: overrides.hasPage ?? false,
    transpiledCode: "",
    sourcePath: "",
  });
  if (overrides.method) route.method = overrides.method;
  if (overrides.page !== undefined) route.page = overrides.page;
  if (overrides.run) route.run = overrides.run;
  return route;
}

function makeManifest(overrides?: Partial<AppManifest>): AppManifest {
  return {
    routes: [
      {
        path: "/embedded",
        regexSource: "^\\/embedded$",
        regexFlags: "",
        hasPage: false,
        transpiledCode:
          'export function GET() { return new Response("embedded route"); }',
        pageContent: "",
      },
    ],
    layouts: {},
    documentHtml: "<html><body>{{content}}</body></html>",
    assets: {},
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("TenCore", () => {
  describe("fetch() basics", () => {
    it("should return 404 for unknown routes", async () => {
      const core = new TenCore();
      const res = await core.fetch(new Request("http://localhost/nonexistent"));
      assertEquals(res.status, 404);
      assertEquals(await res.text(), "Not found");
    });

    it("should route to correct handler via options.routes", async () => {
      const route = makeRoute({
        path: "/api/hello",
        regex: /^\/api\/hello$/,
        method: "GET",
        run: () => new Response("hello from core", { status: 200 }),
      });

      const core = new TenCore({ routes: [route] });
      const res = await core.fetch(
        new Request("http://localhost/api/hello"),
      );
      assertEquals(res.status, 200);
      assertEquals(await res.text(), "hello from core");
    });

    it("should not match route when HTTP method differs", async () => {
      const route = makeRoute({
        path: "/api/only-get",
        regex: /^\/api\/only-get$/,
        method: "GET",
        run: () => new Response("ok"),
      });

      const core = new TenCore({ routes: [route] });
      const res = await core.fetch(
        new Request("http://localhost/api/only-get", { method: "POST" }),
      );
      assertEquals(res.status, 404);
    });
  });

  describe("embedded manifest", () => {
    it("should load routes from AppManifest on first fetch", async () => {
      const manifest = makeManifest();
      const core = new TenCore({ embedded: manifest });

      // Before fetch, embedded routes not yet loaded
      assertEquals(core.routes.length, 0);

      const res = await core.fetch(
        new Request("http://localhost/embedded"),
      );
      // After fetch (auto-init), route is loaded
      assertEquals(core.routes.length > 0, true);
      // The embedded route's transpiled code uses dynamic import so won't run;
      // but the route IS matched — resulting in an import attempt.
      // Since transpiledCode is minimal JS, it may succeed or fail.
      // We just verify the route was found (not a plain 404 "Not found").
      assertEquals(
        res.status !== 404 || (await res.clone().text()) !== "Not found",
        true,
      );
    });

    it("should serve embedded assets with correct Content-Type", async () => {
      const cssContent = "body { color: red; }";
      const cssBase64 = btoa(cssContent);

      const manifest = makeManifest({
        routes: [],
        assets: {
          "/styles.css": {
            mimeType: "text/css",
            dataBase64: cssBase64,
          },
        },
      });

      const core = new TenCore({ embedded: manifest });
      const res = await core.fetch(
        new Request("http://localhost/styles.css"),
      );
      assertEquals(res.status, 200);
      assertEquals(res.headers.get("Content-Type"), "text/css");
      const body = await res.text();
      assertEquals(body, cssContent);
    });

    it("should set Cache-Control on embedded assets", async () => {
      const manifest = makeManifest({
        routes: [],
        assets: {
          "/img.png": {
            mimeType: "image/png",
            dataBase64: btoa("fake-png"),
          },
        },
      });

      const core = new TenCore({ embedded: manifest });
      const res = await core.fetch(
        new Request("http://localhost/img.png"),
      );
      assertEquals(res.status, 200);
      assertStringIncludes(
        res.headers.get("Cache-Control") ?? "",
        "public",
      );
    });
  });

  describe("use() middleware chain", () => {
    it("should execute middlewares in registration order", async () => {
      const order: string[] = [];

      const mw1: Middleware = async (_req, next) => {
        order.push("mw1-before");
        const res = await next();
        order.push("mw1-after");
        return res;
      };
      const mw2: Middleware = async (_req, next) => {
        order.push("mw2-before");
        const res = await next();
        order.push("mw2-after");
        return res;
      };

      const route = makeRoute({
        path: "/mw-test",
        regex: /^\/mw-test$/,
        method: "GET",
        run: () => {
          order.push("handler");
          return new Response("ok");
        },
      });

      const core = new TenCore({ routes: [route] });
      core.use(mw1);
      core.use(mw2);

      await core.fetch(new Request("http://localhost/mw-test"));

      assertEquals(order, [
        "mw1-before",
        "mw2-before",
        "handler",
        "mw2-after",
        "mw1-after",
      ]);
    });

    it("should allow middleware to short-circuit the chain", async () => {
      const mw: Middleware = () => {
        return Promise.resolve(new Response("blocked", { status: 403 }));
      };

      const core = new TenCore();
      core.use(mw);

      const res = await core.fetch(
        new Request("http://localhost/anything"),
      );
      assertEquals(res.status, 403);
      assertEquals(await res.text(), "blocked");
    });
  });

  describe("useAdmin()", () => {
    it("should register routes and middlewares from admin plugin", async () => {
      const adminRoute = makeRoute({
        path: "/admin/dashboard",
        regex: /^\/admin\/dashboard$/,
        method: "GET",
        run: () => new Response("admin dashboard"),
      });

      const adminMw: Middleware = async (_req, next) => {
        return await next();
      };

      const mockAdmin: AdminPluginLikeCore = {
        init: () =>
          Promise.resolve({
            routes: [adminRoute],
            middlewares: [adminMw],
          }),
      };

      const core = new TenCore();
      await core.useAdmin(mockAdmin);

      assertEquals(core.routes.length, 1);
      assertEquals(core.routes[0].path, "/admin/dashboard");
      assertEquals(core.middlewares.length, 1);

      const res = await core.fetch(
        new Request("http://localhost/admin/dashboard"),
      );
      assertEquals(res.status, 200);
      assertEquals(await res.text(), "admin dashboard");
    });

    it("should register dynamic registry from admin plugin", async () => {
      const mockRegistry: DynamicRouteRegistryLike = {
        match: () => null,
        notFoundPage: null,
      };

      const mockAdmin: AdminPluginLikeCore = {
        init: () =>
          Promise.resolve({
            routes: [],
            middlewares: [],
            dynamicRegistry: mockRegistry,
          }),
      };

      const core = new TenCore();
      await core.useAdmin(mockAdmin);

      assertEquals(core.dynamicRegistry, mockRegistry);
    });
  });

  describe("dynamic route registry", () => {
    it("should serve dynamic page when registry matches", async () => {
      const dynamicRoute: DynamicRouteLike = {
        id: "page-1",
        body: "<p>Dynamic content</p>",
        title: "Dynamic Page",
        seo_title: "Dynamic",
        seo_description: "A dynamic page",
        template: "",
      };

      const registry: DynamicRouteRegistryLike = {
        match: (path: string) => path === "/dynamic-page" ? dynamicRoute : null,
        notFoundPage: null,
      };

      const core = new TenCore();
      core.dynamicRegistryOverride = registry;
      core.setDynamicPageRenderer((route) => {
        return Promise.resolve(`<html>${route.body}</html>`);
      });

      const res = await core.fetch(
        new Request("http://localhost/dynamic-page"),
      );
      assertEquals(res.status, 200);
      assertEquals(res.headers.get("Content-Type"), "text/html");
      assertStringIncludes(await res.text(), "Dynamic content");
    });

    it("should only match dynamic routes on GET", async () => {
      const registry: DynamicRouteRegistryLike = {
        match: () => ({
          id: "1",
          body: "x",
          title: "x",
          seo_title: "",
          seo_description: "",
          template: "",
        }),
        notFoundPage: null,
      };

      const core = new TenCore();
      core.dynamicRegistryOverride = registry;

      const res = await core.fetch(
        new Request("http://localhost/any", { method: "POST" }),
      );
      assertEquals(res.status, 404);
    });
  });

  describe("custom 404 with notFoundPage", () => {
    it("should render custom 404 page", async () => {
      const notFoundRoute: DynamicRouteLike = {
        id: "nf",
        body: "<h1>Custom 404</h1>",
        title: "Not Found",
        seo_title: "Not Found",
        seo_description: "",
        template: "",
      };

      const registry: DynamicRouteRegistryLike = {
        match: () => null,
        notFoundPage: notFoundRoute,
      };

      const core = new TenCore();
      core.dynamicRegistryOverride = registry;
      core.setDynamicPageRenderer((route) => {
        return Promise.resolve(`<html>${route.body}</html>`);
      });

      const res = await core.fetch(
        new Request("http://localhost/nonexistent"),
      );
      assertEquals(res.status, 404);
      assertEquals(res.headers.get("Content-Type"), "text/html");
      assertStringIncludes(await res.text(), "Custom 404");
    });
  });

  describe("auto-init (lazy)", () => {
    it("should initialize on first fetch call", async () => {
      const manifest = makeManifest();
      const core = new TenCore({ embedded: manifest });

      // Routes empty before fetch
      assertEquals(core.routes.length, 0);

      // First fetch triggers init
      await core.fetch(new Request("http://localhost/whatever"));

      // After fetch, embedded routes are loaded
      assertEquals(core.routes.length > 0, true);
    });

    it("should not re-initialize on subsequent fetches", async () => {
      const manifest = makeManifest();
      const core = new TenCore({ embedded: manifest });

      await core.fetch(new Request("http://localhost/a"));
      const countAfterFirst = core.routes.length;

      await core.fetch(new Request("http://localhost/b"));
      assertEquals(core.routes.length, countAfterFirst);
    });
  });

  describe("custom base64 decoder", () => {
    it("should use injected decoder for embedded assets", async () => {
      let decoderCalled = false;

      const customDecoder = (base64: string): Uint8Array => {
        decoderCalled = true;
        const bin = atob(base64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) {
          bytes[i] = bin.charCodeAt(i);
        }
        return bytes;
      };

      const manifest = makeManifest({
        routes: [],
        assets: {
          "/custom.txt": {
            mimeType: "text/plain",
            dataBase64: btoa("custom decoded"),
          },
        },
      });

      const core = new TenCore({
        embedded: manifest,
        decodeBase64: customDecoder,
      });

      const res = await core.fetch(
        new Request("http://localhost/custom.txt"),
      );
      assertEquals(res.status, 200);
      assertEquals(decoderCalled, true);
      assertEquals(await res.text(), "custom decoded");
    });
  });

  describe("route management", () => {
    it("should add routes via addRoutes()", async () => {
      const core = new TenCore();
      const route = makeRoute({
        path: "/added",
        regex: /^\/added$/,
        method: "GET",
        run: () => new Response("added"),
      });

      core.addRoutes([route]);
      assertEquals(core.routes.length, 1);

      const res = await core.fetch(new Request("http://localhost/added"));
      assertEquals(res.status, 200);
      assertEquals(await res.text(), "added");
    });

    it("should clear routes via clearRoutes()", () => {
      const core = new TenCore({
        routes: [
          makeRoute({
            path: "/a",
            regex: /^\/a$/,
            run: () => new Response("a"),
          }),
        ],
      });
      assertEquals(core.routes.length, 1);
      core.clearRoutes();
      assertEquals(core.routes.length, 0);
    });
  });

  describe("error handling", () => {
    it("should return 500 when route handler throws", async () => {
      const route = makeRoute({
        path: "/error",
        regex: /^\/error$/,
        method: "GET",
        run: () => {
          throw new Error("boom");
        },
      });

      const core = new TenCore({ routes: [route] });

      const errorSpy = console.error;
      console.error = () => {};
      try {
        const res = await core.fetch(
          new Request("http://localhost/error"),
        );
        assertEquals(res.status, 500);
        assertStringIncludes(await res.text(), "Internal Server Error");
      } finally {
        console.error = errorSpy;
      }
    });
  });
});
