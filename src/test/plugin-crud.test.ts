import { describe, it } from "@std/testing/bdd";
import { assertEquals, assertExists, assertStringIncludes } from "@std/assert";
import { PostsPlugin } from "../plugins/postsPlugin.ts";
import { CategoriesPlugin } from "../plugins/categoriesPlugin.ts";
import { AdminPlugin } from "../plugins/adminPlugin.tsx";
import type { Route } from "../models/Route.ts";

// Helper to create a POST form request
function makeFormRequest(
  url: string,
  data: Record<string, string>,
  method = "POST",
): Request {
  const body = new URLSearchParams(data);
  return new Request(url, {
    method,
    body: body.toString(),
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
}

/** Helper: init AdminPlugin and return routes. */
async function initAdmin(
  ...plugins:
    (new () => InstanceType<typeof PostsPlugin | typeof CategoriesPlugin>)[]
): Promise<{ routes: Route[]; admin: AdminPlugin }> {
  const admin = new AdminPlugin({ storage: "memory", plugins });
  const { routes } = await admin.init();
  return { routes, admin };
}

describe("Plugin.validate()", () => {
  it("should return valid=true for fully correct data", () => {
    const plugin = new CategoriesPlugin();
    const result = plugin.validate({
      name: "Tech",
      slug: "tech",
      description: "Technology category",
    });
    assertEquals(result.valid, true);
    assertEquals(Object.keys(result.errors).length, 0);
  });

  it("should return errors for missing required string fields", () => {
    const plugin = new CategoriesPlugin();
    const result = plugin.validate({ name: "Tech" });
    assertEquals(result.valid, false);
    assertExists(result.errors.slug);
    assertExists(result.errors.description);
  });

  it("should return error for empty string value", () => {
    const plugin = new CategoriesPlugin();
    const result = plugin.validate({
      name: "",
      slug: "tech",
      description: "ok",
    });
    assertEquals(result.valid, false);
    assertExists(result.errors.name);
  });

  it("should return error for null value on required field", () => {
    const plugin = new CategoriesPlugin();
    const result = plugin.validate({
      name: null,
      slug: "tech",
      description: "ok",
    });
    assertEquals(result.valid, false);
    assertExists(result.errors.name);
  });

  it("should skip validation error for boolean fields with undefined value", () => {
    const plugin = new PostsPlugin();
    const result = plugin.validate({
      title: "My Post",
      slug: "my-post",
      excerpt: "excerpt",
      body: "body content",
      cover_image: "img.jpg",
      status: "published",
      category_ids: ["1", "2"],
      author_id: "user-1",
    });
    assertEquals(result.valid, true);
  });

  it("should return error when string field receives non-string primitive", () => {
    const plugin = new CategoriesPlugin();
    const result = plugin.validate({
      name: 123 as unknown as string,
      slug: "tech",
      description: "ok",
    });
    assertEquals(result.valid, false);
    assertExists(result.errors.name);
  });
});

describe("AdminPlugin CRUD route handlers", () => {
  it("list route returns HTML with CrudList", async () => {
    const { routes } = await initAdmin(PostsPlugin);
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
    assertStringIncludes(html, "PostPlugin");
  });

  it("list returns HTML for page query param", async () => {
    const { routes } = await initAdmin(PostsPlugin);
    const listRoute = routes.find(
      (r) => r.path === "/admin/plugins/post-plugin" && r.method === "GET",
    );
    const req = new Request(
      "http://localhost/admin/plugins/post-plugin?page=3",
    );
    const res = await listRoute!.run!(req);
    assertEquals(res.status, 200);
    assertEquals(res.headers.get("Content-Type"), "text/html");
  });

  it("create item and return 302 redirect", async () => {
    const { routes } = await initAdmin(CategoriesPlugin);
    const createRoute = routes.find(
      (r) => r.path === "/admin/plugins/category-plugin" && r.method === "POST",
    );
    assertExists(createRoute?.run);
    const req = makeFormRequest(
      "http://localhost/admin/plugins/category-plugin",
      { name: "Technology", slug: "technology", description: "Tech stuff" },
    );
    const res = await createRoute!.run!(req);
    assertEquals(res.status, 302);
    assertStringIncludes(
      res.headers.get("Location") ?? "",
      "/admin/plugins/category-plugin",
    );
    assertStringIncludes(
      res.headers.get("Location") ?? "",
      "success=created",
    );
  });

  it("create returns 400 when validation fails", async () => {
    const { routes } = await initAdmin(CategoriesPlugin);
    const createRoute = routes.find(
      (r) => r.path === "/admin/plugins/category-plugin" && r.method === "POST",
    );
    const req = makeFormRequest(
      "http://localhost/admin/plugins/category-plugin",
      { name: "" },
    );
    const res = await createRoute!.run!(req);
    assertEquals(res.status, 400);
    const body = await res.json();
    assertExists(body.errors);
  });

  it("get item returns 404 when no id in context", async () => {
    const { routes } = await initAdmin(PostsPlugin);
    const getRoute = routes.find(
      (r) => r.path === "/admin/plugins/post-plugin/[id]" && r.method === "GET",
    );
    assertExists(getRoute?.run);
    const req = new Request("http://localhost/admin/plugins/post-plugin/123");
    const res = await getRoute!.run!(req, { params: {} });
    assertEquals(res.status, 404);
  });

  it("get item returns 404 when item does not exist", async () => {
    const { routes } = await initAdmin(PostsPlugin);
    const getRoute = routes.find(
      (r) => r.path === "/admin/plugins/post-plugin/[id]" && r.method === "GET",
    );
    const req = new Request(
      "http://localhost/admin/plugins/post-plugin/non-existent-id",
    );
    const res = await getRoute!.run!(req, {
      params: { id: "non-existent-id" },
    });
    assertEquals(res.status, 404);
  });

  it("get item returns 200 with edit form when item exists", async () => {
    const { admin } = await initAdmin(PostsPlugin);
    const plugin = admin.plugins[0];
    await plugin.storage.set("known-id", {
      id: "known-id",
      title: "Test Post",
      slug: "test-post",
      excerpt: "excerpt",
      body: "body",
      cover_image: "",
      status: "draft",
      category_ids: [],
      author_id: "u1",
    });

    // Re-init to get fresh routes with seeded storage
    const { routes } = await admin.init();
    const getRoute = routes.find(
      (r) => r.path === "/admin/plugins/post-plugin/[id]" && r.method === "GET",
    );
    const req = new Request(
      "http://localhost/admin/plugins/post-plugin/known-id",
    );
    const res = await getRoute!.run!(req, { params: { id: "known-id" } });
    assertEquals(res.status, 200);
    assertEquals(res.headers.get("Content-Type"), "text/html");
    const html = await res.text();
    assertStringIncludes(html, "<!DOCTYPE html>");
    assertStringIncludes(html, "Test Post");
  });

  it("update returns 404 when no id in context", async () => {
    const { routes } = await initAdmin(PostsPlugin);
    const updateRoutes = routes.filter(
      (r) =>
        r.path === "/admin/plugins/post-plugin/[id]" && r.method === "POST",
    );
    const updateRoute = updateRoutes[0];
    assertExists(updateRoute?.run);
    const req = makeFormRequest(
      "http://localhost/admin/plugins/post-plugin/123",
      { title: "Updated" },
    );
    const res = await updateRoute!.run!(req, { params: {} });
    assertEquals(res.status, 404);
  });

  it("update returns 404 when item does not exist", async () => {
    const { routes } = await initAdmin(PostsPlugin);
    const updateRoutes = routes.filter(
      (r) =>
        r.path === "/admin/plugins/post-plugin/[id]" && r.method === "POST",
    );
    const updateRoute = updateRoutes[0];
    const req = makeFormRequest(
      "http://localhost/admin/plugins/post-plugin/no-such-id",
      { title: "Updated" },
    );
    const res = await updateRoute!.run!(req, {
      params: { id: "no-such-id" },
    });
    assertEquals(res.status, 404);
  });

  it("update item and redirect with 302", async () => {
    const { admin } = await initAdmin(PostsPlugin);
    const plugin = admin.plugins[0];
    await plugin.storage.set("update-id", {
      id: "update-id",
      title: "Original Title",
      slug: "original",
      excerpt: "e",
      body: "b",
      cover_image: "",
      status: "draft",
      category_ids: [],
      author_id: "u1",
    });

    const { routes } = await admin.init();
    const updateRoutes = routes.filter(
      (r) =>
        r.path === "/admin/plugins/post-plugin/[id]" && r.method === "POST",
    );
    const updateRoute = updateRoutes[0];
    const req = makeFormRequest(
      "http://localhost/admin/plugins/post-plugin/update-id",
      { title: "Updated Title" },
    );
    const res = await updateRoute!.run!(req, {
      params: { id: "update-id" },
    });
    assertEquals(res.status, 302);
    assertStringIncludes(
      res.headers.get("Location") ?? "",
      "success=updated",
    );
    const updated = await plugin.storage.get("update-id");
    assertEquals(updated!.title, "Updated Title");
  });

  it("delete returns 404 when no id in context", async () => {
    const { routes } = await initAdmin(PostsPlugin);
    const deleteRoute = routes.find(
      (r) => r.path === "/admin/plugins/post-plugin/[id]/delete",
    );
    assertExists(deleteRoute?.run);
    const req = new Request(
      "http://localhost/admin/plugins/post-plugin/123/delete",
      { method: "POST" },
    );
    const res = await deleteRoute!.run!(req, { params: {} });
    assertEquals(res.status, 404);
  });

  it("delete item and redirect with 302", async () => {
    const { admin } = await initAdmin(PostsPlugin);
    const plugin = admin.plugins[0];
    await plugin.storage.set("del-id", {
      id: "del-id",
      title: "To Delete",
      slug: "to-delete",
      excerpt: "",
      body: "",
      cover_image: "",
      status: "draft",
      category_ids: [],
      author_id: "u1",
    });

    const { routes } = await admin.init();
    const deleteRoute = routes.find(
      (r) => r.path === "/admin/plugins/post-plugin/[id]/delete",
    );
    const req = new Request(
      "http://localhost/admin/plugins/post-plugin/del-id/delete",
      { method: "POST" },
    );
    const res = await deleteRoute!.run!(req, { params: { id: "del-id" } });
    assertEquals(res.status, 302);
    assertStringIncludes(
      res.headers.get("Location") ?? "",
      "success=deleted",
    );
    const deleted = await plugin.storage.get("del-id");
    assertEquals(deleted, null);
  });
});

describe("AdminPlugin storage integration — full CRUD flow", () => {
  it("should create, list, update, and delete an item", async () => {
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
    const createReq = makeFormRequest(
      "http://localhost/admin/plugins/category-plugin",
      { name: "Science", slug: "science", description: "Science topics" },
    );
    const createRes = await createRoute!.run!(createReq);
    assertEquals(createRes.status, 302);

    // LIST — returns HTML; verify via storage
    const listRoute = routes.find(
      (r) => r.path === "/admin/plugins/category-plugin" && r.method === "GET",
    );
    const listReq = new Request(
      "http://localhost/admin/plugins/category-plugin",
    );
    const listRes = await listRoute!.run!(listReq);
    assertEquals(listRes.status, 200);
    assertEquals(listRes.headers.get("Content-Type"), "text/html");
    const items = await plugin.storage.list({ page: 1, limit: 20 });
    assertEquals(items.length, 1);
    const createdId = items[0].id as string;

    // GET single — returns HTML edit form
    const getRoute = routes.find(
      (r) =>
        r.path === "/admin/plugins/category-plugin/[id]" &&
        r.method === "GET",
    );
    const getReq = new Request(
      `http://localhost/admin/plugins/category-plugin/${createdId}`,
    );
    const getRes = await getRoute!.run!(getReq, {
      params: { id: createdId },
    });
    assertEquals(getRes.status, 200);
    assertEquals(getRes.headers.get("Content-Type"), "text/html");
    const getHtml = await getRes.text();
    assertStringIncludes(getHtml, "Science");

    // UPDATE
    const updateRoutes = routes.filter(
      (r) =>
        r.path === "/admin/plugins/category-plugin/[id]" &&
        r.method === "POST",
    );
    const updateRoute = updateRoutes[0];
    const updateReq = makeFormRequest(
      `http://localhost/admin/plugins/category-plugin/${createdId}`,
      { name: "Advanced Science", slug: "advanced-science" },
    );
    const updateRes = await updateRoute!.run!(updateReq, {
      params: { id: createdId },
    });
    assertEquals(updateRes.status, 302);
    const updatedItem = await plugin.storage.get(createdId);
    assertEquals(updatedItem!.name, "Advanced Science");

    // DELETE
    const deleteRoute = routes.find(
      (r) => r.path === "/admin/plugins/category-plugin/[id]/delete",
    );
    const deleteReq = new Request(
      `http://localhost/admin/plugins/category-plugin/${createdId}/delete`,
      { method: "POST" },
    );
    const deleteRes = await deleteRoute!.run!(deleteReq, {
      params: { id: createdId },
    });
    assertEquals(deleteRes.status, 302);
    const deletedItem = await plugin.storage.get(createdId);
    assertEquals(deletedItem, null);

    const finalCount = await plugin.storage.count();
    assertEquals(finalCount, 0);
  });
});
