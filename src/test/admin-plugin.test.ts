import { describe, it } from "@std/testing/bdd";
import { assertEquals, assertExists, assertStringIncludes } from "@std/assert";
import { AdminPlugin } from "../plugins/adminPlugin.tsx";
import { PagePlugin } from "../plugins/pagePlugin.ts";
import { PostsPlugin } from "../plugins/postsPlugin.ts";
import { CategoriesPlugin } from "../plugins/categoriesPlugin.ts";

describe("AdminPlugin.init()", () => {
  it("should return routes and middlewares", async () => {
    const admin = new AdminPlugin({ storage: "memory", plugins: [PagePlugin] });
    const { routes, middlewares } = await admin.init();
    assertEquals(Array.isArray(routes), true);
    assertEquals(routes.length > 0, true);
    assertEquals(Array.isArray(middlewares), true);
    assertEquals(middlewares.length, 3);
  });

  it("should generate dashboard route at /admin GET", async () => {
    const admin = new AdminPlugin({ storage: "memory", plugins: [PagePlugin] });
    const { routes } = await admin.init();
    const dash = routes.find(
      (r) => r.path === "/admin" && r.method === "GET",
    );
    assertExists(dash);
    assertEquals(dash!.hasPage, true);
    assertStringIncludes(dash!.page, "<!DOCTYPE html>");
  });

  it("should generate favicon route", async () => {
    const admin = new AdminPlugin({ storage: "memory", plugins: [PagePlugin] });
    const { routes } = await admin.init();
    const favicon = routes.find((r) => r.path === "/admin/favicon.ico");
    assertExists(favicon);
    assertEquals(favicon!.method, "GET");
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
    assertExists(loginGet);
    assertExists(loginPost);
    assertExists(logoutPost);
  });

  it("should generate 6 CRUD routes per plugin", async () => {
    const admin = new AdminPlugin({
      storage: "memory",
      plugins: [PagePlugin, PostsPlugin, CategoriesPlugin],
    });
    const { routes } = await admin.init();
    const pluginRoutes = routes.filter((r) =>
      r.path.startsWith("/admin/plugins/")
    );
    // 6 routes per plugin: list GET, create POST, /new GET, [id] GET, [id] POST, [id]/delete POST
    assertEquals(pluginRoutes.length, 18);
  });

  it("should expose instantiated plugins", async () => {
    const admin = new AdminPlugin({
      storage: "memory",
      plugins: [PagePlugin, CategoriesPlugin],
    });
    await admin.init();
    assertEquals(admin.plugins.length, 2);
    assertEquals(admin.plugins[0].name, "PagePlugin");
    assertEquals(admin.plugins[1].name, "CategoryPlugin");
  });

  it("should reuse plugin instances on re-init", async () => {
    const admin = new AdminPlugin({
      storage: "memory",
      plugins: [CategoriesPlugin],
    });
    await admin.init();
    const firstPlugin = admin.plugins[0];
    await admin.init();
    assertEquals(admin.plugins[0], firstPlugin);
  });

  it("should work with no plugins", async () => {
    const admin = new AdminPlugin({ storage: "memory" });
    const { routes, middlewares } = await admin.init();
    // Dashboard + favicon + 3 auth routes = 5
    assertEquals(routes.length, 5);
    assertEquals(middlewares.length, 3);
  });
});

