import { describe, it } from "@std/testing/bdd";
import { assertEquals } from "@std/assert";
import { Ten } from "../src/ten.ts";
import type { Route } from "../src/models/Route.ts";
import { stubDeno } from "./_deno_stub.ts";

describe("Ten without admin (no useAdmin)", () => {
  it("should start with only file-based routes", async () => {
    const app = Ten.net({ appPath: "./example/http/app" });

    const restoreServe = stubDeno("serve", () => ({
      finished: Promise.resolve(),
      ref: () => {},
      unref: () => {},
    }));

    const logSpy = console.log;
    const infoSpy = console.info;
    console.log = () => {};
    console.info = () => {};

    try {
      await app.start({ gracefulShutdown: false });
      const routes = (app as unknown as { _routes: Route[] })._routes;
      // Only file-based routes from app/, no admin routes
      const adminRoutes = routes.filter((r) => r.path.startsWith("/admin"));
      assertEquals(adminRoutes.length, 0);
    } finally {
      restoreServe();
      console.log = logSpy;
      console.info = infoSpy;
    }
  });

  it("should return 404 for /admin", async () => {
    const app = Ten.net({ appPath: "./example/http/app" });
    const handler = (app as unknown as {
      _handleRequest: (req: Request) => Promise<Response>;
    })._handleRequest.bind(app);

    const response = await handler(
      new Request("http://localhost/admin"),
    );
    assertEquals(response.status, 404);
  });

  it("should return 404 for /admin/login", async () => {
    const app = Ten.net({ appPath: "./example/http/app" });
    const handler = (app as unknown as {
      _handleRequest: (req: Request) => Promise<Response>;
    })._handleRequest.bind(app);

    const response = await handler(
      new Request("http://localhost/admin/login"),
    );
    assertEquals(response.status, 404);
  });

  it("should return 404 for /admin/favicon.ico", async () => {
    const app = Ten.net({ appPath: "./example/http/app" });
    const handler = (app as unknown as {
      _handleRequest: (req: Request) => Promise<Response>;
    })._handleRequest.bind(app);

    const response = await handler(
      new Request("http://localhost/admin/favicon.ico"),
    );
    assertEquals(response.status, 404);
  });

  it("should have no middlewares without useAdmin", () => {
    const app = Ten.net({ appPath: "./example/http/app" });
    const middlewares = (app as unknown as { _middlewares: unknown[] })
      ._middlewares;
    assertEquals(middlewares.length, 0);
  });
});
