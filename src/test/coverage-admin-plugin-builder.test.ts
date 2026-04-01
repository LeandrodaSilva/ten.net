/**
 * Coverage tests for plugins/adminPlugin.tsx — Page Builder widget routes
 * Covers: _addPageBuilderRoutes (list, create, update, delete, reorder widgets)
 *         _getFieldConfig branches (PostsPlugin, UsersPlugin)
 *         _buildNavItems, _fieldType
 */
import { afterEach, beforeEach, describe, it } from "@std/testing/bdd";
import { assertEquals, assertExists, assertStringIncludes } from "@std/assert";
import { AdminPlugin } from "../../packages/admin/src/plugins/adminPlugin.tsx";
import { PagePlugin } from "../../packages/admin/src/plugins/pagePlugin.ts";
import { PostsPlugin } from "../../packages/admin/src/plugins/postsPlugin.ts";
import { CategoriesPlugin } from "../../packages/admin/src/plugins/categoriesPlugin.ts";
import { UsersPlugin } from "../../packages/admin/src/plugins/usersPlugin.ts";
import { RolesPlugin } from "../../packages/admin/src/plugins/rolesPlugin.ts";
import { AuditLogPlugin } from "../../packages/admin/src/plugins/auditLogPlugin.ts";
import type { Route } from "../../packages/core/src/models/Route.ts";

