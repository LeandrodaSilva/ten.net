import { describe, it } from "@std/testing/bdd";
import { assertEquals } from "@std/assert";
import { PostsPlugin } from "../../packages/admin/src/plugins/postsPlugin.ts";
import { CategoriesPlugin } from "../../packages/admin/src/plugins/categoriesPlugin.ts";
import { GroupsPlugin } from "../../packages/admin/src/plugins/groupsPlugin.ts";
import { UsersPlugin } from "../../packages/admin/src/plugins/usersPlugin.ts";
import { SettingsPlugin } from "../../packages/admin/src/plugins/settingsPlugin.ts";
import { AdminPlugin } from "../../packages/admin/src/plugins/adminPlugin.tsx";

describe("PostsPlugin", () => {
  it("should have correct name", () => {
    const plugin = new PostsPlugin();
    assertEquals(plugin.name, "PostPlugin");
  });

  it("should have correct description", () => {
    const plugin = new PostsPlugin();
    assertEquals(plugin.description, "Manage blog posts and content.");
  });

  it("should have correct model with expected fields", () => {
    const plugin = new PostsPlugin();
    assertEquals(plugin.model.title, "string");
    assertEquals(plugin.model.slug, "string");
    assertEquals(plugin.model.body, "string");
    assertEquals(plugin.model.status, "string");
    assertEquals(plugin.model.category_ids, "string");
    assertEquals(plugin.model.published_at, "string");
  });

  it("should have correct slug", () => {
    const plugin = new PostsPlugin();
    assertEquals(plugin.slug, "post-plugin");
  });

  it("should validate correct data", () => {
    const plugin = new PostsPlugin();
    const result = plugin.validate({
      title: "Test",
      slug: "test",
      excerpt: "e",
      body: "b",
      cover_image: "img.jpg",
      status: "draft",
      category_ids: '["1"]',
      author_id: "u1",
    });
    assertEquals(result.valid, true);
  });
});

describe("CategoriesPlugin", () => {
  it("should have correct name", () => {
    const plugin = new CategoriesPlugin();
    assertEquals(plugin.name, "CategoryPlugin");
  });

  it("should have correct description", () => {
    const plugin = new CategoriesPlugin();
    assertEquals(plugin.description, "Organize content with categories.");
  });

  it("should have correct model", () => {
    const plugin = new CategoriesPlugin();
    assertEquals(plugin.model.name, "string");
    assertEquals(plugin.model.slug, "string");
    assertEquals(plugin.model.description, "string");
  });

  it("should have correct slug", () => {
    const plugin = new CategoriesPlugin();
    assertEquals(plugin.slug, "category-plugin");
  });
});

describe("GroupsPlugin", () => {
  it("should have correct name", () => {
    const plugin = new GroupsPlugin();
    assertEquals(plugin.name, "GroupPlugin");
  });

  it("should have correct description", () => {
    const plugin = new GroupsPlugin();
    assertEquals(plugin.description, "Create curated content collections.");
  });

  it("should have correct model with item_ids as object", () => {
    const plugin = new GroupsPlugin();
    assertEquals(plugin.model.name, "string");
    assertEquals(plugin.model.item_ids, "object");
  });

  it("should have correct slug", () => {
    const plugin = new GroupsPlugin();
    assertEquals(plugin.slug, "group-plugin");
  });
});

describe("UsersPlugin", () => {
  it("should have correct name", () => {
    const plugin = new UsersPlugin();
    assertEquals(plugin.name, "UserPlugin");
  });

  it("should have correct description", () => {
    const plugin = new UsersPlugin();
    assertEquals(plugin.description, "Manage users and permissions.");
  });

  it("should have correct model", () => {
    const plugin = new UsersPlugin();
    assertEquals(plugin.model.email, "string");
    assertEquals(plugin.model.display_name, "string");
    assertEquals(plugin.model.role_id, "string");
    assertEquals(plugin.model.status, "string");
  });

  it("should have correct slug", () => {
    const plugin = new UsersPlugin();
    assertEquals(plugin.slug, "user-plugin");
  });
});

describe("SettingsPlugin", () => {
  it("should have correct name", () => {
    const plugin = new SettingsPlugin();
    assertEquals(plugin.name, "SettingsPlugin");
  });

  it("should have correct description", () => {
    const plugin = new SettingsPlugin();
    assertEquals(plugin.description, "Configure application settings.");
  });

  it("should have correct model", () => {
    const plugin = new SettingsPlugin();
    assertEquals(plugin.model.key, "string");
    assertEquals(plugin.model.value, "string");
  });

  it("should have correct slug", () => {
    const plugin = new SettingsPlugin();
    assertEquals(plugin.slug, "settings-plugin");
  });
});

describe("AdminPlugin generates CRUD routes for each plugin", () => {
  it("should generate 6 CRUD routes per plugin", async () => {
    const admin = new AdminPlugin({
      storage: "memory",
      plugins: [
        PostsPlugin,
        CategoriesPlugin,
        GroupsPlugin,
        UsersPlugin,
        SettingsPlugin,
      ],
    });
    const { routes } = await admin.init();
    // Per plugin: index GET + POST create + GET /new + GET [id] + POST [id] + POST [id]/delete = 6
    // Plus: dashboard + favicon + 3 auth routes = 5
    // Total: 5 * 6 + 5 = 35
    const pluginRoutes = routes.filter((r) =>
      r.path.startsWith("/admin/plugins/")
    );
    assertEquals(pluginRoutes.length, 30);
  });

  it("should generate index routes for each plugin", async () => {
    const admin = new AdminPlugin({
      storage: "memory",
      plugins: [PostsPlugin, CategoriesPlugin],
    });
    const { routes } = await admin.init();
    const postIndex = routes.find(
      (r) => r.path === "/admin/plugins/post-plugin" && r.method === "GET",
    );
    const catIndex = routes.find(
      (r) => r.path === "/admin/plugins/category-plugin" && r.method === "GET",
    );
    assertEquals(postIndex?.method, "GET");
    assertEquals(catIndex?.method, "GET");
  });

  it("index route regex should match correct path", async () => {
    const admin = new AdminPlugin({
      storage: "memory",
      plugins: [PostsPlugin],
    });
    const { routes } = await admin.init();
    const indexRoute = routes.find(
      (r) => r.path === "/admin/plugins/post-plugin" && r.method === "GET",
    );
    assertEquals(
      indexRoute!.regex.test("/admin/plugins/post-plugin"),
      true,
    );
    assertEquals(
      indexRoute!.regex.test("/admin/plugins/post-plugin/123"),
      false,
    );
  });
});
