import { describe, it } from "@std/testing/bdd";
import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { htmlWidget } from "../../packages/widgets/src/builtins/html.ts";
import { embedWidget } from "../../packages/widgets/src/builtins/embed.ts";
import type { WidgetInstance } from "../../packages/widgets/src/types.ts";

function makeInstance(
  type: string,
  data: Record<string, unknown>,
): WidgetInstance {
  return {
    id: "test-id",
    type: type as WidgetInstance["type"],
    placeholder: "main",
    order: 0,
    data,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  };
}

// ── HTML Widget ───────────────────────────────────────────────────────────────

describe("htmlWidget", () => {
  it("should render raw HTML content without escaping", () => {
    const html = htmlWidget.render(
      makeInstance("html", { content: "<h1>Hello</h1><p>World</p>" }),
    );
    assertStringIncludes(html, "<h1>Hello</h1><p>World</p>");
    assertStringIncludes(html, "ten-widget-html");
  });

  it("should NOT escape HTML tags (raw output)", () => {
    const html = htmlWidget.render(
      makeInstance("html", { content: "<script>alert(1)</script>" }),
    );
    assertStringIncludes(html, "<script>alert(1)</script>");
    assert(!html.includes("&lt;script&gt;"));
  });

  it("should wrap content in div with class ten-widget-html", () => {
    const html = htmlWidget.render(
      makeInstance("html", { content: "test" }),
    );
    assert(html.startsWith('<div class="ten-widget-html">'));
    assert(html.endsWith("</div>"));
  });

  it("should handle empty content", () => {
    const html = htmlWidget.render(makeInstance("html", { content: "" }));
    assertEquals(html, '<div class="ten-widget-html"></div>');
  });

  it("should handle undefined content gracefully", () => {
    const html = htmlWidget.render(makeInstance("html", {}));
    assertEquals(html, '<div class="ten-widget-html"></div>');
  });

  it("should handle null content gracefully", () => {
    const html = htmlWidget.render(makeInstance("html", { content: null }));
    assertEquals(html, '<div class="ten-widget-html"></div>');
  });

  it("should be marked as restricted", () => {
    assertEquals(htmlWidget.restricted, true);
  });

  it("should have type html", () => {
    assertEquals(htmlWidget.type, "html");
  });
});

// ── Embed Widget ──────────────────────────────────────────────────────────────

describe("embedWidget", () => {
  it("should render iframe with url, title, width, height", () => {
    const html = embedWidget.render(
      makeInstance("embed", {
        url: "https://example.com",
        title: "Example",
        width: "100%",
        height: 400,
      }),
    );
    assertStringIncludes(html, 'src="https://example.com"');
    assertStringIncludes(html, 'title="Example"');
    assertStringIncludes(html, 'width="100%"');
    assertStringIncludes(html, 'height="400"');
    assertStringIncludes(html, "ten-widget-embed");
  });

  it("should include sandbox attribute", () => {
    const html = embedWidget.render(
      makeInstance("embed", { url: "https://example.com" }),
    );
    assertStringIncludes(html, 'sandbox="allow-scripts allow-forms"');
  });

  it("should include loading=lazy", () => {
    const html = embedWidget.render(
      makeInstance("embed", { url: "https://example.com" }),
    );
    assertStringIncludes(html, 'loading="lazy"');
  });

  it("should sanitize javascript: URL to empty string", () => {
    const html = embedWidget.render(
      makeInstance("embed", { url: "javascript:alert(1)" }),
    );
    assertEquals(html, "");
  });

  it("should sanitize data: URL", () => {
    const html = embedWidget.render(
      makeInstance("embed", {
        url: "data:text/html,<script>alert(1)</script>",
      }),
    );
    assertEquals(html, "");
  });

  it("should sanitize vbscript: URL", () => {
    const html = embedWidget.render(
      makeInstance("embed", { url: "vbscript:MsgBox" }),
    );
    assertEquals(html, "");
  });

  it("should sanitize case-insensitive javascript: URL", () => {
    const html = embedWidget.render(
      makeInstance("embed", { url: "  JAVASCRIPT:alert(1)" }),
    );
    assertEquals(html, "");
  });

  it("should escape HTML in attributes (escapeAttr)", () => {
    const html = embedWidget.render(
      makeInstance("embed", {
        url: "https://example.com",
        title: 'A "title" with <special> & chars',
      }),
    );
    assertStringIncludes(html, "&quot;title&quot;");
    assertStringIncludes(html, "&lt;special&gt;");
    assertStringIncludes(html, "&amp;");
    assert(!html.includes('"title"'));
  });

  it("should render title attribute for accessibility", () => {
    const html = embedWidget.render(
      makeInstance("embed", {
        url: "https://youtube.com/embed/123",
        title: "My Video",
      }),
    );
    assertStringIncludes(html, 'title="My Video"');
  });

  it("should use default width 100% and height 400", () => {
    const html = embedWidget.render(
      makeInstance("embed", { url: "https://example.com" }),
    );
    assertStringIncludes(html, 'width="100%"');
    assertStringIncludes(html, 'height="400"');
  });

  it("should return empty string for empty URL", () => {
    const html = embedWidget.render(makeInstance("embed", { url: "" }));
    assertEquals(html, "");
  });

  it("should return empty string for undefined URL", () => {
    const html = embedWidget.render(makeInstance("embed", {}));
    assertEquals(html, "");
  });

  it("should be marked as restricted", () => {
    assertEquals(embedWidget.restricted, true);
  });

  it("should have type embed", () => {
    assertEquals(embedWidget.type, "embed");
  });
});
