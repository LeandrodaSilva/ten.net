/**
 * Coverage tests for adminPlugin.tsx — blog routes and KV-mode CRUD
 * Covers: _addBlogRoutes, _buildNavItems, _getFieldConfig with PostsPlugin+CategoriesPlugin
 *         _seedBuiltInRoles, _addPageBuilderRoutes integration
 */
import { afterEach, beforeEach, describe, it } from "@std/testing/bdd";
import { assertEquals, assertExists, assertStringIncludes } from "@std/assert";
import { AdminPlugin } from "../plugins/adminPlugin.tsx";
import { PagePlugin } from "../plugins/pagePlugin.ts";
import { PostsPlugin } from "../plugins/postsPlugin.ts";
import { CategoriesPlugin } from "../plugins/categoriesPlugin.ts";
import { UsersPlugin } from "../plugins/usersPlugin.ts";
import { RolesPlugin } from "../plugins/rolesPlugin.ts";
import { AuditLogPlugin } from "../plugins/auditLogPlugin.ts";
import type { Route } from "../models/Route.ts";

describe("AdminPlugin — blog routes with KV (PostsPlugin + CategoriesPlugin)", () => {
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

  it("should have blog list and post routes", () => {
    const blogList = routes.find(
      (r) => r.path === "/blog" && r.method === "GET",
    );
    assertExists(blogList);
  });

  it("should have blog post detail route", () => {
    const blogPost = routes.find(
      (r) => r.path === "/blog/[slug]" && r.method === "GET",
    );
    assertExists(blogPost);
  });

  it("should have blog RSS feed route", () => {
    const rss = routes.find(
      (r) => r.path === "/blog/rss.xml" && r.method === "GET",
    );
    assertExists(rss);
  });

  it("should have blog category route", () => {
    const catRoute = routes.find(
      (r) => r.path === "/blog/category/[slug]" && r.method === "GET",
    );
    assertExists(catRoute);
  });

  it("should have dynamicRegistry after init", () => {
    assertExists(admin.dynamicRegistry);
  });

  it("should have blogRegistry after init", () => {
    assertExists(admin.blogRegistry);
  });

  it("GET /admin/plugins/post-plugin/new — new post form with category options", async () => {
    // First create a category
    const catPlugin = admin.plugins.find((p) => p.name === "CategoryPlugin");
    assertExists(catPlugin);
    await catPlugin!.storage.set("cat-1", {
      id: "cat-1",
      name: "Tech",
      slug: "tech",
      description: "Technology",
    });

    const newRoute = routes.find(
      (r) => r.path === "/admin/plugins/post-plugin/new" && r.method === "GET",
    );
    assertExists(newRoute?.run);
    const res = await newRoute!.run!(
      new Request("http://localhost/admin/plugins/post-plugin/new"),
    );
    assertEquals(res.status, 200);
    const html = await res.text();
    // Should have category_ids as a select with Tech option
    assertStringIncludes(html, "Tech");
    // Should have status as select
    assertStringIncludes(html, "Draft");
    assertStringIncludes(html, "Published");
    // Should have body as textarea
    assertStringIncludes(html, "textarea");
  });

  it("POST create — should create a post via CRUD route", async () => {
    const createRoute = routes.find(
      (r) => r.path === "/admin/plugins/post-plugin" && r.method === "POST",
    );
    assertExists(createRoute?.run);

    const body = new URLSearchParams({
      title: "My Post",
      slug: "my-post",
      body: "Post content",
      excerpt: "Short excerpt",
      status: "draft",
      cover_image: "",
      category_ids: "",
      published_at: "",
    });
    const res = await createRoute!.run!(
      new Request("http://localhost/admin/plugins/post-plugin", {
        method: "POST",
        body: body.toString(),
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }),
    );
    assertEquals(res.status, 302);
  });

  it("POST create page with published status — should register in dynamic registry", async () => {
    const createRoute = routes.find(
      (r) => r.path === "/admin/plugins/page-plugin" && r.method === "POST",
    );
    assertExists(createRoute?.run);

    const body = new URLSearchParams({
      slug: "my-page",
      title: "My Page",
      body: "<p>Content</p>",
      status: "published",
      seo_title: "",
      seo_description: "",
      template: "",
      author_id: "",
      widgets_enabled: "false",
    });
    const res = await createRoute!.run!(
      new Request("http://localhost/admin/plugins/page-plugin", {
        method: "POST",
        body: body.toString(),
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }),
    );
    assertEquals(res.status, 302);

    // Verify page was registered in dynamic registry
    const match = admin.dynamicRegistry?.match("/my-page");
    assertExists(match);
  });
});

describe("AdminPlugin — UsersPlugin with RolesPlugin field config", () => {
  it("should render user form with role select populated from roles", async () => {
    const admin = new AdminPlugin({
      storage: "memory",
      plugins: [UsersPlugin, RolesPlugin],
    });
    const { routes } = await admin.init();

    // Seed a role
    const rolesPlugin = admin.plugins.find((p) => p.name === "RolePlugin");
    assertExists(rolesPlugin);
    await rolesPlugin!.storage.set("role-1", {
      id: "role-1",
      name: "Admin",
      slug: "admin",
      description: "Full access",
      is_system: "true",
    });

    const newRoute = routes.find(
      (r) => r.path === "/admin/plugins/user-plugin/new" && r.method === "GET",
    );
    assertExists(newRoute?.run);
    const res = await newRoute!.run!(
      new Request("http://localhost/admin/plugins/user-plugin/new"),
    );
    assertEquals(res.status, 200);
    const html = await res.text();
    // Should have role_id as select with Admin option
    assertStringIncludes(html, "Admin");
    // Should have status select
    assertStringIncludes(html, "Active");
    assertStringIncludes(html, "Inactive");
  });
});

describe("AdminPlugin — preview route", () => {
  it("should have a preview route for pages", async () => {
    const admin = new AdminPlugin({
      storage: "memory",
      plugins: [PagePlugin],
    });
    const { routes } = await admin.init();
    const previewRoute = routes.find(
      (r) => r.path.includes("preview"),
    );
    assertExists(previewRoute);
  });
});
