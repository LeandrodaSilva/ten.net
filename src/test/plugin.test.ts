import { describe, it } from "@std/testing/bdd";
import { assertEquals, assertStringIncludes } from "@std/assert";
import { AdminPlugin } from "../plugins/adminPlugin.ts";
import { PagePlugin } from "../plugins/pagePlugin.ts";

describe("AdminPlugin", () => {
  it("should have correct name", () => {
    const plugin = new AdminPlugin();
    assertEquals(plugin.name, "AdminPlugin");
  });

  it("should have correct description", () => {
    const plugin = new AdminPlugin();
    assertEquals(plugin.description, "A plugin for handling page rendering.");
  });

  it("should have correct model", () => {
    const plugin = new AdminPlugin();
    assertEquals(plugin.model, { name: "string", html: "string" });
  });

  it("should generate routes with getRoutes()", () => {
    const plugin = new AdminPlugin();
    const routes = plugin.getRoutes();
    // AdminPlugin generates only 1 route (no CRUD for admin-plugin slug)
    assertEquals(routes.length, 1);
  });

  it("should generate admin index route at /admin", () => {
    const plugin = new AdminPlugin();
    const routes = plugin.getRoutes();
    assertEquals(routes[0].path, "/admin");
  });

  it("should have page content in admin route", () => {
    const plugin = new AdminPlugin();
    const routes = plugin.getRoutes();
    assertStringIncludes(routes[0].page, "<!DOCTYPE html>");
  });

  it("should have GET method on admin route", () => {
    const plugin = new AdminPlugin();
    const routes = plugin.getRoutes();
    assertEquals(routes[0].method, "GET");
  });

  it("should have hasPage true on admin route", () => {
    const plugin = new AdminPlugin();
    const routes = plugin.getRoutes();
    assertEquals(routes[0].hasPage, true);
  });

  it("should have a run handler that returns JSON response", async () => {
    const plugin = new AdminPlugin();
    const routes = plugin.getRoutes();
    const handler = routes[0].run!;
    const req = new Request("http://localhost/admin");
    const response = handler(req);
    const body = await (response as Response).json();
    assertEquals(body.plugin, "AdminPlugin");
    assertEquals(body.description, "A plugin for handling page rendering.");
    assertEquals(body.model, { name: "string", html: "string" });
  });
});

describe("PagePlugin", () => {
  it("should have correct name", () => {
    const plugin = new PagePlugin();
    assertEquals(plugin.name, "PagePlugin");
  });

  it("should have correct description", () => {
    const plugin = new PagePlugin();
    assertEquals(plugin.description, "A plugin for handling page rendering.");
  });

  it("should have correct model", () => {
    const plugin = new PagePlugin();
    assertEquals(plugin.model, { name: "string", html: "string" });
  });

  it("should generate routes at /admin/plugins/page-plugin", () => {
    const plugin = new PagePlugin();
    const routes = plugin.getRoutes();
    // PagePlugin now generates CRUD routes: index GET, POST create, GET [id], POST [id], POST [id]/delete
    assertEquals(routes.length, 5);
    assertEquals(routes[0].path, "/admin/plugins/page-plugin");
  });

  it("should have page content with PluginList", () => {
    const plugin = new PagePlugin();
    const routes = plugin.getRoutes();
    assertStringIncludes(routes[0].page, "<!DOCTYPE html>");
    assertStringIncludes(routes[0].page, "{{plugin}}");
  });

  it("should have a run handler that returns JSON", async () => {
    const plugin = new PagePlugin();
    const routes = plugin.getRoutes();
    const handler = routes[0].run!;
    const req = new Request("http://localhost/admin/plugins/page-plugin");
    const response = await handler(req);
    const body = await (response as Response).json();
    assertEquals(body.plugin, "PagePlugin");
  });
});

describe("Plugin plugins setter", () => {
  it("should accept an array of plugins", () => {
    const admin = new AdminPlugin();
    const page = new PagePlugin();
    admin.plugins = [admin, page];
    // No error thrown = success
    assertEquals(true, true);
  });
});