describe("AdminPlugin — Page Builder routes (KV mode)", () => {
  let admin: AdminPlugin;
  let routes: Route[];
  let kv: Deno.Kv;

  beforeEach(async () => {
    admin = new AdminPlugin({
      storage: "kv",
      kvPath: ":memory:",
      plugins: [PagePlugin],
    });
    const result = await admin.init();
    routes = result.routes;
    kv = result.kv!;
  });

  afterEach(() => {
    if (kv) kv.close();
  });

  it("should have page builder list route", () => {
    const route = routes.find(
      (r) =>
        r.path.includes("/admin/pages/[id]/widgets") &&
        r.method === "GET",
    );
    assertExists(route);
  });

  it("GET /admin/pages/[id]/widgets — list widgets returns JSON array", async () => {
    const route = routes.find(
      (r) =>
        r.path === "/admin/pages/[id]/widgets" &&
        r.method === "GET",
    );
    const req = new Request(
      "http://localhost/admin/pages/page-1/widgets",
    );
    const res = await route!.run!(req, { params: { id: "page-1" } });
    assertEquals(res.status, 200);
    assertEquals(res.headers.get("Content-Type"), "application/json");
    const body = await res.json();
    assertEquals(Array.isArray(body), true);
  });

  it("GET /admin/pages/[id]/widgets — returns 404 when no pageId", async () => {
    const route = routes.find(
      (r) =>
        r.path === "/admin/pages/[id]/widgets" &&
        r.method === "GET",
    );
    const req = new Request(
      "http://localhost/admin/pages//widgets",
    );
    const res = await route!.run!(req, { params: {} });
    assertEquals(res.status, 404);
  });

  it("POST /admin/pages/[id]/widgets — create widget returns 201", async () => {
    const route = routes.find(
      (r) =>
        r.path === "/admin/pages/[id]/widgets" &&
        r.method === "POST",
    );
    const req = new Request(
      "http://localhost/admin/pages/page-1/widgets",
      {
        method: "POST",
        body: JSON.stringify({
          type: "hero",
          placeholder: "main",
          order: 0,
          data: { heading: "Test" },
        }),
        headers: { "Content-Type": "application/json" },
      },
    );
    const res = await route!.run!(req, { params: { id: "page-1" } });
    assertEquals(res.status, 201);
    const body = await res.json();
    assertExists(body.id);
    assertEquals(body.type, "hero");
  });

  it("POST /admin/pages/[id]/widgets — returns 400 for invalid JSON", async () => {
    const route = routes.find(
      (r) =>
        r.path === "/admin/pages/[id]/widgets" &&
        r.method === "POST",
    );
    const req = new Request(
      "http://localhost/admin/pages/page-1/widgets",
      {
        method: "POST",
        body: "not json",
        headers: { "Content-Type": "text/plain" },
      },
    );
    const res = await route!.run!(req, { params: { id: "page-1" } });
    assertEquals(res.status, 400);
    const body = await res.json();
    assertEquals(body.error, "Invalid JSON body");
  });

  it("POST /admin/pages/[id]/widgets — returns 400 when type missing", async () => {
    const route = routes.find(
      (r) =>
        r.path === "/admin/pages/[id]/widgets" &&
        r.method === "POST",
    );
    const req = new Request(
      "http://localhost/admin/pages/page-1/widgets",
      {
        method: "POST",
        body: JSON.stringify({ placeholder: "main" }),
        headers: { "Content-Type": "application/json" },
      },
    );
    const res = await route!.run!(req, { params: { id: "page-1" } });
    assertEquals(res.status, 400);
    const body = await res.json();
    assertEquals(body.error, "type is required");
  });

  it("POST /admin/pages/[id]/widgets — returns 404 when no pageId", async () => {
    const route = routes.find(
      (r) =>
        r.path === "/admin/pages/[id]/widgets" &&
        r.method === "POST",
    );
    const req = new Request(
      "http://localhost/admin/pages//widgets",
      {
        method: "POST",
        body: JSON.stringify({ type: "hero" }),
        headers: { "Content-Type": "application/json" },
      },
    );
    const res = await route!.run!(req, { params: {} });
    assertEquals(res.status, 404);
  });

  it("POST update widget — returns 200 with updated data", async () => {
    // First create a widget
    const createRoute = routes.find(
      (r) =>
        r.path === "/admin/pages/[id]/widgets" &&
        r.method === "POST",
    );
    const createRes = await createRoute!.run!(
      new Request("http://localhost/admin/pages/page-1/widgets", {
        method: "POST",
        body: JSON.stringify({
          type: "hero",
          placeholder: "main",
          order: 0,
          data: { heading: "Original" },
        }),
        headers: { "Content-Type": "application/json" },
      }),
      { params: { id: "page-1" } },
    );
    const created = await createRes.json();

    // Update it
    const updateRoute = routes.find(
      (r) =>
        r.path === "/admin/pages/[id]/widgets/[wid]" &&
        r.method === "POST",
    );
    const updateRes = await updateRoute!.run!(
      new Request(
        `http://localhost/admin/pages/page-1/widgets/${created.id}`,
        {
          method: "POST",
          body: JSON.stringify({
            data: { heading: "Updated" },
            order: 1,
            placeholder: "sidebar",
            type: "rich-text",
          }),
          headers: { "Content-Type": "application/json" },
        },
      ),
      { params: { id: "page-1", wid: created.id } },
    );
    assertEquals(updateRes.status, 200);
    const updated = await updateRes.json();
    assertEquals(updated.data.heading, "Updated");
  });

  it("POST update widget — returns 404 for nonexistent widget", async () => {
    const updateRoute = routes.find(
      (r) =>
        r.path === "/admin/pages/[id]/widgets/[wid]" &&
        r.method === "POST",
    );
    const res = await updateRoute!.run!(
      new Request(
        "http://localhost/admin/pages/page-1/widgets/nonexistent",
        {
          method: "POST",
          body: JSON.stringify({ data: {} }),
          headers: { "Content-Type": "application/json" },
        },
      ),
      { params: { id: "page-1", wid: "nonexistent" } },
    );
    assertEquals(res.status, 404);
  });

  it("POST update widget — returns 400 for invalid JSON", async () => {
    const updateRoute = routes.find(
      (r) =>
        r.path === "/admin/pages/[id]/widgets/[wid]" &&
        r.method === "POST",
    );
    const res = await updateRoute!.run!(
      new Request(
        "http://localhost/admin/pages/page-1/widgets/w1",
        {
          method: "POST",
          body: "bad json",
          headers: { "Content-Type": "text/plain" },
        },
      ),
      { params: { id: "page-1", wid: "w1" } },
    );
    assertEquals(res.status, 400);
  });

  it("POST update widget — returns 404 when no pageId or widgetId", async () => {
    const updateRoute = routes.find(
      (r) =>
        r.path === "/admin/pages/[id]/widgets/[wid]" &&
        r.method === "POST",
    );
    const res = await updateRoute!.run!(
      new Request(
        "http://localhost/admin/pages//widgets/",
        {
          method: "POST",
          body: JSON.stringify({}),
          headers: { "Content-Type": "application/json" },
        },
      ),
      { params: {} },
    );
    assertEquals(res.status, 404);
  });

  it("POST delete widget — returns 204 on success", async () => {
    // Create then delete
    const createRoute = routes.find(
      (r) =>
        r.path === "/admin/pages/[id]/widgets" &&
        r.method === "POST",
    );
    const createRes = await createRoute!.run!(
      new Request("http://localhost/admin/pages/page-1/widgets", {
        method: "POST",
        body: JSON.stringify({
          type: "hero",
          placeholder: "main",
          order: 0,
          data: {},
        }),
        headers: { "Content-Type": "application/json" },
      }),
      { params: { id: "page-1" } },
    );
    const created = await createRes.json();

    const deleteRoute = routes.find(
      (r) =>
        r.path === "/admin/pages/[id]/widgets/[wid]/delete" &&
        r.method === "POST",
    );
    const res = await deleteRoute!.run!(
      new Request(
        `http://localhost/admin/pages/page-1/widgets/${created.id}/delete`,
        { method: "POST" },
      ),
      { params: { id: "page-1", wid: created.id } },
    );
    assertEquals(res.status, 204);
  });

  it("POST delete widget — returns 404 for nonexistent widget", async () => {
    const deleteRoute = routes.find(
      (r) =>
        r.path === "/admin/pages/[id]/widgets/[wid]/delete" &&
        r.method === "POST",
    );
    const res = await deleteRoute!.run!(
      new Request(
        "http://localhost/admin/pages/page-1/widgets/nonexistent/delete",
        { method: "POST" },
      ),
      { params: { id: "page-1", wid: "nonexistent" } },
    );
    assertEquals(res.status, 404);
  });

  it("POST delete widget — returns 404 when no params", async () => {
    const deleteRoute = routes.find(
      (r) =>
        r.path === "/admin/pages/[id]/widgets/[wid]/delete" &&
        r.method === "POST",
    );
    const res = await deleteRoute!.run!(
      new Request(
        "http://localhost/admin/pages//widgets//delete",
        { method: "POST" },
      ),
      { params: {} },
    );
    assertEquals(res.status, 404);
  });

  it("POST reorder widgets — returns 204 on success", async () => {
    // Create 2 widgets
    const createRoute = routes.find(
      (r) =>
        r.path === "/admin/pages/[id]/widgets" &&
        r.method === "POST",
    );
    const w1Res = await createRoute!.run!(
      new Request("http://localhost/admin/pages/page-1/widgets", {
        method: "POST",
        body: JSON.stringify({
          type: "hero",
          placeholder: "main",
          order: 0,
          data: {},
        }),
        headers: { "Content-Type": "application/json" },
      }),
      { params: { id: "page-1" } },
    );
    const w1 = await w1Res.json();
    const w2Res = await createRoute!.run!(
      new Request("http://localhost/admin/pages/page-1/widgets", {
        method: "POST",
        body: JSON.stringify({
          type: "rich-text",
          placeholder: "main",
          order: 1,
          data: { content: "text" },
        }),
        headers: { "Content-Type": "application/json" },
      }),
      { params: { id: "page-1" } },
    );
    const w2 = await w2Res.json();

    const reorderRoute = routes.find(
      (r) =>
        r.path.includes("widgets/reorder") &&
        r.method === "POST",
    );
    const res = await reorderRoute!.run!(
      new Request(
        "http://localhost/admin/pages/page-1/widgets/reorder",
        {
          method: "POST",
          body: JSON.stringify([
            { widgetId: w1.id, order: 1 },
            { widgetId: w2.id, order: 0 },
          ]),
          headers: { "Content-Type": "application/json" },
        },
      ),
      { params: { id: "page-1" } },
    );
    assertEquals(res.status, 204);
  });

  it("POST reorder — returns 400 for invalid JSON", async () => {
    const reorderRoute = routes.find(
      (r) =>
        r.path.includes("widgets/reorder") &&
        r.method === "POST",
    );
    const res = await reorderRoute!.run!(
      new Request(
        "http://localhost/admin/pages/page-1/widgets/reorder",
        {
          method: "POST",
          body: "not json",
          headers: { "Content-Type": "text/plain" },
        },
      ),
      { params: { id: "page-1" } },
    );
    assertEquals(res.status, 400);
  });

  it("POST reorder — returns 400 when body is not an array", async () => {
    const reorderRoute = routes.find(
      (r) =>
        r.path.includes("widgets/reorder") &&
        r.method === "POST",
    );
    const res = await reorderRoute!.run!(
      new Request(
        "http://localhost/admin/pages/page-1/widgets/reorder",
        {
          method: "POST",
          body: JSON.stringify({ foo: "bar" }),
          headers: { "Content-Type": "application/json" },
        },
      ),
      { params: { id: "page-1" } },
    );
    assertEquals(res.status, 400);
    const body = await res.json();
    assertStringIncludes(body.error, "Expected array");
  });

  it("POST reorder — returns 404 when no pageId", async () => {
    const reorderRoute = routes.find(
      (r) =>
        r.path.includes("widgets/reorder") &&
        r.method === "POST",
    );
    const res = await reorderRoute!.run!(
      new Request(
        "http://localhost/admin/pages//widgets/reorder",
        {
          method: "POST",
          body: JSON.stringify([]),
          headers: { "Content-Type": "application/json" },
        },
      ),
      { params: {} },
    );
    assertEquals(res.status, 404);
  });
});

