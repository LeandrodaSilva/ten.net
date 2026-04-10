import { describe, it } from "@std/testing/bdd";
import { assertEquals } from "@std/assert";
import { Route } from "../src/models/Route.ts";

function createRoute(
  overrides?: Partial<{
    path: string;
    regex: RegExp;
    hasPage: boolean;
    transpiledCode: string;
    sourcePath: string;
  }>,
) {
  return new Route({
    path: overrides?.path ?? "/test",
    regex: overrides?.regex ?? /^\/test$/,
    hasPage: overrides?.hasPage ?? false,
    transpiledCode: overrides?.transpiledCode ?? "",
    sourcePath: overrides?.sourcePath ?? "./app/test/route.ts",
  });
}

describe("Route", () => {
  describe("constructor", () => {
    it("should set all properties from args", () => {
      const route = createRoute({
        path: "/users",
        hasPage: true,
        transpiledCode: "const x = 1;",
        sourcePath: "./app/users/route.ts",
      });
      assertEquals(route.path, "/users");
      assertEquals(route.hasPage, true);
      assertEquals(route.transpiledCode, "const x = 1;");
      assertEquals(route.sourcePath, "./app/users/route.ts");
    });

    it("should have default method ALL", () => {
      const route = createRoute();
      assertEquals(route.method, "ALL");
    });
  });

  describe("method setter/getter", () => {
    it("should accept valid HTTP methods", () => {
      const methods = [
        "GET",
        "POST",
        "PUT",
        "DELETE",
        "PATCH",
        "OPTIONS",
        "HEAD",
        "ALL",
      ];
      for (const m of methods) {
        const route = createRoute();
        route.method = m;
        assertEquals(route.method, m);
      }
    });

    it("should accept lowercase methods and convert to uppercase", () => {
      const route = createRoute();
      route.method = "get";
      assertEquals(route.method, "GET");
    });

    it("should ignore invalid methods", () => {
      const route = createRoute();
      route.method = "INVALID";
      assertEquals(route.method, "ALL");
    });
  });

  describe("isAdmin", () => {
    it("should return true for /admin path", () => {
      const route = createRoute({ path: "/admin" });
      assertEquals(route.isAdmin, true);
    });

    it("should return true for /admin/foo path", () => {
      const route = createRoute({ path: "/admin/plugins/test" });
      assertEquals(route.isAdmin, true);
    });

    it("should return false for non-admin paths", () => {
      const route = createRoute({ path: "/" });
      assertEquals(route.isAdmin, false);
    });

    it("should return false for path containing admin but not starting with /admin", () => {
      const route = createRoute({ path: "/user/admin" });
      assertEquals(route.isAdmin, false);
    });
  });

  describe("run getter/setter", () => {
    it("should be undefined by default", () => {
      const route = createRoute();
      assertEquals(route.run, undefined);
    });

    it("should store and retrieve a handler function", () => {
      const route = createRoute();
      const handler = (_req: Request) => new Response("ok");
      route.run = handler;
      assertEquals(route.run, handler);
    });

    it("should allow setting to undefined", () => {
      const route = createRoute();
      route.run = (_req: Request) => new Response("ok");
      route.run = undefined;
      assertEquals(route.run, undefined);
    });
  });

  describe("page getter/setter", () => {
    it("should be empty string by default", () => {
      const route = createRoute();
      assertEquals(route.page, "");
    });

    it("should store and retrieve HTML content", () => {
      const route = createRoute();
      route.page = "<h1>Hello</h1>";
      assertEquals(route.page, "<h1>Hello</h1>");
    });
  });

  describe("isView", () => {
    it("should return true when hasPage is true and method is GET", () => {
      const route = createRoute({ hasPage: true });
      route.method = "GET";
      assertEquals(route.isView, true);
    });

    it("should return false when hasPage is true but method is POST", () => {
      const route = createRoute({ hasPage: true });
      route.method = "POST";
      assertEquals(route.isView, false);
    });

    it("should return false when hasPage is false and method is GET", () => {
      const route = createRoute({ hasPage: false });
      route.method = "GET";
      assertEquals(route.isView, false);
    });

    it("should return false when hasPage is false and method is default ALL", () => {
      const route = createRoute({ hasPage: false });
      assertEquals(route.isView, false);
    });
  });

  describe("import", () => {
    it("should return existing run if already set", async () => {
      const route = createRoute();
      const handler = (_req: Request) => new Response("existing");
      route.run = handler;
      const result = await route.import();
      assertEquals(result, handler);
    });

    it("should import a module from transpiled code and extract method", async () => {
      const route = createRoute({
        transpiledCode:
          "export function GET(req) { return new Response('hi'); }",
      });
      route.method = "GET";
      const consoleSpy = console.info;
      console.info = () => {};
      try {
        const fn = await route.import();
        assertEquals(typeof fn, "function");
      } finally {
        console.info = consoleSpy;
      }
    });

    it("should return undefined for invalid transpiled code", async () => {
      const route = createRoute({
        transpiledCode: "invalid javascript {{{}}}",
      });
      route.method = "GET";
      const consoleSpy = console.error;
      console.error = () => {};
      try {
        const fn = await route.import();
        assertEquals(fn, undefined);
      } finally {
        console.error = consoleSpy;
      }
    });

    it("should return undefined when module is empty and has no page", async () => {
      const route = createRoute({
        transpiledCode: "",
        hasPage: false,
      });
      route.method = "GET";
      const consoleSpy = console.error;
      const infoSpy = console.info;
      console.error = () => {};
      console.info = () => {};
      try {
        const fn = await route.import();
        assertEquals(fn, undefined);
      } finally {
        console.error = consoleSpy;
        console.info = infoSpy;
      }
    });

    it("should return undefined when method does not exist in module", async () => {
      const route = createRoute({
        transpiledCode:
          "export function POST(req) { return new Response('post'); }",
      });
      route.method = "GET";
      const infoSpy = console.info;
      console.info = () => {};
      try {
        const fn = await route.import();
        assertEquals(fn, undefined);
      } finally {
        console.info = infoSpy;
      }
    });

    it("should import bundled-style code with separate export block", async () => {
      const bundledCode = [
        'function GET(_req) { return new Response(JSON.stringify({ name: "Leandro" }), { headers: { "Content-Type": "application/json" } }); }',
        "export { GET };",
      ].join("\n");

      const route = createRoute({ transpiledCode: bundledCode });
      route.method = "GET";
      const infoSpy = console.info;
      console.info = () => {};
      try {
        const fn = await route.import();
        assertEquals(typeof fn, "function");

        const res = await fn!(new Request("http://localhost/hello"));
        const body = await res.json();
        assertEquals(body.name, "Leandro");
      } finally {
        console.info = infoSpy;
      }
    });

    it("should return the imported handler without mutating route.run", async () => {
      const route = createRoute({
        transpiledCode: 'export function GET() { return new Response("ok"); }',
      });
      route.method = "GET";
      assertEquals(route.run, undefined);

      const infoSpy = console.info;
      console.info = () => {};
      try {
        const fn = await route.import();
        assertEquals(typeof fn, "function");
        assertEquals(route.run, undefined);
      } finally {
        console.info = infoSpy;
      }
    });

    it("should cache handlers by HTTP method", async () => {
      const route = createRoute({
        transpiledCode: [
          'export function GET() { return new Response("get"); }',
          'export function POST() { return new Response("post"); }',
        ].join("\n"),
      });

      const getFn = await route.import("GET");
      const postFn = await route.import("POST");
      const getFnAgain = await route.import("GET");

      assertEquals(getFn, getFnAgain);
      assertEquals(
        await (await getFn!(new Request("http://localhost/"))).text(),
        "get",
      );
      assertEquals(
        await (await postFn!(
          new Request("http://localhost/", { method: "POST" }),
        )).text(),
        "post",
      );
    });
  });
});
