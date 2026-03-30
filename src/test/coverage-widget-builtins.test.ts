/**
 * Coverage tests for widgets/builtins — sanitizeUrl in hero.ts and image.ts, richText branch coverage
 */
import { describe, it } from "@std/testing/bdd";
import { assertEquals, assertStringIncludes } from "@std/assert";
import { heroWidget } from "../widgets/builtins/hero.ts";
import { imageWidget } from "../widgets/builtins/image.ts";
import { richTextWidget } from "../widgets/builtins/richText.ts";
import type { WidgetInstance } from "../widgets/types.ts";

const now = new Date().toISOString();

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
    created_at: now,
    updated_at: now,
  };
}

describe("heroWidget — sanitizeUrl", () => {
  it("should sanitize javascript: protocol in cta_url", () => {
    const html = heroWidget.render(
      makeInstance("hero", {
        heading: "Title",
        cta_text: "Click",
        cta_url: "javascript:alert(1)",
      }),
    );
    // sanitizeUrl returns "" for javascript: URLs, so no href should contain javascript:
    assertEquals(html.includes("javascript:"), false);
  });

  it("should sanitize data: protocol in cta_url", () => {
    const html = heroWidget.render(
      makeInstance("hero", {
        heading: "Title",
        cta_text: "Click",
        cta_url: "data:text/html,<script>alert(1)</script>",
      }),
    );
    assertEquals(html.includes("data:"), false);
  });

  it("should sanitize vbscript: protocol in cta_url", () => {
    const html = heroWidget.render(
      makeInstance("hero", {
        heading: "Title",
        cta_text: "Click",
        cta_url: "vbscript:MsgBox",
      }),
    );
    assertEquals(html.includes("vbscript:"), false);
  });
});

describe("imageWidget — sanitizeUrl", () => {
  it("should sanitize javascript: protocol in src", () => {
    const html = imageWidget.render(
      makeInstance("image", {
        src: "javascript:alert(1)",
        alt: "test",
      }),
    );
    // sanitizeUrl returns "" for javascript: src, and empty src renders ""
    assertEquals(html, "");
  });

  it("should sanitize javascript: protocol in link_url", () => {
    const html = imageWidget.render(
      makeInstance("image", {
        src: "/photo.jpg",
        alt: "test",
        link_url: "javascript:alert(1)",
      }),
    );
    assertEquals(html.includes("javascript:"), false);
  });

  it("should sanitize data: protocol in src", () => {
    const html = imageWidget.render(
      makeInstance("image", {
        src: "data:text/html,evil",
        alt: "test",
      }),
    );
    assertEquals(html, "");
  });

  it("should sanitize vbscript: protocol in link_url", () => {
    const html = imageWidget.render(
      makeInstance("image", {
        src: "/photo.jpg",
        alt: "test",
        link_url: "  VBSCRIPT:evil",
      }),
    );
    assertEquals(html.includes("vbscript"), false);
  });
});

describe("richTextWidget — branch coverage", () => {
  it("should handle undefined content gracefully", () => {
    const html = richTextWidget.render(
      makeInstance("rich-text", {}),
    );
    assertStringIncludes(html, "ten-widget-rich-text");
    // content defaults to empty string
    assertStringIncludes(html, 'class="ten-widget-rich-text');
  });

  it("should handle null content gracefully", () => {
    const html = richTextWidget.render(
      makeInstance("rich-text", { content: null }),
    );
    assertStringIncludes(html, "ten-widget-rich-text");
  });
});
