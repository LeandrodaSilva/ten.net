import { describe, it } from "@std/testing/bdd";
import { assertEquals } from "@std/assert";
import { viewEngine } from "../src/viewEngine.ts";
import { Route } from "../src/models/Route.ts";

// Admin routes skip layout/document filesystem reads (isAdmin derives from the
// "/admin" path prefix), so these tests exercise the shell cache without
// touching the filesystem.
function adminViewRoute(path: string, page: string): Route {
  const route = new Route({
    path,
    regex: new RegExp(`^${path}$`),
    hasPage: true,
    transpiledCode: "",
    sourcePath: "",
  });
  route.method = "GET";
  route.page = page;
  route.run = () =>
    new Response(JSON.stringify({ name: "World" }), {
      headers: { "Content-Type": "application/json" },
    });
  return route;
}

describe("viewEngine shell cache", () => {
  it("renders variables against the assembled shell", async () => {
    const route = adminViewRoute("/admin/w", "<h1>Hello {{name}}!</h1>");
    const html = await viewEngine({
      _appPath: "",
      route,
      req: new Request("http://localhost/admin/w"),
      params: {},
    });
    assertEquals(html, "<h1>Hello World!</h1>");
  });

  it("populates the cache with the pre-substitution shell", async () => {
    const route = adminViewRoute("/admin/w", "<h1>Hello {{name}}!</h1>");
    const shellCache = new Map<string, string>();

    await viewEngine({
      _appPath: "",
      route,
      req: new Request("http://localhost/admin/w"),
      params: {},
      shellCache,
    });

    assertEquals(shellCache.get("/admin/w"), "<h1>Hello {{name}}!</h1>");
  });

  it("reuses the cached shell instead of rebuilding it", async () => {
    const route = adminViewRoute("/admin/w", "<h1>Hello {{name}}!</h1>");
    const shellCache = new Map<string, string>();

    const first = await viewEngine({
      _appPath: "",
      route,
      req: new Request("http://localhost/admin/w"),
      params: {},
      shellCache,
    });
    assertEquals(first, "<h1>Hello World!</h1>");

    // Mutating the page after caching must NOT affect the rendered output,
    // proving the cached shell is reused rather than rebuilt.
    route.page = "<h2>changed {{name}}</h2>";
    const second = await viewEngine({
      _appPath: "",
      route,
      req: new Request("http://localhost/admin/w"),
      params: {},
      shellCache,
    });
    assertEquals(second, "<h1>Hello World!</h1>");
  });

  it("rebuilds every time when no cache is provided", async () => {
    const route = adminViewRoute("/admin/w", "<h1>Hello {{name}}!</h1>");

    const first = await viewEngine({
      _appPath: "",
      route,
      req: new Request("http://localhost/admin/w"),
      params: {},
    });
    assertEquals(first, "<h1>Hello World!</h1>");

    route.page = "<h2>changed {{name}}</h2>";
    const second = await viewEngine({
      _appPath: "",
      route,
      req: new Request("http://localhost/admin/w"),
      params: {},
    });
    assertEquals(second, "<h2>changed World</h2>");
  });
});
