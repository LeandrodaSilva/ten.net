import { describe, it } from "@std/testing/bdd";
import { assertEquals, assertExists, assertStringIncludes } from "@std/assert";
import { AdminPlugin } from "../plugins/adminPlugin.tsx";
import { PostsPlugin } from "../plugins/postsPlugin.ts";
import { CategoriesPlugin } from "../plugins/categoriesPlugin.ts";
import type { Route } from "../models/Route.ts";

/** Helper to create a POST form request. */
function makeFormRequest(
  url: string,
  data: Record<string, string>,
): Request {
  const body = new URLSearchParams(data);
  return new Request(url, {
    method: "POST",
    body: body.toString(),
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
}

/** Init admin with PostsPlugin + CategoriesPlugin in memory mode. */
async function initBlogAdmin(): Promise<{
  routes: Route[];
  admin: AdminPlugin;
}> {
  const admin = new AdminPlugin({
    storage: "memory",
    plugins: [PostsPlugin, CategoriesPlugin],
  });
  const { routes } = await admin.init();
  return { routes, admin };
}

describe("Blog hot-registration — create/update/delete", () => {
  it("should register published post in BlogRouteRegistry on create", async () => {
    const { routes, admin } = await initBlogAdmin();
    const registry = admin.blogRegistry!;
    assertExists(registry);
    assertEquals(registry.size, 0);

    const createRoute = routes.find(
      (r) => r.path === "/admin/plugins/post-plugin" && r.method === "POST",
    );
    assertExists(createRoute?.run);

    const req = makeFormRequest(
      "http://localhost/admin/plugins/post-plugin",
      {
        title: "Published Post",
        slug: "published-post",
        excerpt: "Excerpt",
        body: "Body content",
        cover_image: "",
        status: "published",
        category_ids: "",
        author_id: "",
        published_at: "",
      },
    );
    const res = await createRoute!.run!(req);
    assertEquals(res.status, 302);

    // Post should now be in the registry
    assertEquals(registry.size, 1);
    const matched = registry.match("/blog/published-post");
    assertExists(matched);
    assertEquals(matched!.title, "Published Post");
  });

  it("should NOT register draft post in BlogRouteRegistry on create", async () => {
    const { routes, admin } = await initBlogAdmin();
    const registry = admin.blogRegistry!;

    const createRoute = routes.find(
      (r) => r.path === "/admin/plugins/post-plugin" && r.method === "POST",
    );
    const req = makeFormRequest(
      "http://localhost/admin/plugins/post-plugin",
      {
        title: "Draft Post",
        slug: "draft-post",
        excerpt: "",
        body: "",
        cover_image: "",
        status: "draft",
        category_ids: "",
        author_id: "",
        published_at: "",
      },
    );
    const res = await createRoute!.run!(req);
    assertEquals(res.status, 302);
    assertEquals(registry.size, 0);
  });

  it("should unregister post when changed from published to draft", async () => {
    // Seed the post BEFORE init so loadFromStorage picks it up
    const admin = new AdminPlugin({
      storage: "memory",
      plugins: [PostsPlugin, CategoriesPlugin],
    });
    // First init to get plugins instantiated
    await admin.init();
    const plugin = admin.plugins.find((p) => p.name === "PostPlugin")!;

    // Seed a published post in storage
    await plugin.storage.set("post-1", {
      id: "post-1",
      title: "Live Post",
      slug: "live-post",
      excerpt: "",
      body: "body",
      cover_image: "",
      status: "published",
      category_ids: "",
      author_id: "",
      published_at: "2025-06-01T00:00:00.000Z",
    });

    // Re-init: loadFromStorage will load the published post
    const { routes } = await admin.init();
    const registry = admin.blogRegistry!;
    assertEquals(registry.size, 1);
    assertExists(registry.match("/blog/live-post"));

    // Update to draft via CRUD route (use routes from same init)
    const updateRoutes = routes.filter(
      (r) =>
        r.path === "/admin/plugins/post-plugin/[id]" && r.method === "POST",
    );
    const updateRoute = updateRoutes[0];

    const req = makeFormRequest(
      "http://localhost/admin/plugins/post-plugin/post-1",
      {
        title: "Live Post",
        slug: "live-post",
        excerpt: "",
        body: "",
        cover_image: "",
        status: "draft",
        category_ids: "",
        author_id: "",
        published_at: "",
      },
    );
    const res = await updateRoute!.run!(req, { params: { id: "post-1" } });
    assertEquals(res.status, 302);

    // Post should be removed from registry
    assertEquals(registry.size, 0);
    assertEquals(registry.match("/blog/live-post"), null);
  });

  it("should unregister post when deleted", async () => {
    // Seed the post BEFORE init so loadFromStorage picks it up
    const admin = new AdminPlugin({
      storage: "memory",
      plugins: [PostsPlugin, CategoriesPlugin],
    });
    await admin.init();
    const plugin = admin.plugins.find((p) => p.name === "PostPlugin")!;

    await plugin.storage.set("post-del", {
      id: "post-del",
      title: "To Delete",
      slug: "to-delete",
      excerpt: "",
      body: "body",
      cover_image: "",
      status: "published",
      category_ids: "",
      author_id: "",
      published_at: "2025-06-01T00:00:00.000Z",
    });

    // Re-init: loadFromStorage will load the published post
    const { routes } = await admin.init();
    const registry = admin.blogRegistry!;
    assertEquals(registry.size, 1);

    // Delete via CRUD route (use routes from same init)
    const deleteRoute = routes.find(
      (r) => r.path === "/admin/plugins/post-plugin/[id]/delete",
    );
    assertExists(deleteRoute?.run);

    const req = new Request(
      "http://localhost/admin/plugins/post-plugin/post-del/delete",
      { method: "POST" },
    );
    const res = await deleteRoute!.run!(req, { params: { id: "post-del" } });
    assertEquals(res.status, 302);
    assertStringIncludes(
      res.headers.get("Location") ?? "",
      "success=deleted",
    );

    // Post should be gone from registry
    assertEquals(registry.size, 0);
    assertEquals(registry.match("/blog/to-delete"), null);
  });
});
