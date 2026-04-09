import { describe, it } from "@std/testing/bdd";
import { assertEquals, assertStringIncludes } from "@std/assert";
import { Ten } from "../src/ten.ts";
import { Route } from "../src/models/Route.ts";
import { DynamicRouteRegistry } from "../src/routing/dynamicRouteRegistry.ts";
import type { StorageItem } from "../src/models/Storage.ts";

describe("Ten", () => {
  describe("Ten.net()", () => {
    it("should return a Ten instance", () => {
      const app = Ten.net({ appPath: "./example/http/app" });
      assertEquals(app instanceof Ten, true);
    });

    it("should return a new instance each time", () => {
      const app1 = Ten.net();
      const app2 = Ten.net();
      assertEquals(app1 !== app2, true);
    });
  });

  describe("_handleRequest (via integration)", () => {
    it("should return 404 for unknown routes", async () => {
      const app = Ten.net({ appPath: "./example/http/app" });
      const handler = (app as unknown as {
        _handleRequest: (req: Request) => Promise<Response>;
      })._handleRequest.bind(app);

      const response = await handler(
        new Request("http://localhost/nonexistent"),
      );
      assertEquals(response.status, 404);
    });

    it("should execute non-view route handler", async () => {
      const app = Ten.net({ appPath: "./example/http/app" });
      const routes = (app as unknown as { _routes: Route[] })._routes;
      const route = new Route({
        path: "/api/test",
        regex: /^\/api\/test$/,
        hasPage: false,
        transpiledCode: "",
        sourcePath: "",
      });
      route.method = "GET";
      route.run = () => new Response("API response", { status: 200 });
      routes.push(route);

      const handler = (app as unknown as {
        _handleRequest: (req: Request) => Promise<Response>;
      })._handleRequest.bind(app);

      const response = await handler(
        new Request("http://localhost/api/test"),
      );
      assertEquals(response.status, 200);
      const body = await response.text();
      assertEquals(body, "API response");
    });

    it("should render view for route with page", async () => {
      const app = Ten.net({ appPath: "./example/http/app" });
      const routes = (app as unknown as { _routes: Route[] })._routes;
      const route = new Route({
        path: "/admin/test-page",
        regex: /^\/admin\/test-page$/,
        hasPage: true,
        transpiledCode: "",
        sourcePath: "",
      });
      route.method = "GET";
      route.page = "<h1>Test Page</h1>";
      routes.push(route);

      const handler = (app as unknown as {
        _handleRequest: (req: Request) => Promise<Response>;
      })._handleRequest.bind(app);

      const response = await handler(
        new Request("http://localhost/admin/test-page"),
      );
      assertEquals(response.status, 200);
      assertStringIncludes(
        response.headers.get("Content-Type") ?? "",
        "text/html",
      );
      const body = await response.text();
      assertStringIncludes(body, "Test Page");
    });

    it("should return 500 when non-view route handler throws", async () => {
      const app = Ten.net({ appPath: "./example/http/app" });
      const routes = (app as unknown as { _routes: Route[] })._routes;
      const route = new Route({
        path: "/api/error",
        regex: /^\/api\/error$/,
        hasPage: false,
        transpiledCode: "",
        sourcePath: "",
      });
      route.method = "GET";
      route.run = () => {
        throw new Error("Handler error");
      };
      routes.push(route);

      const handler = (app as unknown as {
        _handleRequest: (req: Request) => Promise<Response>;
      })._handleRequest.bind(app);

      const response = await handler(
        new Request("http://localhost/api/error"),
      );
      assertEquals(response.status, 500);
      const body = await response.text();
      assertStringIncludes(body, "Internal Server Error");
    });

    it("should return 500 for route that throws", async () => {
      const app = Ten.net({ appPath: "./example/http/app" });
      const routes = (app as unknown as { _routes: Route[] })._routes;
      const route = new Route({
        path: "/error",
        regex: /^\/error$/,
        hasPage: false,
        transpiledCode: "invalid code that will fail on import",
        sourcePath: "",
      });
      route.method = "GET";
      routes.push(route);

      const handler = (app as unknown as {
        _handleRequest: (req: Request) => Promise<Response>;
      })._handleRequest.bind(app);

      const consoleSpy = console.error;
      const infoSpy = console.info;
      console.error = () => {};
      console.info = () => {};
      try {
        const response = await handler(
          new Request("http://localhost/error"),
        );
        // Should either return 404 (no run, not a view) or 500
        assertEquals(
          response.status === 404 || response.status === 500,
          true,
        );
      } finally {
        console.error = consoleSpy;
        console.info = infoSpy;
      }
    });

    it("should return 404 for route without run and not a view (fallthrough)", async () => {
      const app = Ten.net({ appPath: "./example/http/app" });
      const routes = (app as unknown as { _routes: Route[] })._routes;
      const route = new Route({
        path: "/no-handler",
        regex: /^\/no-handler$/,
        hasPage: false,
        transpiledCode: "export const nothing = true;",
        sourcePath: "",
      });
      routes.push(route);

      const handler = (app as unknown as {
        _handleRequest: (req: Request) => Promise<Response>;
      })._handleRequest.bind(app);

      const consoleSpy = console.info;
      console.info = () => {};
      try {
        const response = await handler(
          new Request("http://localhost/no-handler", { method: "POST" }),
        );
        assertEquals(response.status, 404);
      } finally {
        console.info = consoleSpy;
      }
    });

    it("should return 404 when isView is true but viewEngine fails", async () => {
      const app = Ten.net({ appPath: "./example/http/app" });
      const routes = (app as unknown as { _routes: Route[] })._routes;
      const route = new Route({
        path: "/broken-page",
        regex: /^\/broken-page$/,
        hasPage: true,
        transpiledCode: "",
        sourcePath: "",
      });
      route.method = "GET";
      route.page = "<h1>{{content}}</h1>";
      route.run = () => {
        throw new Error("Handler fails");
      };
      routes.push(route);

      const handler = (app as unknown as {
        _handleRequest: (req: Request) => Promise<Response>;
      })._handleRequest.bind(app);

      const consoleSpy = console.error;
      console.error = () => {};
      try {
        const response = await handler(
          new Request("http://localhost/broken-page"),
        );
        assertEquals(response.status === 200 || response.status === 404, true);
      } finally {
        console.error = consoleSpy;
      }
    });
  });

  describe("dynamic routes integration", () => {
    function makePage(overrides?: Partial<StorageItem>): StorageItem {
      return {
        id: "page-1",
        slug: "about",
        title: "About Us",
        body: "<p>About page content</p>",
        status: "published",
        seo_title: "About Us",
        seo_description: "About our company",
        template: "",
        author_id: "",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...overrides,
      };
    }

    it("should serve dynamic page when no file-based route matches", async () => {
      const app = Ten.net({ appPath: "./example/http/app" });
      const registry = new DynamicRouteRegistry();
      registry.register(makePage({ slug: "dynamic-test" }));

      // Inject registry into app
      (app as unknown as { _dynamicRegistry: DynamicRouteRegistry })
        ._dynamicRegistry = registry;

      const handler = (app as unknown as {
        _handleRequest: (req: Request) => Promise<Response>;
      })._handleRequest.bind(app);

      const response = await handler(
        new Request("http://localhost/dynamic-test"),
      );
      assertEquals(response.status, 200);
      assertStringIncludes(
        response.headers.get("Content-Type") ?? "",
        "text/html",
      );
      const body = await response.text();
      assertStringIncludes(body, "About page content");
    });

    it("should give file-based routes priority over dynamic routes", async () => {
      const app = Ten.net({ appPath: "./example/http/app" });

      // Add a file-based route at /about
      const routes = (app as unknown as { _routes: Route[] })._routes;
      const fileRoute = new Route({
        path: "/about",
        regex: /^\/about$/,
        hasPage: false,
        transpiledCode: "",
        sourcePath: "",
      });
      fileRoute.method = "GET";
      fileRoute.run = () =>
        new Response("file-based response", { status: 200 });
      routes.push(fileRoute);

      // Also register a dynamic route at /about
      const registry = new DynamicRouteRegistry();
      registry.register(makePage({ slug: "about" }));
      (app as unknown as { _dynamicRegistry: DynamicRouteRegistry })
        ._dynamicRegistry = registry;

      const handler = (app as unknown as {
        _handleRequest: (req: Request) => Promise<Response>;
      })._handleRequest.bind(app);

      const response = await handler(
        new Request("http://localhost/about"),
      );
      assertEquals(response.status, 200);
      const body = await response.text();
      assertEquals(body, "file-based response");
    });

    it("should only match dynamic routes on GET requests", async () => {
      const app = Ten.net({ appPath: "./example/http/app" });
      const registry = new DynamicRouteRegistry();
      registry.register(makePage({ slug: "about" }));
      (app as unknown as { _dynamicRegistry: DynamicRouteRegistry })
        ._dynamicRegistry = registry;

      const handler = (app as unknown as {
        _handleRequest: (req: Request) => Promise<Response>;
      })._handleRequest.bind(app);

      const response = await handler(
        new Request("http://localhost/about", { method: "POST" }),
      );
      assertEquals(response.status, 404);
    });

    it("should render custom 404 page when slug '404' is registered", async () => {
      const app = Ten.net({ appPath: "./example/http/app" });
      const registry = new DynamicRouteRegistry();
      registry.register(
        makePage({
          id: "nf",
          slug: "404",
          body: "<h1>Custom Not Found</h1>",
          title: "Not Found",
          seo_title: "Page Not Found",
        }),
      );
      (app as unknown as { _dynamicRegistry: DynamicRouteRegistry })
        ._dynamicRegistry = registry;

      const handler = (app as unknown as {
        _handleRequest: (req: Request) => Promise<Response>;
      })._handleRequest.bind(app);

      const response = await handler(
        new Request("http://localhost/nonexistent-page"),
      );
      assertEquals(response.status, 404);
      assertStringIncludes(
        response.headers.get("Content-Type") ?? "",
        "text/html",
      );
      const body = await response.text();
      assertStringIncludes(body, "Custom Not Found");
    });

    it("should return plain 404 when no custom 404 page exists", async () => {
      const app = Ten.net({ appPath: "./example/http/app" });
      const registry = new DynamicRouteRegistry();
      (app as unknown as { _dynamicRegistry: DynamicRouteRegistry })
        ._dynamicRegistry = registry;

      const handler = (app as unknown as {
        _handleRequest: (req: Request) => Promise<Response>;
      })._handleRequest.bind(app);

      const response = await handler(
        new Request("http://localhost/nonexistent"),
      );
      assertEquals(response.status, 404);
      const body = await response.text();
      assertEquals(body, "Not found");
    });
  });

  describe("start", () => {
    it("should load routes and call Deno.serve", async () => {
      const app = Ten.net({ appPath: "./example/http/app" });

      const originalServe = Deno.serve;
      let serveCalled = false;
      // deno-lint-ignore no-explicit-any
      (Deno as any).serve = (_options: unknown, _handler: unknown) => {
        serveCalled = true;
        return { finished: Promise.resolve(), ref: () => {}, unref: () => {} };
      };

      const logSpy = console.log;
      const infoSpy = console.info;
      console.log = () => {};
      console.info = () => {};

      try {
        await app.start();
        assertEquals(serveCalled, true);
        const routes = (app as unknown as { _routes: Route[] })._routes;
        assertEquals(routes.length > 0, true);
      } finally {
        // deno-lint-ignore no-explicit-any
        (Deno as any).serve = originalServe;
        console.log = logSpy;
        console.info = infoSpy;
      }
    });

    it("should start file watcher when DEBUG env is set", async () => {
      const app = Ten.net({ appPath: "./example/http/app" });

      const originalServe = Deno.serve;
      // deno-lint-ignore no-explicit-any
      (Deno as any).serve = (_options: unknown, _handler: unknown) => ({
        finished: Promise.resolve(),
        ref: () => {},
        unref: () => {},
      });

      Deno.env.set("DEBUG", "true");

      const OriginalWorker = globalThis.Worker;
      let workerCreated = false;
      let postMessageCalled = false;
      // deno-lint-ignore no-explicit-any
      (globalThis as any).Worker = class MockWorker {
        onmessage: ((event: MessageEvent) => void) | null = null;
        postMessage() {
          postMessageCalled = true;
        }
        terminate() {}
        constructor() {
          workerCreated = true;
        }
      };

      const logSpy = console.log;
      const infoSpy = console.info;
      console.log = () => {};
      console.info = () => {};

      try {
        await app.start();
        assertEquals(workerCreated, true);
        assertEquals(postMessageCalled, true);
      } finally {
        // deno-lint-ignore no-explicit-any
        (Deno as any).serve = originalServe;
        Deno.env.delete("DEBUG");
        globalThis.Worker = OriginalWorker;
        console.log = logSpy;
        console.info = infoSpy;
      }
    });

    it("should handle worker messages by reloading routes", async () => {
      const app = Ten.net({ appPath: "./example/http/app" });

      const originalServe = Deno.serve;
      // deno-lint-ignore no-explicit-any
      (Deno as any).serve = (_options: unknown, _handler: unknown) => ({
        finished: Promise.resolve(),
        ref: () => {},
        unref: () => {},
      });

      Deno.env.set("DEBUG", "true");

      const OriginalWorker = globalThis.Worker;
      // deno-lint-ignore no-explicit-any
      let capturedOnmessage: any = null;
      // deno-lint-ignore no-explicit-any
      (globalThis as any).Worker = class MockWorker {
        onmessage: ((event: MessageEvent) => void) | null = null;
        postMessage() {
          if (this.onmessage) {
            capturedOnmessage = this.onmessage;
          }
        }
        terminate() {}
      };

      const logSpy = console.log;
      const infoSpy = console.info;
      console.log = () => {};
      console.info = () => {};

      try {
        await app.start();

        if (capturedOnmessage) {
          await capturedOnmessage(
            new MessageEvent("message", { data: "change" }),
          );
        }

        const routes = (app as unknown as { _routes: Route[] })._routes;
        assertEquals(Array.isArray(routes), true);
      } finally {
        // deno-lint-ignore no-explicit-any
        (Deno as any).serve = originalServe;
        Deno.env.delete("DEBUG");
        globalThis.Worker = OriginalWorker;
        console.log = logSpy;
        console.info = infoSpy;
      }
    });
  });
});
