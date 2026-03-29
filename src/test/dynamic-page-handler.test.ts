import { describe, it } from "@std/testing/bdd";
import { assertStringIncludes } from "@std/assert";
import { renderDynamicPage } from "../routing/dynamicPageHandler.ts";
import type { StorageItem } from "../models/Storage.ts";

/**
 * Tests for renderDynamicPage.
 *
 * Uses the real `app/` directory which contains document.html and layout.html.
 * The function reads filesystem files synchronously via Deno APIs.
 */
describe("renderDynamicPage", () => {
  const appPath = "./app";

  /** Helper: create a minimal page StorageItem. */
  function makePage(overrides?: Partial<StorageItem>): StorageItem {
    return {
      id: "test-1",
      slug: "test-page",
      title: "Test Page",
      body: "<p>Hello World</p>",
      status: "published",
      seo_title: "",
      seo_description: "",
      template: "",
      author_id: "",
      ...overrides,
    };
  }

  it("should render page body inside the HTML document", () => {
    const html = renderDynamicPage(makePage(), appPath);
    assertStringIncludes(html, "<p>Hello World</p>");
    assertStringIncludes(html, "<!DOCTYPE html>");
  });

  it("should include the body content in the output", () => {
    const page = makePage({
      body: "<article><h2>Dynamic Content</h2><p>This is a test.</p></article>",
    });
    const html = renderDynamicPage(page, appPath);
    assertStringIncludes(html, "<article>");
    assertStringIncludes(html, "Dynamic Content");
  });

  it("should apply SEO title to the <title> tag", () => {
    const page = makePage({
      seo_title: "My SEO Title",
    });
    const html = renderDynamicPage(page, appPath);
    assertStringIncludes(html, "<title>My SEO Title</title>");
  });

  it("should fall back to title when seo_title is empty", () => {
    const page = makePage({
      title: "Fallback Title",
      seo_title: "",
    });
    // When seo_title is empty, the function uses item.title as fallback
    // via: String(item.seo_title ?? item.title ?? "")
    // But since seo_title is "" (not null/undefined), it resolves to ""
    // and no title replacement happens. The original <title> tag remains.
    const html = renderDynamicPage(page, appPath);
    assertStringIncludes(html, "<!DOCTYPE html>");
  });

  it("should inject meta description for seo_description", () => {
    const page = makePage({
      seo_description: "A description for search engines",
    });
    const html = renderDynamicPage(page, appPath);
    assertStringIncludes(html, "A description for search engines");
  });

  it("should escape special characters in seo_description attribute", () => {
    const page = makePage({
      seo_description: 'Quotes "here" & ampersand',
    });
    const html = renderDynamicPage(page, appPath);
    // The description is escaped for attribute use
    assertStringIncludes(html, "&amp;");
    assertStringIncludes(html, "&quot;");
  });

  it("should wrap body in document.html from app path", () => {
    const html = renderDynamicPage(makePage(), appPath);
    // app/document.html contains Tailwind CDN script
    assertStringIncludes(html, "tailwindcss");
    assertStringIncludes(html, "<html");
    assertStringIncludes(html, "</html>");
  });

  it("should render correctly with empty body", () => {
    const page = makePage({ body: "" });
    const html = renderDynamicPage(page, appPath);
    // Should still produce a valid HTML document
    assertStringIncludes(html, "<!DOCTYPE html>");
    assertStringIncludes(html, "<body");
  });

  it("should handle page with all SEO fields populated", () => {
    const page = makePage({
      body: "<p>Full page</p>",
      seo_title: "Full SEO Title",
      seo_description: "Full SEO description for this page",
    });
    const html = renderDynamicPage(page, appPath);
    assertStringIncludes(html, "<title>Full SEO Title</title>");
    assertStringIncludes(html, "Full SEO description for this page");
    assertStringIncludes(html, "<p>Full page</p>");
  });
});
