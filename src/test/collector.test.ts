import { describe, it } from "@std/testing/bdd";
import { assertEquals, assertStringIncludes } from "@std/assert";
import { collectManifest } from "../../src/build/collector.ts";

describe("collectManifest", () => {
  it("should collect all routes from app directory", async () => {
    const manifest = await collectManifest("./example/app", "./public");

    const paths = manifest.routes.map((r) => r.path);
    assertStringIncludes(paths.join(","), "/hello");
    assertStringIncludes(paths.join(","), "/form");
    assertStringIncludes(paths.join(","), "/api/hello");
  });

  it("should include transpiledCode for all routes with route.ts", async () => {
    const manifest = await collectManifest("./example/app", "./public");

    const routesWithHandler = [
      "/hello",
      "/form",
      "/api/hello",
      "/api/hello/[name]",
      "/form/congrats",
    ];

    for (const path of routesWithHandler) {
      const route = manifest.routes.find((r) => r.path === path);
      assertEquals(
        route !== undefined,
        true,
        `Route ${path} should exist in manifest`,
      );
      assertEquals(
        route!.transpiledCode.length > 0,
        true,
        `Route ${path} should have non-empty transpiledCode`,
      );
    }
  });

  it("should produce valid ESM in transpiledCode", async () => {
    const manifest = await collectManifest("./example/app", "./public");

    const routesWithHandler = manifest.routes.filter(
      (r) => r.transpiledCode.length > 0,
    );

    for (const route of routesWithHandler) {
      assertStringIncludes(
        route.transpiledCode,
        "export",
        `Route ${route.path} transpiledCode should contain 'export'`,
      );
    }
  });

  it("should set pageContent for routes with page.html", async () => {
    const manifest = await collectManifest("./example/app", "./public");

    const helloRoute = manifest.routes.find((r) => r.path === "/hello");
    assertEquals(helloRoute !== undefined, true);
    assertEquals(helloRoute!.hasPage, true);
    assertStringIncludes(helloRoute!.pageContent, "{{name}}");
  });

  it("should collect document.html", async () => {
    const manifest = await collectManifest("./example/app", "./public");
    assertStringIncludes(manifest.documentHtml, "{{content}}");
  });
});
