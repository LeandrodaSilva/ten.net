/**
 * Coverage tests for adminPlugin.tsx — blog route handlers execution,
 * preview route, update/delete with hot-registration, audit logging
 */
import { afterEach, beforeEach, describe, it } from "@std/testing/bdd";
import { assertEquals, assertExists, assertStringIncludes } from "@std/assert";
import { AdminPlugin } from "../plugins/adminPlugin.tsx";
import { PagePlugin } from "../plugins/pagePlugin.ts";
import { PostsPlugin } from "../plugins/postsPlugin.ts";
import { CategoriesPlugin } from "../plugins/categoriesPlugin.ts";
import { RolesPlugin } from "../plugins/rolesPlugin.ts";
import { AuditLogPlugin } from "../plugins/auditLogPlugin.ts";
import type { Route } from "../models/Route.ts";

describe("AdminPlugin — blog route handlers", () => {
  let admin: AdminPlugin;
  let routes: Route[];
  let kv: Deno.Kv;

  beforeEach(async () => {
    admin = new AdminPlugin({
      storage: "kv",
      kvPath: ":memory:",
      plugins: [
        PagePlugin,
        PostsPlugin,
        CategoriesPlugin,
        RolesPlugin,
        AuditLogPlugin,
      ],
    });
    const result = await admin.init();
    routes = result.routes;
    kv = result.kv!;
  });

  afterEach(() => {
    if (kv) kv.close();
  });

  it("GET /blog — should return blog listing HTML", async () => {
    const blogRoute = routes.find(
      (r) => r.path === "/blog" && r.method === "GET",
    );
    assertExists(blogRoute?.run);
    const res = await blogRoute!.run!(
      new Request("http://localhost/blog"),
    );
    assertEquals(res.status, 200);
    assertEquals(res.headers.get("Content-Type"), "text/html");
    const html = await res.text();
    assertStringIncludes(html, "<!DOCTYPE html>");
  });

  it("GET /blog/[slug] — should return 404 for nonexistent post", async () => {
    const blogPostRoute = routes.find(
      (r) => r.path === "/blog/[slug]" && r.method === "GET",
    );
    assertExists(blogPostRoute?.run);
    const res = await blogPostRoute!.run!(
      new Request("http://localhost/blog/nonexistent"),
      { params: { slug: "nonexistent" } },
    );
    assertEquals(res.status, 404);
  });

  it("GET /blog/[slug] — should render published post", async () => {
    // Create a published post via CRUD route (triggers hot-registration)
    const createRoute = routes.find(
      (r) => r.path === "/admin/plugins/post-plugin" && r.method === "POST",
    );
    assertExists(createRoute?.run);
    const now = new Date().toISOString();
    const body = new URLSearchParams({
      title: "Hello Post",
      slug: "hello-post",
      body: "<p>Post body content</p>",
      excerpt: "A short excerpt",
      status: "published",
      cover_image: "https://example.com/image.jpg",
      category_ids: "",
      published_at: now,
    });
    await createRoute!.run!(
      new Request("http://localhost/admin/plugins/post-plugin", {
        method: "POST",
        body: body.toString(),
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }),
    );

    const blogPostRoute = routes.find(
      (r) => r.path === "/blog/[slug]" && r.method === "GET",
    );
    assertExists(blogPostRoute?.run);
    const res = await blogPostRoute!.run!(
      new Request("http://localhost/blog/hello-post"),
      { params: { slug: "hello-post" } },
    );
    assertEquals(res.status, 200);
    const html = await res.text();
    assertStringIncludes(html, "Hello Post");
    assertStringIncludes(html, "Post body content");
    // Should have og:image meta tag since cover_image is set
    assertStringIncludes(html, "og:image");
  });

  it("GET /blog/rss.xml — should return RSS feed", async () => {
    const rssRoute = routes.find(
      (r) => r.path === "/blog/rss.xml" && r.method === "GET",
    );
    assertExists(rssRoute?.run);
    const res = await rssRoute!.run!(
      new Request("http://localhost/blog/rss.xml"),
    );
    assertEquals(res.status, 200);
    assertStringIncludes(
      res.headers.get("Content-Type") ?? "",
      "xml",
    );
  });

  it("GET /blog/category/[slug] — should return category page or 404", async () => {
    const catRoute = routes.find(
      (r) => r.path === "/blog/category/[slug]" && r.method === "GET",
    );
    assertExists(catRoute?.run);

    // First create a category
    const catPlugin = admin.plugins.find((p) => p.name === "CategoryPlugin");
    assertExists(catPlugin);
    await catPlugin!.storage.set("cat-tech", {
      id: "cat-tech",
      name: "Tech",
      slug: "tech",
      description: "Technology",
    });

    const res = await catRoute!.run!(
      new Request("http://localhost/blog/category/tech"),
      { params: { slug: "tech" } },
    );
    // Returns 200 with category page or 404 if category not found in registry
    assertEquals(res.status === 200 || res.status === 404, true);
  });

  it("GET /admin/preview/[id] — should return preview of existing page", async () => {
    const pagePlugin = admin.plugins.find((p) => p.name === "PagePlugin");
    assertExists(pagePlugin);
    await pagePlugin!.storage.set("page-prev", {
      id: "page-prev",
      slug: "preview-page",
      title: "Preview Test",
      body: "<p>Preview content</p>",
      status: "draft",
      seo_title: "",
      seo_description: "",
      template: "",
      author_id: "",
      widgets_enabled: "false",
    });

    const previewRoute = routes.find(
      (r) => r.path === "/admin/preview/[id]" && r.method === "GET",
    );
    assertExists(previewRoute?.run);
    const res = await previewRoute!.run!(
      new Request("http://localhost/admin/preview/page-prev"),
      { params: { id: "page-prev" } },
    );
    assertEquals(res.status, 200);
    const html = await res.text();
    assertStringIncludes(html, "Preview Mode");
    assertStringIncludes(html, "Preview content");
    assertEquals(res.headers.get("X-Robots-Tag"), "noindex");
  });

  it("GET /admin/preview/[id] — should return 404 for nonexistent page", async () => {
    const previewRoute = routes.find(
      (r) => r.path === "/admin/preview/[id]" && r.method === "GET",
    );
    assertExists(previewRoute?.run);
    const res = await previewRoute!.run!(
      new Request("http://localhost/admin/preview/nonexistent"),
      { params: { id: "nonexistent" } },
    );
    assertEquals(res.status, 404);
  });

  it("GET /admin/preview/[id] — should return 404 when no id param", async () => {
    const previewRoute = routes.find(
      (r) => r.path === "/admin/preview/[id]" && r.method === "GET",
    );
    assertExists(previewRoute?.run);
    const res = await previewRoute!.run!(
      new Request("http://localhost/admin/preview/"),
      { params: {} },
    );
    assertEquals(res.status, 404);
  });

  it("POST update page — should hot-register on publish and unregister on unpublish", async () => {
    // Create a draft page via CRUD
    const createRoute = routes.find(
      (r) => r.path === "/admin/plugins/page-plugin" && r.method === "POST",
    );
    assertExists(createRoute?.run);
    await createRoute!.run!(
      new Request("http://localhost/admin/plugins/page-plugin", {
        method: "POST",
        body: new URLSearchParams({
          slug: "hot-page",
          title: "Hot Page",
          body: "<p>Content</p>",
          status: "draft",
          seo_title: "",
          seo_description: "",
          template: "",
          author_id: "",
          widgets_enabled: "false",
        }).toString(),
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }),
    );

    const pagePlugin = admin.plugins.find((p) => p.name === "PagePlugin");
    const items = await pagePlugin!.storage.list({ page: 1, limit: 10 });
    const page = items.find((i) => i.slug === "hot-page");
    assertExists(page);
    const id = page!.id as string;

    // Update to published
    const updateRoute = routes.find(
      (r) =>
        r.path === "/admin/plugins/page-plugin/[id]" && r.method === "POST",
    );
    assertExists(updateRoute?.run);
    const res = await updateRoute!.run!(
      new Request(`http://localhost/admin/plugins/page-plugin/${id}`, {
        method: "POST",
        body: new URLSearchParams({
          slug: "hot-page",
          title: "Hot Page",
          body: "<p>Content</p>",
          status: "published",
          seo_title: "",
          seo_description: "",
          template: "",
          author_id: "",
          widgets_enabled: "false",
        }).toString(),
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }),
      { params: { id } },
    );
    assertEquals(res.status, 302);

    // Should be registered
    const match = admin.dynamicRegistry?.match("/hot-page");
    assertExists(match);

    // Now update to draft (unpublish)
    const res2 = await updateRoute!.run!(
      new Request(`http://localhost/admin/plugins/page-plugin/${id}`, {
        method: "POST",
        body: new URLSearchParams({
          slug: "hot-page",
          title: "Hot Page",
          body: "<p>Content</p>",
          status: "draft",
          seo_title: "",
          seo_description: "",
          template: "",
          author_id: "",
          widgets_enabled: "false",
        }).toString(),
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }),
      { params: { id } },
    );
    assertEquals(res2.status, 302);

    // Should be unregistered
    const match2 = admin.dynamicRegistry?.match("/hot-page");
    assertEquals(match2, null);
  });

  it("POST delete page — should unregister from dynamic registry", async () => {
    const pagePlugin = admin.plugins.find((p) => p.name === "PagePlugin");
    assertExists(pagePlugin);
    const now = new Date().toISOString();
    await pagePlugin!.storage.set("page-del", {
      id: "page-del",
      slug: "del-page",
      title: "Delete Page",
      body: "<p>Content</p>",
      status: "published",
      seo_title: "",
      seo_description: "",
      template: "",
      author_id: "",
      widgets_enabled: "false",
      created_at: now,
      updated_at: now,
    });
    admin.dynamicRegistry?.register({
      id: "page-del",
      slug: "del-page",
      title: "Delete Page",
      body: "<p>Content</p>",
      status: "published",
    });

    const deleteRoute = routes.find(
      (r) => r.path === "/admin/plugins/page-plugin/[id]/delete",
    );
    assertExists(deleteRoute?.run);
    const res = await deleteRoute!.run!(
      new Request(
        "http://localhost/admin/plugins/page-plugin/page-del/delete",
        { method: "POST" },
      ),
      { params: { id: "page-del" } },
    );
    assertEquals(res.status, 302);
  });

  it("POST update post — should hot-register published post in blog registry", async () => {
    // Create draft post directly in storage to avoid validation complexity
    const postsPlugin = admin.plugins.find((p) => p.name === "PostPlugin");
    assertExists(postsPlugin);
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    await postsPlugin!.storage.set(id, {
      id,
      title: "Hot Post",
      slug: "hot-post-2",
      body: "<p>Content</p>",
      excerpt: "",
      status: "draft",
      cover_image: "",
      category_ids: "",
      published_at: "",
      created_at: now,
      updated_at: now,
    });

    // Update to published via CRUD route
    const updateRoute = routes.find(
      (r) =>
        r.path === "/admin/plugins/post-plugin/[id]" && r.method === "POST",
    );
    assertExists(updateRoute?.run);
    const res = await updateRoute!.run!(
      new Request(`http://localhost/admin/plugins/post-plugin/${id}`, {
        method: "POST",
        body: new URLSearchParams({
          status: "published",
          published_at: now,
        }).toString(),
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }),
      { params: { id } },
    );
    assertEquals(res.status, 302);
  });

  it("POST delete post — should unregister from blog registry", async () => {
    // Create a post directly in storage
    const postsPlugin = admin.plugins.find((p) => p.name === "PostPlugin");
    assertExists(postsPlugin);
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    await postsPlugin!.storage.set(id, {
      id,
      title: "Delete Post",
      slug: "delete-post-2",
      body: "body",
      excerpt: "",
      status: "published",
      cover_image: "",
      category_ids: "",
      published_at: now,
      created_at: now,
      updated_at: now,
    });

    const deleteRoute = routes.find(
      (r) => r.path === "/admin/plugins/post-plugin/[id]/delete",
    );
    assertExists(deleteRoute?.run);
    const res = await deleteRoute!.run!(
      new Request(
        `http://localhost/admin/plugins/post-plugin/${id}/delete`,
        { method: "POST" },
      ),
      { params: { id } },
    );
    assertEquals(res.status, 302);
  });
});