describe("AdminPlugin CRUD via init() routes", () => {
  it("create item returns 302 redirect", async () => {
    const admin = new AdminPlugin({
      storage: "memory",
      plugins: [CategoriesPlugin],
    });
    const { routes } = await admin.init();
    const createRoute = routes.find(
      (r) => r.path === "/admin/plugins/category-plugin" && r.method === "POST",
    );
    assertExists(createRoute?.run);
    const body = new URLSearchParams({
      name: "Tech",
      slug: "tech",
      description: "Technology",
    });
    const req = new Request(
      "http://localhost/admin/plugins/category-plugin",
      {
        method: "POST",
        body: body.toString(),
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      },
    );
    const res = await createRoute!.run!(req);
    assertEquals(res.status, 302);
    assertStringIncludes(
      res.headers.get("Location") ?? "",
      "success=created",
    );
  });

  it("list route returns HTML", async () => {
    const admin = new AdminPlugin({
      storage: "memory",
      plugins: [PostsPlugin],
    });
    const { routes } = await admin.init();
    const listRoute = routes.find(
      (r) => r.path === "/admin/plugins/post-plugin" && r.method === "GET",
    );
    assertExists(listRoute?.run);
    const req = new Request("http://localhost/admin/plugins/post-plugin");
    const res = await listRoute!.run!(req);
    assertEquals(res.status, 200);
    assertEquals(res.headers.get("Content-Type"), "text/html");
    const html = await res.text();
    assertStringIncludes(html, "<!DOCTYPE html>");
  });

  it("delete returns 404 when item not found", async () => {
    const admin = new AdminPlugin({
      storage: "memory",
      plugins: [PostsPlugin],
    });
    const { routes } = await admin.init();
    const deleteRoute = routes.find(
      (r) => r.path === "/admin/plugins/post-plugin/[id]/delete",
    );
    assertExists(deleteRoute?.run);
    const req = new Request(
      "http://localhost/admin/plugins/post-plugin/nonexistent/delete",
      { method: "POST" },
    );
    const res = await deleteRoute!.run!(req, { params: {} });
    assertEquals(res.status, 404);
  });

  it("full CRUD lifecycle via AdminPlugin routes", async () => {
    const admin = new AdminPlugin({
      storage: "memory",
      plugins: [CategoriesPlugin],
    });
    const { routes } = await admin.init();
    const plugin = admin.plugins[0];

    // CREATE
    const createRoute = routes.find(
      (r) => r.path === "/admin/plugins/category-plugin" && r.method === "POST",
    );
    const createBody = new URLSearchParams({
      name: "Science",
      slug: "science",
      description: "Science topics",
    });
    const createRes = await createRoute!.run!(
      new Request("http://localhost/admin/plugins/category-plugin", {
        method: "POST",
        body: createBody.toString(),
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }),
    );
    assertEquals(createRes.status, 302);

    // Verify via storage
    const items = await plugin.storage.list({ page: 1, limit: 20 });
    assertEquals(items.length, 1);
    const id = items[0].id as string;

    // GET single
    const getRoute = routes.find(
      (r) =>
        r.path === "/admin/plugins/category-plugin/[id]" &&
        r.method === "GET",
    );
    const getRes = await getRoute!.run!(
      new Request(
        `http://localhost/admin/plugins/category-plugin/${id}`,
      ),
      { params: { id } },
    );
    assertEquals(getRes.status, 200);
    const html = await getRes.text();
    assertStringIncludes(html, "Science");

    // UPDATE
    const updateRoute = routes.filter(
      (r) =>
        r.path === "/admin/plugins/category-plugin/[id]" &&
        r.method === "POST",
    )[0];
    const updateBody = new URLSearchParams({ name: "Advanced Science" });
    const updateRes = await updateRoute!.run!(
      new Request(
        `http://localhost/admin/plugins/category-plugin/${id}`,
        {
          method: "POST",
          body: updateBody.toString(),
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        },
      ),
      { params: { id } },
    );
    assertEquals(updateRes.status, 302);
    const updated = await plugin.storage.get(id);
    assertEquals(updated!.name, "Advanced Science");

    // DELETE
    const deleteRoute = routes.find(
      (r) => r.path === "/admin/plugins/category-plugin/[id]/delete",
    );
    const deleteRes = await deleteRoute!.run!(
      new Request(
        `http://localhost/admin/plugins/category-plugin/${id}/delete`,
        { method: "POST" },
      ),
      { params: { id } },
    );
    assertEquals(deleteRes.status, 302);
    const deleted = await plugin.storage.get(id);
    assertEquals(deleted, null);
  });
});
