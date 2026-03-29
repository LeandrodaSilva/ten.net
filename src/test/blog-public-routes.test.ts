import { describe, it } from "@std/testing/bdd";
import { assertEquals, assertStringIncludes } from "@std/assert";
import { AdminPlugin } from "../plugins/adminPlugin.tsx";
import { PostsPlugin } from "../plugins/postsPlugin.ts";
import { CategoriesPlugin } from "../plugins/categoriesPlugin.ts";
import type { Route } from "../models/Route.ts";

/** Helper: init AdminPlugin with Posts + Categories and return routes. */
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

/** Helper: seed a published post. */
async function seedPost(
  admin: AdminPlugin,
  overrides?: Record<string, string>,
) {
  const postsPlugin = admin.plugins.find((p) => p.name === "PostPlugin")!;
  const id = overrides?.id ?? crypto.randomUUID();
  await postsPlugin.storage.set(id, {
    id,
    title: "Test Post",
    slug: "test-post",
    excerpt: "A test excerpt",
    body: "<p>Test body content</p>",
    cover_image: "",
    status: "published",
    category_ids: "",
    author_id: "",
    published_at: "2025-06-01T00:00:00.000Z",
    ...overrides,
  });
  // Hot-register in blog registry
  const registry = admin.blogRegistry!;
  registry.register({
    id,
    title: "Test Post",
    slug: "test-post",
    excerpt: "A test excerpt",
    body: "<p>Test body content</p>",
    cover_image: "",
    status: "published",
    category_ids: "",
    author_id: "",
    published_at: "2025-06-01T00:00:00.000Z",
    ...overrides,
  });
  return id;
}

/** Helper: seed a category. */
async function seedCategory(
  admin: AdminPlugin,
  overrides?: Record<string, string>,
) {
  const catPlugin = admin.plugins.find((p) => p.name === "CategoryPlugin")!;
  const id = overrides?.id ?? crypto.randomUUID();
  await catPlugin.storage.set(id, {
    id,
    name: "Technology",
    slug: "tech",
    description: "Tech posts",
    ...overrides,
  });
  return id;
}

/** Find a route by path pattern and method. */
function findRoute(
  routes: Route[],
  path: string,
  method = "GET",
): Route | undefined {
  return routes.find((r) => r.path === path && r.method === method);
}

describe("Blog public routes — GET /blog", () => {
  it("should return 200 with HTML content", async () => {
    const { routes } = await initBlogAdmin();
    const route = findRoute(routes, "/blog");
    const req = new Request("http://localhost/blog");
    const res = await route!.run!(req);
    assertEquals(res.status, 200);
    assertEquals(res.headers.get("Content-Type"), "text/html");
  });

  it("should include published posts in listing", async () => {
    const { routes, admin } = await initBlogAdmin();
    await seedPost(admin, {
      id: "p1",
      slug: "hello-world",
      title: "Hello World",
      excerpt: "Welcome post",
    });

    const route = findRoute(routes, "/blog");
    const req = new Request("http://localhost/blog");
    const res = await route!.run!(req);
    const html = await res.text();
    assertStringIncludes(html, "Hello World");
    assertStringIncludes(html, "Welcome post");
    assertStringIncludes(html, "/blog/hello-world");
  });

  it("should NOT include draft posts", async () => {
    const { routes, admin } = await initBlogAdmin();
    await seedPost(admin, {
      id: "p1",
      slug: "published-post",
      title: "Published Post",
      status: "published",
    });
    // Draft post — register will return null (ignored by registry)
    const postsPlugin = admin.plugins.find((p) => p.name === "PostPlugin")!;
    await postsPlugin.storage.set("draft-1", {
      id: "draft-1",
      title: "Draft Post",
      slug: "draft-post",
      excerpt: "",
      body: "",
      cover_image: "",
      status: "draft",
      category_ids: "",
      author_id: "",
      published_at: "",
    });

    const route = findRoute(routes, "/blog");
    const req = new Request("http://localhost/blog");
    const res = await route!.run!(req);
    const html = await res.text();
    assertStringIncludes(html, "Published Post");
    assertEquals(html.includes("Draft Post"), false);
  });

  it("should support page=2 pagination", async () => {
    const { routes, admin } = await initBlogAdmin();
    // Seed 12 posts (limit is 10, so page 2 should have 2)
    for (let i = 1; i <= 12; i++) {
      await seedPost(admin, {
        id: `p${i}`,
        slug: `post-${i}`,
        title: `Post ${i}`,
        published_at: `2025-0${
          String(Math.min(i, 9)).padStart(1, "0")
        }-01T00:00:00.000Z`,
      });
    }

    const route = findRoute(routes, "/blog");
    const req = new Request("http://localhost/blog?page=2");
    const res = await route!.run!(req);
    assertEquals(res.status, 200);
    const html = await res.text();
    // Page 2 should contain posts and Previous link
    assertStringIncludes(html, "Previous");
  });

  it("should show 'No posts yet' when no posts", async () => {
    const { routes } = await initBlogAdmin();
    const route = findRoute(routes, "/blog");
    const req = new Request("http://localhost/blog");
    const res = await route!.run!(req);
    const html = await res.text();
    assertStringIncludes(html, "No posts yet");
  });
});

