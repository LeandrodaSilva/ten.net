import { describe, it } from "@std/testing/bdd";
import { assertEquals } from "@std/assert";
import { embeddedRouterEngine } from "../src/embedded/embeddedRouterEngine.ts";
import type { AppManifest } from "../src/build/manifest.ts";

function createTestManifest(): AppManifest {
  return {
    routes: [
      {
        path: "/",
        regexSource: "^\\/$$",
        regexFlags: "",
        hasPage: true,
        transpiledCode:
          'export function GET() { return new Response("home"); }',
        pageContent: "<h1>Home</h1>",
      },
      {
        path: "/api/hello",
        regexSource: "^\\/api\\/hello$$",
        regexFlags: "",
        hasPage: false,
        transpiledCode:
          'export function GET() { return new Response("hello"); }',
        pageContent: "",
      },
      {
        path: "/users/[id]",
        regexSource: "^\\/users\\/[^\\/]+$$",
        regexFlags: "",
        hasPage: true,
        transpiledCode:
          "export function GET(req, ctx) { return Response.json({ id: ctx.params.id }); }",
        pageContent: "<h1>User {{id}}</h1>",
      },
    ],
    layouts: {
      "/": ["<div class='layout'>{{content}}</div>"],
      "/users/[id]": ["<div class='layout'>{{content}}</div>"],
    },
    documentHtml: "<html><body>{{content}}</body></html>",
    assets: {},
  };
}

describe("embeddedRouterEngine", () => {
  it("should create Route objects from manifest", () => {
    const manifest = createTestManifest();
    const routes = embeddedRouterEngine(manifest);

    assertEquals(routes.length, 3);
  });

  it("should set correct path on each route", () => {
    const manifest = createTestManifest();
    const routes = embeddedRouterEngine(manifest);

    assertEquals(routes[0].path, "/");
    assertEquals(routes[1].path, "/api/hello");
    assertEquals(routes[2].path, "/users/[id]");
  });

  it("should reconstruct regex correctly", () => {
    const manifest = createTestManifest();
    const routes = embeddedRouterEngine(manifest);

    assertEquals(routes[0].regex.test("/"), true);
    assertEquals(routes[0].regex.test("/other"), false);

    assertEquals(routes[1].regex.test("/api/hello"), true);
    assertEquals(routes[1].regex.test("/api/bye"), false);

    assertEquals(routes[2].regex.test("/users/123"), true);
    assertEquals(routes[2].regex.test("/users/abc"), true);
    assertEquals(routes[2].regex.test("/posts/123"), false);
  });

  it("should set hasPage correctly", () => {
    const manifest = createTestManifest();
    const routes = embeddedRouterEngine(manifest);

    assertEquals(routes[0].hasPage, true);
    assertEquals(routes[1].hasPage, false);
    assertEquals(routes[2].hasPage, true);
  });

  it("should set transpiledCode correctly", () => {
    const manifest = createTestManifest();
    const routes = embeddedRouterEngine(manifest);

    assertEquals(routes[0].transpiledCode.includes("GET"), true);
    assertEquals(routes[1].transpiledCode.includes("hello"), true);
  });

  it("should set page content correctly", () => {
    const manifest = createTestManifest();
    const routes = embeddedRouterEngine(manifest);

    assertEquals(routes[0].page, "<h1>Home</h1>");
    assertEquals(routes[1].page, "");
    assertEquals(routes[2].page, "<h1>User {{id}}</h1>");
  });

  it("should set sourcePath to empty string", () => {
    const manifest = createTestManifest();
    const routes = embeddedRouterEngine(manifest);

    for (const route of routes) {
      assertEquals(route.sourcePath, "");
    }
  });
});
