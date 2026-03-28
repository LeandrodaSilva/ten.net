import { describe, it } from "@std/testing/bdd";
import { assertEquals, assertStringIncludes } from "@std/assert";
import { escapeHtml } from "../auth/htmlEscape.ts";
import { viewEngine } from "../viewEngine.ts";
import { Route } from "../models/Route.ts";

function createAdminRoute(
  page: string,
  run?: (
    req: Request,
    ctx?: { params: Record<string, string> },
  ) => Response | Promise<Response>,
): Route {
  const route = new Route({
    path: "/admin/test",
    regex: /^\/admin\/test$/,
    hasPage: true,
    transpiledCode: "",
    sourcePath: "",
  });
  route.method = "GET";
  route.page = page;
  if (run) route.run = run;
  return route;
}

// --- escapeHtml ---
describe("escapeHtml", () => {
  it("should escape & to &amp;", () => {
    assertEquals(escapeHtml("a & b"), "a &amp; b");
  });

  it("should escape < to &lt;", () => {
    assertEquals(escapeHtml("<script>"), "&lt;script&gt;");
  });

  it("should escape > to &gt;", () => {
    assertEquals(escapeHtml("a > b"), "a &gt; b");
  });

  it('should escape " to &quot;', () => {
    assertEquals(escapeHtml('"hello"'), "&quot;hello&quot;");
  });

  it("should escape ' to &#x27;", () => {
    assertEquals(escapeHtml("it's"), "it&#x27;s");
  });

  it("should escape multiple special characters", () => {
    const input = '<script>alert("XSS & more")</script>';
    const output = escapeHtml(input);
    assertStringIncludes(output, "&lt;script&gt;");
    assertStringIncludes(output, "&amp;");
    assertStringIncludes(output, "&quot;");
  });

  it("should return unchanged string with no special chars", () => {
    assertEquals(escapeHtml("Hello World"), "Hello World");
  });

  it("should return empty string for empty input", () => {
    assertEquals(escapeHtml(""), "");
  });
});

// --- viewEngine XSS escaping ---
describe("viewEngine XSS — {{variable}} escaping", () => {
  it("should escape HTML in {{variable}} placeholders", async () => {
    const route = createAdminRoute(
      "<div>{{userInput}}</div>",
      () =>
        new Response(
          JSON.stringify({ userInput: '<script>alert("xss")</script>' }),
          { headers: { "Content-Type": "application/json" } },
        ),
    );
    const consoleSpy = console.error;
    console.error = () => {};
    try {
      const result = await viewEngine({
        _appPath: "./app",
        route,
        req: new Request("http://localhost/admin/test"),
        params: {},
      });
      assertStringIncludes(result!, "&lt;script&gt;");
      assertEquals(result!.includes("<script>"), false);
    } finally {
      console.error = consoleSpy;
    }
  });

  it("should escape & in {{variable}} placeholders", async () => {
    const route = createAdminRoute(
      "<p>{{content}}</p>",
      () =>
        new Response(JSON.stringify({ content: "foo & bar" }), {
          headers: { "Content-Type": "application/json" },
        }),
    );
    const result = await viewEngine({
      _appPath: "./app",
      route,
      req: new Request("http://localhost/admin/test"),
      params: {},
    });
    assertStringIncludes(result!, "&amp;");
    assertEquals(result!.includes("foo & bar"), false);
  });

  it("should escape double quotes in {{variable}} placeholders", async () => {
    const route = createAdminRoute(
      "<p>{{content}}</p>",
      () =>
        new Response(JSON.stringify({ content: '"hello"' }), {
          headers: { "Content-Type": "application/json" },
        }),
    );
    const result = await viewEngine({
      _appPath: "./app",
      route,
      req: new Request("http://localhost/admin/test"),
      params: {},
    });
    assertStringIncludes(result!, "&quot;");
  });
});

describe("viewEngine — {{{variable}}} raw (unescaped)", () => {
  it("should NOT escape HTML in {{{variable}}} triple-brace placeholders", async () => {
    const route = createAdminRoute(
      "<div>{{{rawHtml}}}</div>",
      () =>
        new Response(
          JSON.stringify({ rawHtml: "<strong>bold</strong>" }),
          { headers: { "Content-Type": "application/json" } },
        ),
    );
    const result = await viewEngine({
      _appPath: "./app",
      route,
      req: new Request("http://localhost/admin/test"),
      params: {},
    });
    assertStringIncludes(result!, "<strong>bold</strong>");
  });

  it("should allow raw HTML injection through {{{variable}}} when intentional", async () => {
    const route = createAdminRoute(
      "<div>{{{content}}}</div>",
      () =>
        new Response(
          JSON.stringify({ content: "<em>italic</em>" }),
          { headers: { "Content-Type": "application/json" } },
        ),
    );
    const result = await viewEngine({
      _appPath: "./app",
      route,
      req: new Request("http://localhost/admin/test"),
      params: {},
    });
    assertStringIncludes(result!, "<em>italic</em>");
  });
});

describe("viewEngine — {{variable}} and {{{variable}}} coexistence", () => {
  it("should replace {{{key}}} first (raw), then {{key}} (escaped)", async () => {
    const route = createAdminRoute(
      "<p>{{title}}</p><div>{{{body}}}</div>",
      () =>
        new Response(
          JSON.stringify({ title: "<b>test</b>", body: "<b>bold</b>" }),
          { headers: { "Content-Type": "application/json" } },
        ),
    );
    const result = await viewEngine({
      _appPath: "./app",
      route,
      req: new Request("http://localhost/admin/test"),
      params: {},
    });
    // {{title}} should be escaped
    assertStringIncludes(result!, "&lt;b&gt;test&lt;/b&gt;");
    // {{{body}}} should be raw
    assertStringIncludes(result!, "<b>bold</b>");
  });
});
