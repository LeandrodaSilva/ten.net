import { describe, it } from "@std/testing/bdd";
import { assertEquals, assertStringIncludes } from "@std/assert";
import { routerEngine } from "../../packages/core/src/routerEngine.ts";

describe("routerEngine", () => {
  it("should return empty array for directory with no routes", async () => {
    const tempDir = await Deno.makeTempDir();
    try {
      const routes = await routerEngine(tempDir, "route.ts");
      assertEquals(routes.length, 0);
    } finally {
      await Deno.remove(tempDir, { recursive: true });
    }
  });

  it("should detect directory with page.html", async () => {
    const tempDir = await Deno.makeTempDir();
    try {
      await Deno.writeTextFile(`${tempDir}/page.html`, "<h1>Hello</h1>");

      const routes = await routerEngine(tempDir, "route.ts");
      assertEquals(routes.length, 1);
      assertEquals(routes[0].hasPage, true);
    } finally {
      await Deno.remove(tempDir, { recursive: true });
    }
  });

  it("should detect directory with route.ts", async () => {
    const tempDir = await Deno.makeTempDir();
    try {
      await Deno.writeTextFile(
        `${tempDir}/route.ts`,
        "export function GET() { return new Response('ok'); }",
      );

      const consoleSpy = console.error;
      console.error = () => {};
      try {
        const routes = await routerEngine(tempDir, "route.ts");
        assertEquals(routes.length, 1);
      } finally {
        console.error = consoleSpy;
      }
    } finally {
      await Deno.remove(tempDir, { recursive: true });
    }
  });

  it("should detect directory with both route.ts and page.html", async () => {
    const tempDir = await Deno.makeTempDir();
    try {
      await Deno.writeTextFile(
        `${tempDir}/route.ts`,
        "export function GET() { return new Response('ok'); }",
      );
      await Deno.writeTextFile(`${tempDir}/page.html`, "<h1>Page</h1>");

      const consoleSpy = console.error;
      console.error = () => {};
      try {
        const routes = await routerEngine(tempDir, "route.ts");
        assertEquals(routes.length, 1);
        assertEquals(routes[0].hasPage, true);
      } finally {
        console.error = consoleSpy;
      }
    } finally {
      await Deno.remove(tempDir, { recursive: true });
    }
  });

  it("should ignore directory without route file or page", async () => {
    const tempDir = await Deno.makeTempDir();
    const subDir = `${tempDir}/empty`;
    await Deno.mkdir(subDir, { recursive: true });
    try {
      await Deno.writeTextFile(`${subDir}/readme.md`, "# Nothing here");

      const routes = await routerEngine(tempDir, "route.ts");
      assertEquals(routes.length, 0);
    } finally {
      await Deno.remove(tempDir, { recursive: true });
    }
  });

  it("should generate correct path for root directory using ./app convention", async () => {
    const tempDir = await Deno.makeTempDir();
    const appDir = `${tempDir}/app`;
    await Deno.mkdir(appDir, { recursive: true });
    try {
      await Deno.writeTextFile(`${appDir}/page.html`, "<h1>Root</h1>");

      const routes = await routerEngine(`./app`, "route.ts");
      const rootRoute = routes.find((r) => r.path === "/");
      assertEquals(rootRoute !== undefined, true);
    } finally {
      await Deno.remove(tempDir, { recursive: true });
    }
  });

  it("should generate multiple routes for sub directories", async () => {
    const tempDir = await Deno.makeTempDir();
    const appDir = `${tempDir}/app`;
    const usersDir = `${appDir}/users`;
    await Deno.mkdir(usersDir, { recursive: true });
    try {
      await Deno.writeTextFile(`${appDir}/page.html`, "<h1>Root</h1>");
      await Deno.writeTextFile(`${usersDir}/page.html`, "<h1>Users</h1>");

      const routes = await routerEngine(appDir, "route.ts");
      assertEquals(routes.length, 2);
      const pages = routes.map((r) => r.page);
      assertEquals(pages.includes("<h1>Root</h1>"), true);
      assertEquals(pages.includes("<h1>Users</h1>"), true);
    } finally {
      await Deno.remove(tempDir, { recursive: true });
    }
  });

  it("should set page content from page.html", async () => {
    const tempDir = await Deno.makeTempDir();
    try {
      await Deno.writeTextFile(
        `${tempDir}/page.html`,
        "<h1>Test Content</h1>",
      );

      const routes = await routerEngine(tempDir, "route.ts");
      assertStringIncludes(routes[0].page, "<h1>Test Content</h1>");
    } finally {
      await Deno.remove(tempDir, { recursive: true });
    }
  });

  it("should handle transpilation errors gracefully", async () => {
    const tempDir = await Deno.makeTempDir();
    try {
      await Deno.writeTextFile(
        `${tempDir}/route.ts`,
        "this is not valid typescript {{{",
      );

      const consoleSpy = console.error;
      console.error = () => {};
      try {
        const routes = await routerEngine(tempDir, "route.ts");
        assertEquals(routes.length, 1);
      } finally {
        console.error = consoleSpy;
      }
    } finally {
      await Deno.remove(tempDir, { recursive: true });
    }
  });

  it("should set sourcePath correctly", async () => {
    const tempDir = await Deno.makeTempDir();
    try {
      await Deno.writeTextFile(`${tempDir}/page.html`, "<p>test</p>");

      const routes = await routerEngine(tempDir, "route.ts");
      assertStringIncludes(routes[0].sourcePath, "route.ts");
    } finally {
      await Deno.remove(tempDir, { recursive: true });
    }
  });
});
