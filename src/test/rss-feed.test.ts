import { describe, it } from "@std/testing/bdd";
import { assertEquals, assertStringIncludes } from "@std/assert";
import { AdminPlugin } from "../../packages/admin/src/plugins/adminPlugin.tsx";
import { PostsPlugin } from "../../packages/admin/src/plugins/postsPlugin.ts";
import { CategoriesPlugin } from "../../packages/admin/src/plugins/categoriesPlugin.ts";
import type { Route } from "../../packages/core/src/models/Route.ts";

/** Helper: init AdminPlugin with blog plugins and return routes. */
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

/** Helper: seed a published post and hot-register in the registry. */
async function seedPost(
  admin: AdminPlugin,
  overrides?: Record<string, string>,
) {
  const postsPlugin = admin.plugins.find((p) => p.name === "PostPlugin")!;
  const id = overrides?.id ?? crypto.randomUUID();
  const data = {
    id,
    title: "RSS Post",
    slug: "rss-post",
    excerpt: "RSS excerpt",
    body: "<p>Content</p>",
    cover_image: "",
    status: "published",
    category_ids: "",
    author_id: "",
    published_at: "2025-06-01T00:00:00.000Z",
    ...overrides,
  };
  await postsPlugin.storage.set(id, data);
  admin.blogRegistry!.register(data);
  return id;
}

describe("RSS feed — GET /blog/rss.xml", () => {
  it("should return 200 with RSS XML content type", async () => {
    const { routes } = await initBlogAdmin();
    const route = routes.find(
      (r) => r.path === "/blog/rss.xml" && r.method === "GET",
    );
    const req = new Request("http://localhost/blog/rss.xml");
    const res = await route!.run!(req);
    assertEquals(res.status, 200);
    assertEquals(
      res.headers.get("Content-Type"),
      "application/rss+xml; charset=utf-8",
    );
  });

  it("should return valid RSS 2.0 XML structure", async () => {
    const { routes, admin } = await initBlogAdmin();
    await seedPost(admin, {
      id: "p1",
      slug: "first-post",
      title: "First Post",
      excerpt: "First excerpt",
    });

    const route = routes.find(
      (r) => r.path === "/blog/rss.xml" && r.method === "GET",
    );
    const req = new Request("http://localhost/blog/rss.xml");
    const res = await route!.run!(req);
    const xml = await res.text();

    assertStringIncludes(xml, '<?xml version="1.0" encoding="UTF-8"?>');
    assertStringIncludes(xml, '<rss version="2.0">');
    assertStringIncludes(xml, "<channel>");
    assertStringIncludes(xml, "<title>Blog</title>");
    assertStringIncludes(xml, "<item>");
    assertStringIncludes(xml, "<title>First Post</title>");
    assertStringIncludes(xml, "<description>First excerpt</description>");
  });

  it("should only include published posts", async () => {
    const { routes, admin } = await initBlogAdmin();
    await seedPost(admin, {
      id: "p1",
      slug: "visible-post",
      title: "Visible Post",
    });
    // Draft posts are not registered in BlogRouteRegistry
    const postsPlugin = admin.plugins.find((p) => p.name === "PostPlugin")!;
    await postsPlugin.storage.set("draft-1", {
      id: "draft-1",
      title: "Hidden Draft",
      slug: "hidden-draft",
      excerpt: "",
      body: "",
      cover_image: "",
      status: "draft",
      category_ids: "",
      author_id: "",
      published_at: "",
    });

    const route = routes.find(
      (r) => r.path === "/blog/rss.xml" && r.method === "GET",
    );
    const req = new Request("http://localhost/blog/rss.xml");
    const res = await route!.run!(req);
    const xml = await res.text();

    assertStringIncludes(xml, "Visible Post");
    assertEquals(xml.includes("Hidden Draft"), false);
  });

  it("should generate empty feed when no posts", async () => {
    const { routes } = await initBlogAdmin();
    const route = routes.find(
      (r) => r.path === "/blog/rss.xml" && r.method === "GET",
    );
    const req = new Request("http://localhost/blog/rss.xml");
    const res = await route!.run!(req);
    const xml = await res.text();

    assertStringIncludes(xml, "<title>Blog</title>");
    assertEquals(xml.includes("<item>"), false);
  });

  it("should include site URL based on request host", async () => {
    const { routes, admin } = await initBlogAdmin();
    await seedPost(admin, { id: "p1", slug: "test", title: "Test" });

    const route = routes.find(
      (r) => r.path === "/blog/rss.xml" && r.method === "GET",
    );
    const req = new Request("https://example.com/blog/rss.xml");
    const res = await route!.run!(req);
    const xml = await res.text();

    assertStringIncludes(xml, "https://example.com/blog");
    assertStringIncludes(xml, "https://example.com/blog/test");
  });
});
