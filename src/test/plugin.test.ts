import { describe, it } from "@std/testing/bdd";
import { assertEquals, assertStringIncludes } from "@std/assert";
import { AdminPlugin } from "../plugins/adminPlugin.tsx";
import { PagePlugin } from "../plugins/pagePlugin.ts";

describe("AdminPlugin", () => {
  it("should accept plugins in constructor", () => {
    const admin = new AdminPlugin({ plugins: [PagePlugin] });
    assertEquals(admin instanceof AdminPlugin, true);
  });

  it("should accept empty plugins", () => {
    const admin = new AdminPlugin();
    assertEquals(admin instanceof AdminPlugin, true);
  });

  it("should generate routes via init()", async () => {
    const admin = new AdminPlugin({ plugins: [PagePlugin] });
    const { routes } = await admin.init();
    assertEquals(routes.length > 0, true);
  });

  it("should generate dashboard route at /admin", async () => {
    const admin = new AdminPlugin({ plugins: [PagePlugin] });
    const { routes } = await admin.init();
    const dashRoute = routes.find(
      (r) => r.path === "/admin" && r.method === "GET",
    );
    assertEquals(dashRoute?.path, "/admin");
    assertEquals(dashRoute?.method, "GET");
    assertEquals(dashRoute?.hasPage, true);
  });

  it("should have page content in dashboard route", async () => {
    const admin = new AdminPlugin({ plugins: [PagePlugin] });
    const { routes } = await admin.init();
    const dashRoute = routes.find(
      (r) => r.path === "/admin" && r.method === "GET",
    );
    assertStringIncludes(dashRoute!.page, "<!DOCTYPE html>");
  });

  it("should have a run handler on dashboard that returns JSON", async () => {
    const admin = new AdminPlugin({ plugins: [PagePlugin] });
    const { routes } = await admin.init();
    const dashRoute = routes.find(
      (r) => r.path === "/admin" && r.method === "GET",
    );
    const req = new Request("http://localhost/admin");
    const response = dashRoute!.run!(req);
    const body = await (response as Response).json();
    assertEquals(body.plugin, "AdminPlugin");
    assertEquals(Array.isArray(body.plugins), true);
  });

  it("should generate favicon route", async () => {
    const admin = new AdminPlugin({ plugins: [PagePlugin] });
    const { routes } = await admin.init();
    const faviconRoute = routes.find(
      (r) => r.path === "/admin/favicon.ico",
    );
    assertEquals(faviconRoute?.method, "GET");
  });

  it("should generate CRUD routes for sub-plugins", async () => {
    const admin = new AdminPlugin({ plugins: [PagePlugin] });
    const { routes } = await admin.init();
    const pluginRoutes = routes.filter((r) =>
      r.path.startsWith("/admin/plugins/page-plugin")
    );
    // index GET, POST create, GET /new, GET [id], POST [id], POST [id]/delete
    assertEquals(pluginRoutes.length, 6);
  });

  it("should generate auth routes", async () => {
    const admin = new AdminPlugin({ plugins: [] });
    const { routes } = await admin.init();
    const loginGet = routes.find(
      (r) => r.path === "/admin/login" && r.method === "GET",
    );
    const loginPost = routes.find(
      (r) => r.path === "/admin/login" && r.method === "POST",
    );
    const logoutPost = routes.find(
      (r) => r.path === "/admin/logout" && r.method === "POST",
    );
    assertEquals(loginGet?.method, "GET");
    assertEquals(loginPost?.method, "POST");
    assertEquals(logoutPost?.method, "POST");
  });

  it("should return middlewares", async () => {
    const admin = new AdminPlugin({ plugins: [] });
    const { middlewares } = await admin.init();
    // securityHeaders, authMiddleware, csrfMiddleware
    assertEquals(middlewares.length, 3);
  });

  it("should expose instantiated plugins after init", async () => {
    const admin = new AdminPlugin({ plugins: [PagePlugin] });
    await admin.init();
    assertEquals(admin.plugins.length, 1);
    assertEquals(admin.plugins[0].name, "PagePlugin");
  });
});

describe("PagePlugin", () => {
  it("should have correct name", () => {
    const plugin = new PagePlugin();
    assertEquals(plugin.name, "PagePlugin");
  });

  it("should have correct description", () => {
    const plugin = new PagePlugin();
    assertEquals(plugin.description, "A plugin for handling page rendering.");
  });

  it("should have correct model", () => {
    const plugin = new PagePlugin();
    assertEquals(plugin.model, { name: "string", html: "string" });
  });

  it("should have correct slug", () => {
    const plugin = new PagePlugin();
    assertEquals(plugin.slug, "page-plugin");
  });
});
