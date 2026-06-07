import { describe, it } from "@std/testing/bdd";
import { assertEquals } from "@std/assert";
import { TenCore } from "../src/core/tenCore.ts";
import { Route } from "../src/models/Route.ts";

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

function okRoute(): Route {
  return makeRoute({
    path: "/x",
    regex: /^\/x$/,
    method: "GET",
    run: () => new Response("route", { status: 200 }),
  });
}

function throwingRoute(): Route {
  return makeRoute({
    path: "/x",
    regex: /^\/x$/,
    method: "GET",
    run: () => {
      throw new Error("kaboom");
    },
  });
}

function silenceErrors<T>(fn: () => Promise<T>): Promise<T> {
  const original = console.error;
  console.error = () => {};
  return fn().finally(() => {
    console.error = original;
  });
}

describe("TenCore lifecycle hooks", () => {
  describe("onRequest", () => {
    it("short-circuits the pipeline when it returns a Response", async () => {
      const core = new TenCore({ routes: [okRoute()] });
      core.onRequest(() => new Response("early", { status: 201 }));

      const res = await core.fetch(new Request("http://localhost/x"));
      assertEquals(res.status, 201);
      assertEquals(await res.text(), "early");
    });

    it("continues to routing when it returns undefined", async () => {
      const core = new TenCore({ routes: [okRoute()] });
      let called = false;
      core.onRequest(() => {
        called = true;
      });

      const res = await core.fetch(new Request("http://localhost/x"));
      assertEquals(called, true);
      assertEquals(res.status, 200);
      assertEquals(await res.text(), "route");
    });

    it("runs hooks in order and the first Response wins", async () => {
      const core = new TenCore({ routes: [okRoute()] });
      const order: number[] = [];
      core.onRequest(() => {
        order.push(1);
      });
      core.onRequest(() => {
        order.push(2);
        return new Response("from-2", { status: 202 });
      });
      core.onRequest(() => {
        order.push(3);
      });

      const res = await core.fetch(new Request("http://localhost/x"));
      assertEquals(order, [1, 2]);
      assertEquals(res.status, 202);
      assertEquals(await res.text(), "from-2");
    });
  });

  describe("onResponse", () => {
    it("can replace the response (interceptor)", async () => {
      const core = new TenCore({ routes: [okRoute()] });
      core.onResponse((_req, res) => {
        const headers = new Headers(res.headers);
        headers.set("X-Intercepted", "yes");
        return new Response(res.body, { status: res.status, headers });
      });

      const res = await core.fetch(new Request("http://localhost/x"));
      assertEquals(res.status, 200);
      assertEquals(res.headers.get("X-Intercepted"), "yes");
    });

    it("runs in order, threading the response through each hook", async () => {
      const core = new TenCore({ routes: [okRoute()] });
      core.onResponse((_req, res) => {
        const h = new Headers(res.headers);
        h.set("X-Order", "1");
        return new Response(res.body, { status: res.status, headers: h });
      });
      core.onResponse((_req, res) => {
        const h = new Headers(res.headers);
        h.set("X-Order", `${h.get("X-Order")},2`);
        return new Response(res.body, { status: res.status, headers: h });
      });

      const res = await core.fetch(new Request("http://localhost/x"));
      assertEquals(res.headers.get("X-Order"), "1,2");
    });

    it("applies to 404 responses", async () => {
      const core = new TenCore();
      core.onResponse((_req, res) => {
        const h = new Headers(res.headers);
        h.set("X-Seen", "404");
        return new Response(res.body, { status: res.status, headers: h });
      });

      const res = await core.fetch(new Request("http://localhost/missing"));
      assertEquals(res.status, 404);
      assertEquals(res.headers.get("X-Seen"), "404");
    });

    it("applies to error responses", async () => {
      const core = new TenCore({ routes: [throwingRoute()] });
      core.onResponse((_req, res) => {
        const h = new Headers(res.headers);
        h.set("X-Seen", "error");
        return new Response(res.body, { status: res.status, headers: h });
      });

      const res = await silenceErrors(() =>
        core.fetch(new Request("http://localhost/x"))
      );
      assertEquals(res.status, 500);
      assertEquals(res.headers.get("X-Seen"), "error");
    });

    it("keeps the response when a hook returns undefined", async () => {
      const core = new TenCore({ routes: [okRoute()] });
      core.onResponse(() => {});

      const res = await core.fetch(new Request("http://localhost/x"));
      assertEquals(res.status, 200);
      assertEquals(await res.text(), "route");
    });

    it("is resilient to a throwing hook", async () => {
      const core = new TenCore({ routes: [okRoute()] });
      core.onResponse(() => {
        throw new Error("hook boom");
      });
      let secondRan = false;
      core.onResponse((_req, res) => {
        secondRan = true;
        return res;
      });

      const res = await silenceErrors(() =>
        core.fetch(new Request("http://localhost/x"))
      );
      assertEquals(res.status, 200);
      assertEquals(secondRan, true);
    });
  });

  describe("runShutdownHooks", () => {
    it("runs hooks in registration order", async () => {
      const core = new TenCore();
      const order: number[] = [];
      core.onShutdown(() => {
        order.push(1);
      });
      core.onShutdown(async () => {
        await Promise.resolve();
        order.push(2);
      });

      await core.runShutdownHooks();
      assertEquals(order, [1, 2]);
    });

    it("continues when a hook throws", async () => {
      const core = new TenCore();
      let secondRan = false;
      core.onShutdown(() => {
        throw new Error("cleanup boom");
      });
      core.onShutdown(() => {
        secondRan = true;
      });

      await silenceErrors(() => core.runShutdownHooks());
      assertEquals(secondRan, true);
    });
  });

  describe("events bus", () => {
    it("exposes a shared EventEmitter that delivers events", async () => {
      const core = new TenCore();
      let payload: unknown;
      core.events.on("page:published", (slug) => {
        payload = slug;
      });

      await core.events.emit("page:published", "/about");
      assertEquals(payload, "/about");
    });

    it("returns the same emitter instance on each access", () => {
      const core = new TenCore();
      assertEquals(core.events, core.events);
    });
  });
});
