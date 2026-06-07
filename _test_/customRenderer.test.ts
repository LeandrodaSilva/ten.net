import { describe, it } from "@std/testing/bdd";
import { assertEquals } from "@std/assert";
import { viewEngine } from "../src/viewEngine.ts";
import { TenCore } from "../src/core/tenCore.ts";
import { Route } from "../src/models/Route.ts";
import type { TemplateRenderer } from "../src/core/types.ts";

function viewRoute(path: string, page: string, data: unknown): Route {
  const route = new Route({
    path,
    regex: new RegExp(`^${path}$`),
    hasPage: true,
    transpiledCode: "",
    sourcePath: "",
  });
  route.method = "GET";
  route.page = page;
  route.run = () =>
    new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json" },
    });
  return route;
}

describe("viewEngine — custom renderer", () => {
  it("uses the custom renderer instead of mustache substitution", async () => {
    // Admin route to skip filesystem layout reads.
    const route = viewRoute("/admin/w", "<h1>[[name]]</h1>", { name: "World" });
    const renderer: TemplateRenderer = (template, data) =>
      template.replaceAll("[[name]]", String(data.name));

    const html = await viewEngine({
      _appPath: "",
      route,
      req: new Request("http://x/admin/w"),
      params: {},
      renderer,
    });
    assertEquals(html, "<h1>World</h1>");
  });

  it("passes the template, data, and context to the renderer", async () => {
    const route = viewRoute("/admin/w", "tpl", { a: 1 });
    let received: {
      template: string;
      data: Record<string, unknown>;
      ctx: { route: string; locale?: string };
    } | undefined;
    const renderer: TemplateRenderer = (template, data, ctx) => {
      received = { template, data, ctx };
      return "ok";
    };

    await viewEngine({
      _appPath: "",
      route,
      req: new Request("http://x/admin/w"),
      params: {},
      locale: "pt-BR",
      renderer,
    });

    assertEquals(received?.template, "tpl");
    assertEquals(received?.data, { a: 1 });
    assertEquals(received?.ctx, { route: "/admin/w", locale: "pt-BR" });
  });

  it("falls back to mustache when no renderer is provided", async () => {
    const route = viewRoute("/admin/w", "<h1>{{name}}</h1>", { name: "World" });
    const html = await viewEngine({
      _appPath: "",
      route,
      req: new Request("http://x/admin/w"),
      params: {},
    });
    assertEquals(html, "<h1>World</h1>");
  });

  it("supports async renderers", async () => {
    const route = viewRoute("/admin/w", "x", { v: "1" });
    const renderer: TemplateRenderer = (_t, data) =>
      Promise.resolve(`async:${data.v}`);
    const html = await viewEngine({
      _appPath: "",
      route,
      req: new Request("http://x/admin/w"),
      params: {},
      renderer,
    });
    assertEquals(html, "async:1");
  });
});

describe("TenCore — setRenderer", () => {
  it("applies a renderer registered via setRenderer end-to-end", async () => {
    const core = new TenCore({
      routes: [viewRoute("/admin/p", "<p>[[msg]]</p>", { msg: "Hi" })],
    });
    core.setRenderer((tpl, data) =>
      tpl.replaceAll("[[msg]]", String(data.msg))
    );

    const res = await core.fetch(new Request("http://x/admin/p"));
    assertEquals(res.status, 200);
    assertEquals(await res.text(), "<p>Hi</p>");
  });

  it("accepts a renderer via the constructor option", async () => {
    const core = new TenCore({
      routes: [viewRoute("/admin/p", "[[x]]", { x: "Y" })],
      renderer: (tpl, data) => tpl.replaceAll("[[x]]", String(data.x)),
    });
    const res = await core.fetch(new Request("http://x/admin/p"));
    assertEquals(await res.text(), "Y");
  });

  it("exposes the renderer via the getter", () => {
    const core = new TenCore();
    assertEquals(core.renderer, undefined);
    const renderer: TemplateRenderer = (t) => t;
    core.setRenderer(renderer);
    assertEquals(core.renderer, renderer);
  });
});