describe("Blog public routes — GET /blog/{slug}", () => {
  it("should return 200 for an existing published post", async () => {
    const { routes, admin } = await initBlogAdmin();
    await seedPost(admin, {
      id: "p1",
      slug: "my-post",
      title: "My Post Title",
      body: "<p>Post body here</p>",
    });

    const route = findRoute(routes, "/blog/[slug]");
    const req = new Request("http://localhost/blog/my-post");
    const res = await route!.run!(req, { params: { slug: "my-post" } });
    assertEquals(res.status, 200);
    assertEquals(res.headers.get("Content-Type"), "text/html");
    const html = await res.text();
    assertStringIncludes(html, "My Post Title");
    assertStringIncludes(html, "Post body here");
  });

  it("should return 404 for non-existent slug", async () => {
    const { routes } = await initBlogAdmin();
    const route = findRoute(routes, "/blog/[slug]");
    const req = new Request("http://localhost/blog/nonexistent");
    const res = await route!.run!(req, { params: { slug: "nonexistent" } });
    assertEquals(res.status, 404);
  });

  it("should return 404 when slug param is missing", async () => {
    const { routes } = await initBlogAdmin();
    const route = findRoute(routes, "/blog/[slug]");
    const req = new Request("http://localhost/blog/");
    const res = await route!.run!(req, { params: {} });
    assertEquals(res.status, 404);
  });
});

describe("Blog public routes — GET /blog/category/{slug}", () => {
  it("should return posts filtered by category", async () => {
    const { routes, admin } = await initBlogAdmin();
    const catId = await seedCategory(admin, {
      id: "cat-tech",
      name: "Technology",
      slug: "tech",
    });
    await seedPost(admin, {
      id: "p1",
      slug: "tech-post",
      title: "Tech Post",
      category_ids: `["${catId}"]`,
    });
    await seedPost(admin, {
      id: "p2",
      slug: "other-post",
      title: "Other Post",
      category_ids: "",
    });

    const route = findRoute(routes, "/blog/category/[slug]");
    const req = new Request("http://localhost/blog/category/tech");
    const res = await route!.run!(req, { params: { slug: "tech" } });
    assertEquals(res.status, 200);
    const html = await res.text();
    assertStringIncludes(html, "Tech Post");
    assertEquals(html.includes("Other Post"), false);
  });

  it("should return 404 for non-existent category slug", async () => {
    const { routes } = await initBlogAdmin();
    const route = findRoute(routes, "/blog/category/[slug]");
    const req = new Request("http://localhost/blog/category/nonexistent");
    const res = await route!.run!(req, {
      params: { slug: "nonexistent" },
    });
    assertEquals(res.status, 404);
  });

  it("should return 404 when slug param is missing", async () => {
    const { routes } = await initBlogAdmin();
    const route = findRoute(routes, "/blog/category/[slug]");
    const req = new Request("http://localhost/blog/category/");
    const res = await route!.run!(req, { params: {} });
    assertEquals(res.status, 404);
  });
});
