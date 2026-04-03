/**
 * Coverage tests for routing/dynamicPageHandler.ts
 * Covers: widget pipeline, SEO tag injection branches, escapeAttr/escapeHtmlContent
 */
import { afterEach, beforeEach, describe, it } from "@std/testing/bdd";
import { assertEquals, assertStringIncludes } from "@std/assert";
import { renderDynamicPage } from "../../packages/core/src/routing/dynamicPageHandler.ts";
import { renderWidgetPage } from "../../packages/core/src/routing/widgetPageHandler.ts";
import { WidgetStore } from "../../packages/widgets/src/widgetStore.ts";
import { registerBuiltinWidgets } from "../../packages/widgets/src/builtins/index.ts";
import type { StorageItem } from "../../packages/core/src/models/Storage.ts";

// We need a real app path with document.html and layout.html for the handler
const APP_PATH = `${Deno.cwd()}/app`;

describe("renderDynamicPage", () => {
  let kv: Deno.Kv;

  beforeEach(async () => {
    kv = await Deno.openKv(":memory:");
    registerBuiltinWidgets();
  });

  afterEach(() => {
    kv.close();
  });

  it("should render a basic page without widgets", async () => {
    const item: StorageItem = {
      id: "page-1",
      body: "<p>Hello World</p>",
      title: "Test",
      seo_title: "Test Page",
      seo_description: "A test page",
    };
    const html = await renderDynamicPage(item, APP_PATH);
    assertStringIncludes(html, "<p>Hello World</p>");
    assertStringIncludes(html, "Test Page");
  });

  it("should render page with widgets when widgets_enabled is true", async () => {
    const store = new WidgetStore(kv);
    await store.create("page-widget", {
      type: "rich-text",
      placeholder: "main",
      order: 0,
      data: { content: "<p>Widget content</p>" },
    });

    const item: StorageItem = {
      id: "page-widget",
      body: "<div>{{widgets:main}}</div>",
      title: "Widget Page",
      seo_title: "Widget Page",
      seo_description: "",
      widgets_enabled: "true",
    };
    const html = await renderDynamicPage(
      item,
      APP_PATH,
      kv,
      undefined,
      renderWidgetPage,
    );
    assertStringIncludes(html, "Widget content");
    assertEquals(html.includes("{{widgets:main}}"), false);
  });

  it("should not process widgets when widgets_enabled is not true", async () => {
    const item: StorageItem = {
      id: "page-no-widgets",
      body: "<div>{{widgets:main}}</div>",
      title: "No Widgets",
      seo_title: "",
      seo_description: "",
      widgets_enabled: "false",
    };
    const html = await renderDynamicPage(item, APP_PATH);
    // Placeholder should remain since widgets are not enabled
    assertStringIncludes(html, "{{widgets:main}}");
  });

  it("should inject seo_description meta tag", async () => {
    const item: StorageItem = {
      id: "seo-test",
      body: "<p>Content</p>",
      title: "SEO Test",
      seo_title: "My SEO Title",
      seo_description: 'A description with "quotes" & <special> chars',
    };
    const html = await renderDynamicPage(item, APP_PATH);
    // Should escape special chars in attr
    assertStringIncludes(html, "&amp;");
    assertStringIncludes(html, "&quot;");
    assertStringIncludes(html, "&lt;");
  });

  it("should replace seo_title in title tag", async () => {
    const item: StorageItem = {
      id: "title-test",
      body: "<p>Content</p>",
      title: "Test",
      seo_title: "Custom <Title> & More",
      seo_description: "",
    };
    const html = await renderDynamicPage(item, APP_PATH);
    // escapeHtmlContent should escape < and > and &
    assertStringIncludes(html, "Custom &lt;Title&gt; &amp; More");
  });

  it("should handle missing body gracefully", async () => {
    const item: StorageItem = {
      id: "no-body",
      title: "No Body",
      seo_title: "",
      seo_description: "",
    };
    const html = await renderDynamicPage(item, APP_PATH);
    // Should not crash and return some HTML
    assertStringIncludes(html, "<!DOCTYPE html>");
  });

  it("should handle empty seo fields", async () => {
    const item: StorageItem = {
      id: "empty-seo",
      body: "<p>Content</p>",
      title: "Test",
      seo_title: "",
      seo_description: "",
    };
    const html = await renderDynamicPage(item, APP_PATH);
    assertStringIncludes(html, "<p>Content</p>");
  });
});