describe("AdminPlugin — _getFieldConfig branches", () => {
  it("should configure PostsPlugin field types (body, excerpt, status, category_ids, published_at)", async () => {
    const admin = new AdminPlugin({
      storage: "memory",
      plugins: [PostsPlugin, CategoriesPlugin],
    });
    const { routes } = await admin.init();

    // The form for new post should include the configured fields
    const newRoute = routes.find(
      (r) =>
        r.path === "/admin/plugins/post-plugin/new" &&
        r.method === "GET",
    );
    assertExists(newRoute?.run);
    const res = await newRoute!.run!(
      new Request("http://localhost/admin/plugins/post-plugin/new"),
    );
    assertEquals(res.status, 200);
    const html = await res.text();
    // Should have textarea for body
    assertStringIncludes(html, "textarea");
    // Should have select for status
    assertStringIncludes(html, "select");
  });

  it("should configure UsersPlugin field types (role_id, status)", async () => {
    const admin = new AdminPlugin({
      storage: "memory",
      plugins: [UsersPlugin, RolesPlugin],
    });
    const { routes } = await admin.init();

    const newRoute = routes.find(
      (r) =>
        r.path === "/admin/plugins/user-plugin/new" &&
        r.method === "GET",
    );
    assertExists(newRoute?.run);
    const res = await newRoute!.run!(
      new Request("http://localhost/admin/plugins/user-plugin/new"),
    );
    assertEquals(res.status, 200);
    const html = await res.text();
    assertStringIncludes(html, "select");
  });

  it("should handle boolean field type mapping to checkbox", async () => {
    const admin = new AdminPlugin({
      storage: "memory",
      plugins: [PagePlugin],
    });
    const { routes } = await admin.init();

    const newRoute = routes.find(
      (r) =>
        r.path === "/admin/plugins/page-plugin/new" &&
        r.method === "GET",
    );
    assertExists(newRoute?.run);
    const res = await newRoute!.run!(
      new Request("http://localhost/admin/plugins/page-plugin/new"),
    );
    assertEquals(res.status, 200);
    const html = await res.text();
    assertStringIncludes(html, "checkbox");
  });
});

describe("AdminPlugin — with AuditLogPlugin", () => {
  it("should seed built-in roles and permissions with KV", async () => {
    const admin = new AdminPlugin({
      storage: "kv",
      kvPath: ":memory:",
      plugins: [PagePlugin, RolesPlugin, AuditLogPlugin],
    });
    const { routes, kv } = await admin.init();

    // Verify roles were seeded — RolesPlugin.name is "RolePlugin"
    const rolesPlugin = admin.plugins.find(
      (p) => p.name === "RolePlugin",
    );
    assertExists(rolesPlugin);
    const roles = await rolesPlugin!.storage.list({ page: 1, limit: 100 });
    assertEquals(roles.length >= 3, true); // admin, editor, viewer

    // Verify CRUD routes exist
    const crudRoutes = routes.filter((r) =>
      r.path.startsWith("/admin/plugins/")
    );
    assertEquals(crudRoutes.length > 0, true);

    kv?.close();
  });
});
