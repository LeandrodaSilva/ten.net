import { describe, it } from "@std/testing/bdd";
import { assertEquals } from "@std/assert";
import { TenCore } from "../src/core/tenCore.ts";
import { Route } from "../src/models/Route.ts";
import type { Middleware } from "../src/middleware/middleware.ts";
import type { ErrorHandler } from "../src/core/types.ts";

// ---------------------------------------------------------------------------
// Helpers — NO Deno-specific APIs (mirrors tenCore.test.ts)
// ---------------------------------------------------------------------------

function makeRoute(overrides: {
  path: string;
  regex: RegExp;
  method?: string;
  run: (req: Request) => Response | Promise<Response>;
}): Route {
  const route = new Route({
    path: overrides.path,
    regex: overrides.regex,
    hasPage: false,
    transpiledCode: "",
    sourcePath: "",
  });
  if (overrides.method) route.method = overrides.method;
  route.run = overrides.run;
  return route;
}

// Silence the expected console.error noise these tests deliberately trigger.
function withSilencedErrors<T>(fn: () => Promise<T>): Promise<T> {
  const original = console.error;
  console.error = () => {};
  return fn().finally(() => {
    console.error = original;
  });
}

describe("TenCore error handling", () => {
  it("returns a default 500 when a route handler throws and no onError is set", async () => {
    const route = makeRoute({
      path: "/boom",
      regex: /^\/boom$/,
      method: "GET",
      run: () => {
        throw new Error("kaboom");
      },
    });
    const core = new TenCore({ routes: [route] });

    const res = await withSilencedErrors(() =>
      core.fetch(new Request("http://localhost/boom"))
    );

    assertEquals(res.status, 500);
    assertEquals(await res.text(), "Internal Server Error");
  });

  it("invokes the custom onError handler when a route handler throws", async () => {
    const route = makeRoute({
      path: "/boom",
      regex: /^\/boom$/,
      method: "GET",
      run: () => {
        throw new Error("kaboom");
      },
    });
    const core = new TenCore({ routes: [route] });

    let captured: unknown;
    core.onError((_req, error) => {
      captured = error;
      return new Response("handled", { status: 503 });
    });

    const res = await withSilencedErrors(() =>
      core.fetch(new Request("http://localhost/boom"))
    );

    assertEquals(res.status, 503);
    assertEquals(await res.text(), "handled");
    assertEquals(captured instanceof Error, true);
    assertEquals((captured as Error).message, "kaboom");
  });

  it("invokes the custom onError handler when a middleware throws", async () => {
    const core = new TenCore();
    const throwing: Middleware = () => {
      throw new Error("middleware blew up");
    };
    core.use(throwing);

    let called = false;
    core.onError(() => {
      called = true;
      return new Response("from handler", { status: 500 });
    });

    const res = await withSilencedErrors(() =>
      core.fetch(new Request("http://localhost/anything"))
    );

    assertEquals(called, true);
    assertEquals(res.status, 500);
    assertEquals(await res.text(), "from handler");
  });

  it("falls back to the default 500 when the error handler itself throws", async () => {
    const route = makeRoute({
      path: "/boom",
      regex: /^\/boom$/,
      method: "GET",
      run: () => {
        throw new Error("kaboom");
      },
    });
    const core = new TenCore({ routes: [route] });

    core.onError(() => {
      throw new Error("handler also failed");
    });

    const res = await withSilencedErrors(() =>
      core.fetch(new Request("http://localhost/boom"))
    );

    assertEquals(res.status, 500);
    assertEquals(await res.text(), "Internal Server Error");
  });

  it("accepts an error handler via the constructor options", async () => {
    const route = makeRoute({
      path: "/boom",
      regex: /^\/boom$/,
      method: "GET",
      run: () => {
        throw new Error("kaboom");
      },
    });
    const handler: ErrorHandler = () =>
      new Response("ctor handler", { status: 418 });
    const core = new TenCore({ routes: [route], errorHandler: handler });

    const res = await withSilencedErrors(() =>
      core.fetch(new Request("http://localhost/boom"))
    );

    assertEquals(res.status, 418);
    assertEquals(await res.text(), "ctor handler");
  });

  it("exposes the registered handler via the errorHandler getter", () => {
    const core = new TenCore();
    assertEquals(core.errorHandler, undefined);
    const handler: ErrorHandler = () => new Response("x");
    core.onError(handler);
    assertEquals(core.errorHandler, handler);
  });
});
