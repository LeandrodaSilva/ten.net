import { afterEach, beforeEach, describe, it } from "@std/testing/bdd";
import { assertEquals, assertExists, assertStringIncludes } from "@std/assert";
import { AdminPlugin } from "../plugins/adminPlugin.tsx";
import { PagePlugin } from "../plugins/pagePlugin.ts";
import type { Route } from "../models/Route.ts";

describe("Page Builder routes", () => {
  let admin: AdminPlugin;
  let routes: Route[];
  let kv: Deno.Kv | undefined;

  beforeEach(async () => {
    admin = new AdminPlugin({
      storage: "kv",
      kvPath: ":memory:",
      plugins: [PagePlugin],
    });
    const result = await admin.init();
    routes = result.routes;
    kv = result.kv;
  });

  afterEach(() => {
    kv?.close();
  });

  it("GET /admin/pages/[id]/builder returns 200 with HTML for existing page", async () => {
    // First create a page via CRUD
    const pagePlugin = admin.plugins.find((p) => p.name === "PagePlugin");
    assertExists(pagePlugin);
    const pageId = crypto.randomUUID();
    const now = new Date().toISOString();
    await pagePlugin.storage.set(pageId, {
      id: pageId,
      slug: "test-page",
      title: "Test Page",
      body: "<p>Hello</p>",
      status: "published",
      seo_title: "",
      seo_description: "",
      template: "",
      author_id: "",
      widgets_enabled: "true",
      created_at: now,
      updated_at: now,
    });

    const builderRoute = routes.find(
      (r) => r.path === "/admin/pages/[id]/builder" && r.method === "GET",
    );
    assertExists(builderRoute?.run);

    const req = new Request(
      `http://localhost/admin/pages/${pageId}/builder`,
    );
    const res = await builderRoute!.run!(req, {
      params: { id: pageId },
    });
    assertEquals(res.status, 200);
    assertEquals(res.headers.get("Content-Type"), "text/html");
    const html = await res.text();
    assertStringIncludes(html, "<!DOCTYPE html>");
    assertStringIncludes(html, "builder-canvas");
  });

  it("GET /admin/pages/[id]/builder returns 404 for non-existent page", async () => {
    const builderRoute = routes.find(
      (r) => r.path === "/admin/pages/[id]/builder" && r.method === "GET",
    );
    assertExists(builderRoute?.run);

    const req = new Request(
      "http://localhost/admin/pages/nonexistent/builder",
    );
    const res = await builderRoute!.run!(req, {
      params: { id: "nonexistent" },
    });
    assertEquals(res.status, 404);
  });

  it("Page Builder button appears on edit form when widgets_enabled=true", async () => {
    // Create a page with widgets_enabled
    const pagePlugin = admin.plugins.find((p) => p.name === "PagePlugin");
    assertExists(pagePlugin);
    const pageId = crypto.randomUUID();
    const now = new Date().toISOString();
    await pagePlugin.storage.set(pageId, {
      id: pageId,
      slug: "builder-page",
      title: "Builder Page",
      body: "<p>Content</p>",
      status: "draft",
      seo_title: "",
      seo_description: "",
      template: "",
      author_id: "",
      widgets_enabled: "true",
      created_at: now,
      updated_at: now,
    });

    // Find the edit route (GET /admin/plugins/page-plugin/[id])
    const editRoute = routes.find(
      (r) => r.path === "/admin/plugins/page-plugin/[id]" && r.method === "GET",
    );
    assertExists(editRoute?.run);

    const req = new Request(
      `http://localhost/admin/plugins/page-plugin/${pageId}`,
    );
    const res = await editRoute!.run!(req, {
      params: { id: pageId },
    });
    assertEquals(res.status, 200);
    const html = await res.text();
    assertStringIncludes(html, "Page Builder");
    assertStringIncludes(html, `/admin/pages/${pageId}/builder`);
  });
});
