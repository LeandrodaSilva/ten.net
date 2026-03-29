import { describe, it } from "@std/testing/bdd";
import { assertEquals, assertStringIncludes } from "@std/assert";
import { AdminPlugin } from "../plugins/adminPlugin.tsx";
import { PagePlugin } from "../plugins/pagePlugin.ts";

describe("AdminPlugin", () => {
  it("should accept plugins in constructor", () => {
    const admin = new AdminPlugin({ storage: "memory", plugins: [PagePlugin] });
    assertEquals(admin instanceof AdminPlugin, true);
  });

  it("should accept empty plugins", () => {
    const admin = new AdminPlugin({ storage: "memory" });
    assertEquals(admin instanceof AdminPlugin, true);
  });

  it("should generate routes via init()", async () => {
    const admin = new AdminPlugin({ storage: "memory", plugins: [PagePlugin] });
    const { routes } = await admin.init();
    assertEquals(routes.length > 0, true);
  });

  it("should generate dashboard route at /admin", async () => {
    const admin = new AdminPlugin({ storage: "memory", plugins: [PagePlugin] });
    const { routes } = await admin.init();
    const dashRoute = routes.find(
      (r) => r.path === "/admin" && r.method === "GET",
    );
    assertEquals(dashRoute?.path, "/admin");
    assertEquals(dashRoute?.method, "GET");
    assertEquals(dashRoute?.hasPage, true);
  });

  it("should have page content in dashboard route", async () => {
    const admin = new AdminPlugin({ storage: "memory", plugins: [PagePlugin] });
    const { routes } = await admin.init();
    const dashRoute = routes.find(
      (r) => r.path === "/admin" && r.method === "GET",
    );
    assertStringIncludes(dashRoute!.page, "<!DOCTYPE html>");
  });

  it("should have a run handler on dashboard that returns JSON", async () => {
    const admin = new AdminPlugin({ storage: "memory", plugins: [PagePlugin] });
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
    const admin = new AdminPlugin({ storage: "memory", plugins: [PagePlugin] });
    const { routes } = await admin.init();
    const faviconRoute = routes.find(
      (r) => r.path === "/admin/favicon.ico",
    );
    assertEquals(faviconRoute?.method, "GET");
  });

  it("should generate CRUD routes for sub-plugins", async () => {
    const admin = new AdminPlugin({ storage: "memory", plugins: [PagePlugin] });
    const { routes } = await admin.init();
    const pluginRoutes = routes.filter((r) =>
      r.path.startsWith("/admin/plugins/page-plugin")
    );
    // index GET, POST create, GET /new, GET [id], POST [id], POST [id]/delete
    assertEquals(pluginRoutes.length, 6);
  });

  it("should generate auth routes", async () => {
    const admin = new AdminPlugin({ storage: "memory", plugins: [] });
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
    const admin = new AdminPlugin({ storage: "memory", plugins: [] });
    const { middlewares } = await admin.init();
    // securityHeaders, authMiddleware, csrfMiddleware
    assertEquals(middlewares.length, 3);
  });

  it("should expose instantiated plugins after init", async () => {
    const admin = new AdminPlugin({ storage: "memory", plugins: [PagePlugin] });
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
    assertEquals(
      plugin.description,
      "Dynamic pages managed from the admin panel.",
    );
  });

  it("should have correct model", () => {
    const plugin = new PagePlugin();
    assertEquals(plugin.model, {
      slug: "string",
      title: "string",
      body: "string",
      status: "string",
      seo_title: "string",
      seo_description: "string",
      template: "string",
      author_id: "string",
    });
  });

  it("should have correct slug", () => {
    const plugin = new PagePlugin();
    assertEquals(plugin.slug, "page-plugin");
  });

  describe("validate()", () => {
    it("should pass for valid draft page", () => {
      const plugin = new PagePlugin();
      const result = plugin.validate({
        slug: "about-us",
        title: "About Us",
        body: "",
        status: "draft",
        seo_title: "",
        seo_description: "",
        template: "",
        author_id: "",
      });
      // body, seo_title, seo_description, template, author_id are empty but draft is ok
      assertEquals(result.errors.slug, undefined);
      assertEquals(result.errors.status, undefined);
    });

    it("should reject invalid slug format", () => {
      const plugin = new PagePlugin();
      const result = plugin.validate({
        slug: "About Us!",
        title: "About",
        body: "content",
        status: "draft",
        seo_title: "",
        seo_description: "",
        template: "",
        author_id: "",
      });
      assertEquals(result.valid, false);
      assertEquals(
        result.errors.slug,
        "slug must be lowercase alphanumeric with hyphens (e.g. my-page)",
      );
    });

    it("should reject invalid status", () => {
      const plugin = new PagePlugin();
      const result = plugin.validate({
        slug: "test",
        title: "Test",
        body: "content",
        status: "archived",
        seo_title: "",
        seo_description: "",
        template: "",
        author_id: "",
      });
      assertEquals(result.valid, false);
      assertEquals(result.errors.status, "status must be draft or published");
    });

    it("should require body when status is published", () => {
      const plugin = new PagePlugin();
      const result = plugin.validate({
        slug: "test",
        title: "Test",
        body: "",
        status: "published",
        seo_title: "",
        seo_description: "",
        template: "",
        author_id: "",
      });
      assertEquals(result.valid, false);
      assertEquals(
        result.errors.body,
        "body is required when status is published",
      );
    });

    it("should pass for valid published page with body", () => {
      const plugin = new PagePlugin();
      const result = plugin.validate({
        slug: "hello-world",
        title: "Hello World",
        body: "<p>Welcome</p>",
        status: "published",
        seo_title: "Hello",
        seo_description: "A page",
        template: "default",
        author_id: "user-1",
      });
      assertEquals(result.valid, true);
      assertEquals(Object.keys(result.errors).length, 0);
    });

    it("should allow body to be empty for draft", () => {
      const plugin = new PagePlugin();
      const result = plugin.validate({
        slug: "draft-page",
        title: "Draft",
        body: "",
        status: "draft",
        seo_title: "",
        seo_description: "",
        template: "",
        author_id: "",
      });
      // body is not required for drafts
      assertEquals(result.errors.body, undefined);
    });
  });
});
