import { describe, it } from "@std/testing/bdd";
import { assertEquals, assertStringIncludes } from "@std/assert";
import { PostsPlugin } from "../plugins/postsPlugin.ts";
import { CategoriesPlugin } from "../plugins/categoriesPlugin.ts";
import { GroupsPlugin } from "../plugins/groupsPlugin.ts";
import { UsersPlugin } from "../plugins/usersPlugin.ts";
import { SettingsPlugin } from "../plugins/settingsPlugin.ts";

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
    assertEquals(plugin.model.category_ids, "object");
  });

  it("should generate 5 routes (list + CRUD)", () => {
    const plugin = new PostsPlugin();
    const routes = plugin.getRoutes();
    assertEquals(routes.length, 6);
  });

  it("should have correct slug", () => {
    const plugin = new PostsPlugin();
    assertEquals(plugin.slug, "post-plugin");
  });

  it("should generate index GET route at /admin/plugins/post-plugin", () => {
    const plugin = new PostsPlugin();
    const routes = plugin.getRoutes();
    const indexRoute = routes.find(
      (r) => r.path === "/admin/plugins/post-plugin" && r.method === "GET",
    );
    assertEquals(indexRoute?.path, "/admin/plugins/post-plugin");
    assertEquals(indexRoute?.method, "GET");
  });

  it("should generate POST create route at /admin/plugins/post-plugin", () => {
    const plugin = new PostsPlugin();
    const routes = plugin.getRoutes();
    const createRoute = routes.find(
      (r) => r.path === "/admin/plugins/post-plugin" && r.method === "POST",
    );
    assertEquals(createRoute?.path, "/admin/plugins/post-plugin");
    assertEquals(createRoute?.method, "POST");
  });

  it("should generate GET single item route at /admin/plugins/post-plugin/[id]", () => {
    const plugin = new PostsPlugin();
    const routes = plugin.getRoutes();
    const getRoute = routes.find(
      (r) => r.path === "/admin/plugins/post-plugin/[id]" && r.method === "GET",
    );
    assertEquals(
      getRoute?.path,
      "/admin/plugins/post-plugin/[id]",
    );
  });

  it("should generate POST update route at /admin/plugins/post-plugin/[id]", () => {
    const plugin = new PostsPlugin();
    const routes = plugin.getRoutes();
    const updateRoutes = routes.filter(
      (r) =>
        r.path === "/admin/plugins/post-plugin/[id]" && r.method === "POST",
    );
    assertEquals(updateRoutes.length, 1);
  });

  it("should generate POST delete route at /admin/plugins/post-plugin/[id]/delete", () => {
    const plugin = new PostsPlugin();
    const routes = plugin.getRoutes();
    const deleteRoute = routes.find(
      (r) => r.path === "/admin/plugins/post-plugin/[id]/delete",
    );
    assertEquals(
      deleteRoute?.path,
      "/admin/plugins/post-plugin/[id]/delete",
    );
    assertEquals(deleteRoute?.method, "POST");
  });

  it("index route regex should match /admin/plugins/post-plugin", () => {
    const plugin = new PostsPlugin();
    const routes = plugin.getRoutes();
    const indexRoute = routes[0];
    assertEquals(indexRoute.regex.test("/admin/plugins/post-plugin"), true);
    assertEquals(
      indexRoute.regex.test("/admin/plugins/post-plugin/123"),
      false,
    );
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

  it("should generate 5 routes", () => {
    const plugin = new CategoriesPlugin();
    const routes = plugin.getRoutes();
    assertEquals(routes.length, 6);
  });

  it("should generate index GET route at /admin/plugins/category-plugin", () => {
    const plugin = new CategoriesPlugin();
    const routes = plugin.getRoutes();
    assertEquals(routes[0].path, "/admin/plugins/category-plugin");
    assertEquals(routes[0].method, "GET");
  });

  it("should render list page HTML in index route", async () => {
    const plugin = new CategoriesPlugin();
    const routes = plugin.getRoutes();
    const req = new Request("http://localhost/admin/plugins/category-plugin");
    const res = await routes[0].run!(req);
    const html = await res.text();
    assertStringIncludes(html, "<!DOCTYPE html>");
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

  it("should generate 5 routes", () => {
    const plugin = new GroupsPlugin();
    const routes = plugin.getRoutes();
    assertEquals(routes.length, 6);
  });

  it("should generate index GET route at /admin/plugins/group-plugin", () => {
    const plugin = new GroupsPlugin();
    const routes = plugin.getRoutes();
    assertEquals(routes[0].path, "/admin/plugins/group-plugin");
    assertEquals(routes[0].method, "GET");
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
    assertEquals(plugin.model.role, "string");
    assertEquals(plugin.model.status, "string");
  });

  it("should have correct slug", () => {
    const plugin = new UsersPlugin();
    assertEquals(plugin.slug, "user-plugin");
  });

  it("should generate 5 routes", () => {
    const plugin = new UsersPlugin();
    const routes = plugin.getRoutes();
    assertEquals(routes.length, 6);
  });

  it("should generate index GET route at /admin/plugins/user-plugin", () => {
    const plugin = new UsersPlugin();
    const routes = plugin.getRoutes();
    assertEquals(routes[0].path, "/admin/plugins/user-plugin");
    assertEquals(routes[0].method, "GET");
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

  it("should generate 5 routes", () => {
    const plugin = new SettingsPlugin();
    const routes = plugin.getRoutes();
    assertEquals(routes.length, 6);
  });

  it("should generate index GET route at /admin/plugins/settings-plugin", () => {
    const plugin = new SettingsPlugin();
    const routes = plugin.getRoutes();
    assertEquals(routes[0].path, "/admin/plugins/settings-plugin");
    assertEquals(routes[0].method, "GET");
  });
});
