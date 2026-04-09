import { describe, it } from "@std/testing/bdd";
import { assertEquals, assertStringIncludes } from "@std/assert";
import { viewEngine } from "../src/viewEngine.ts";
import { Route } from "../src/models/Route.ts";

function createRoute(
  overrides?: Partial<{
    path: string;
    hasPage: boolean;
    page: string;
    isAdmin: boolean;
    method: string;
    run: (
      req: Request,
      ctx?: { params: Record<string, string> },
    ) => Response | Promise<Response>;
  }>,
): Route {
  const route = new Route({
    path: overrides?.path ?? "/test",
    regex: /^\/test$/,
    hasPage: overrides?.hasPage ?? true,
    transpiledCode: "",
    sourcePath: "",
  });
  route.method = overrides?.method ?? "GET";
  if (overrides?.page) route.page = overrides.page;
  if (overrides?.run) route.run = overrides.run;
  return route;
}

describe("viewEngine", () => {
  it("should render an admin route page without layouts", async () => {
    const route = createRoute({
      path: "/admin",
      page: "<h1>Admin Page</h1>",
    });

    const result = await viewEngine({
      _appPath: "./example/http/app",
      route,
      req: new Request("http://localhost/admin"),
      params: {},
    });

    assertStringIncludes(result!, "<h1>Admin Page</h1>");
  });

  it("should wrap non-admin route with document layout", async () => {
    const tempDir = await Deno.makeTempDir();
    const appDir = `${tempDir}/app`;
    await Deno.mkdir(appDir, { recursive: true });

    try {
      const route = createRoute({
        path: "/",
        page: "<p>Home</p>",
      });

      const result = await viewEngine({
        _appPath: appDir,
        route,
        req: new Request("http://localhost/"),
        params: {},
      });

      assertStringIncludes(result!, "<p>Home</p>");
    } finally {
      await Deno.remove(tempDir, { recursive: true });
    }
  });

  it("should apply layouts in reverse order", async () => {
    const tempDir = await Deno.makeTempDir();
    const appDir = `${tempDir}/app`;
    const subDir = `${appDir}/test`;
    await Deno.mkdir(subDir, { recursive: true });

    try {
      await Deno.writeTextFile(
        `${appDir}/layout.html`,
        "<div class='root'>{{content}}</div>",
      );
      await Deno.writeTextFile(
        `${subDir}/layout.html`,
        "<section>{{content}}</section>",
      );

      const route = createRoute({
        path: "/test",
        page: "<p>Content</p>",
      });

      const result = await viewEngine({
        _appPath: appDir,
        route,
        req: new Request("http://localhost/test"),
        params: {},
      });

      assertStringIncludes(result!, "<p>Content</p>");
    } finally {
      await Deno.remove(tempDir, { recursive: true });
    }
  });

  it("should replace template variables from route handler response", async () => {
    const route = createRoute({
      path: "/admin/test",
      page: "<h1>{{title}}</h1><p>{{body}}</p>",
      run: () =>
        new Response(JSON.stringify({ title: "Hello", body: "World" }), {
          headers: { "Content-Type": "application/json" },
        }),
    });

    const result = await viewEngine({
      _appPath: "./example/http/app",
      route,
      req: new Request("http://localhost/admin/test"),
      params: {},
    });

    assertStringIncludes(result!, "<h1>Hello</h1>");
    assertStringIncludes(result!, "<p>World</p>");
  });

  it("should handle route without run function", async () => {
    const route = createRoute({
      path: "/admin/static",
      page: "<p>Static content</p>",
    });

    const result = await viewEngine({
      _appPath: "./example/http/app",
      route,
      req: new Request("http://localhost/admin/static"),
      params: {},
    });

    assertStringIncludes(result!, "<p>Static content</p>");
  });

  it("should handle error in route handler gracefully", async () => {
    const route = createRoute({
      path: "/admin/error",
      page: "<p>{{title}}</p>",
      run: () => {
        throw new Error("Handler error");
      },
    });

    const consoleSpy = console.error;
    console.error = () => {};
    try {
      const result = await viewEngine({
        _appPath: "./example/http/app",
        route,
        req: new Request("http://localhost/admin/error"),
        params: {},
      });
      assertStringIncludes(result!, "<p>{{title}}</p>");
    } finally {
      console.error = consoleSpy;
    }
  });

  it("should place document.html as the outermost wrapper around root layout", async () => {
    const tempDir = await Deno.makeTempDir();
    const appDir = `${tempDir}/app`;
    await Deno.mkdir(appDir, { recursive: true });

    try {
      await Deno.writeTextFile(
        `${appDir}/document.html`,
        `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body>{{content}}</body></html>`,
      );
      await Deno.writeTextFile(
        `${appDir}/layout.html`,
        "<header>H</header><main>{{content}}</main>",
      );

      const route = createRoute({
        path: "/",
        page: "<p>X</p>",
      });

      const result = await viewEngine({
        _appPath: appDir,
        route,
        req: new Request("http://localhost/"),
        params: {},
      });

      const html = result!;
      assertEquals(html.startsWith("<!DOCTYPE"), true);

      const doctypeIdx = html.indexOf("<!DOCTYPE");
      const headerIdx = html.indexOf("<header>");
      const pageIdx = html.indexOf("<p>X</p>");
      const htmlEndIdx = html.indexOf("</html>");

      assertEquals(doctypeIdx < headerIdx, true);
      assertEquals(headerIdx < pageIdx, true);
      assertEquals(pageIdx < htmlEndIdx, true);
    } finally {
      await Deno.remove(tempDir, { recursive: true });
    }
  });

  it("should nest multiple layouts between document body and page", async () => {
    const tempDir = await Deno.makeTempDir();
    const appDir = `${tempDir}/app`;
    const subDir = `${appDir}/sub`;
    await Deno.mkdir(subDir, { recursive: true });

    try {
      await Deno.writeTextFile(
        `${appDir}/document.html`,
        `<!DOCTYPE html><html><body>{{content}}</body></html>`,
      );
      await Deno.writeTextFile(
        `${appDir}/layout.html`,
        "<root>{{content}}</root>",
      );
      await Deno.writeTextFile(
        `${subDir}/layout.html`,
        "<sub>{{content}}</sub>",
      );

      const route = createRoute({
        path: "/sub",
        page: "<p>X</p>",
      });

      const result = await viewEngine({
        _appPath: appDir,
        route,
        req: new Request("http://localhost/sub"),
        params: {},
      });

      const html = result!;
      assertEquals(html.startsWith("<!DOCTYPE"), true);

      const order = [
        "<!DOCTYPE",
        "<body>",
        "<root>",
        "<sub>",
        "<p>X</p>",
        "</sub>",
        "</root>",
        "</body>",
      ];

      for (let i = 0; i < order.length - 1; i++) {
        const a = html.indexOf(order[i]);
        const b = html.indexOf(order[i + 1]);
        assertEquals(
          a < b && a !== -1 && b !== -1,
          true,
          `Expected "${order[i]}" (at ${a}) to appear before "${
            order[i + 1]
          }" (at ${b})`,
        );
      }
    } finally {
      await Deno.remove(tempDir, { recursive: true });
    }
  });

  it("should return page content as string", async () => {
    const route = createRoute({
      path: "/admin",
      page: "<div>test</div>",
    });

    const result = await viewEngine({
      _appPath: "./example/http/app",
      route,
      req: new Request("http://localhost/admin"),
      params: {},
    });

    assertEquals(typeof result, "string");
  });
});
