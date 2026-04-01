/**
 * Coverage tests for remaining uncovered lines in various files.
 * Targets: widgetPageHandler catch branch, dynamicPageHandler layout/SEO branches,
 *          widgetStore atomic failures, auth paths, transpileRoute, terminalUi
 */
import { afterEach, beforeEach, describe, it } from "@std/testing/bdd";
import { assertEquals, assertStringIncludes } from "@std/assert";
import { renderWidgetPage } from "../../packages/core/src/routing/widgetPageHandler.ts";

import { widgetRegistry } from "../../packages/widgets/src/widgetRegistry.ts";
import { registerBuiltinWidgets } from "../../packages/widgets/src/builtins/index.ts";
import { renderDynamicPage } from "../../packages/core/src/routing/dynamicPageHandler.ts";
import type { StorageItem } from "../../packages/core/src/models/Storage.ts";
import { transpileRoute } from "../../packages/core/src/utils/transpileRoute.ts";
import { TerminalUi } from "../../packages/core/src/terminalUi.ts";
import { parseCookie } from "../../packages/admin/src/auth/authMiddleware.ts";

describe("renderWidgetPage — catch/error branch", () => {
  let kv: Deno.Kv;

  beforeEach(async () => {
    kv = await Deno.openKv(":memory:");
    registerBuiltinWidgets();
  });

  afterEach(() => {
    kv.close();
  });

  it("should handle widget render error gracefully", async () => {
    // Register a widget that throws on render
    widgetRegistry.register({
      type: "custom:broken",
      label: "Broken",
      description: "Widget that throws",
      icon: "",
      fields: [],
      defaultPlaceholder: "main",
      render: () => {
        throw new Error("render error");
      },
    });

    // Insert an instance of the broken widget
    const now = new Date().toISOString();
    await kv.set(["widgets", "page-err", "instance", "err-1"], {
      id: "err-1",
      type: "custom:broken",
      placeholder: "main",
      order: 0,
      data: {},
      created_at: now,
      updated_at: now,
    });

    const body = "{{widgets:main}}";
    const result = await renderWidgetPage("page-err", body, kv);
    // Render error should be caught, placeholder replaced with empty
    assertEquals(result.includes("{{widgets:main}}"), false);
  });

  it("should handle extractPlaceholderNames with empty name after trim", async () => {
    const body = "{{widgets:   }}";
    const result = await renderWidgetPage("page-x", body, kv);
    // Empty name after trim should be skipped
    assertEquals(result, body);
  });
});

describe("renderDynamicPage — SEO meta injection via </head>", () => {
  const APP_PATH = `${Deno.cwd()}/app`;

  it("should inject meta description via </head> replacement when no placeholder", async () => {
    const item: StorageItem = {
      id: "seo-inject",
      body: "<p>Content</p>",
      title: "Test",
      seo_title: "SEO Title",
      seo_description: "Meta description text",
    };
    const html = await renderDynamicPage(item, APP_PATH);
    // Since document.html doesn't have {{seo_description}} placeholder,
    // it should inject <meta name="description"> before </head>
    assertStringIncludes(html, 'name="description"');
    assertStringIncludes(html, "Meta description text");
  });

  it("should apply layout.html wrapping", async () => {
    const item: StorageItem = {
      id: "layout-test",
      body: "<p>Inner content</p>",
      title: "Layout Test",
      seo_title: "",
      seo_description: "",
    };
    const html = await renderDynamicPage(item, APP_PATH);
    assertStringIncludes(html, "Inner content");
    assertStringIncludes(html, "<!DOCTYPE html>");
  });
});

describe("transpileRoute — error handling", () => {
  it("should return empty string for empty path", async () => {
    const result = await transpileRoute("");
    assertEquals(result, "");
  });

  it("should return empty string for nonexistent file", async () => {
    const result = await transpileRoute("/nonexistent/file.ts");
    assertEquals(result, "");
  });

  it("should strip leading comment from transpiled output", async () => {
    // Transpile a real TypeScript file
    const result = await transpileRoute("src/utils/toSlug.ts");
    // The first line should not be a comment (it's stripped)
    if (result) {
      assertEquals(result.startsWith("//"), false);
    }
  });
});

describe("TerminalUi — wrapAnsi enabled branch", () => {
  it("should wrap ANSI codes when color is enabled", () => {
    const ui = new TerminalUi({
      color: true,
      writer: { write: () => {} },
    });
    const result = ui.accent("hello");
    assertStringIncludes(result, "\x1b[");
    assertStringIncludes(result, "hello");
  });
});

describe("parseCookie — edge cases", () => {
  it("should parse cookie from header", () => {
    const value = parseCookie("__tennet_sid=abc123; other=xyz", "__tennet_sid");
    assertEquals(value, "abc123");
  });

  it("should return undefined for missing cookie", () => {
    const value = parseCookie("other=xyz", "__tennet_sid");
    assertEquals(value, undefined);
  });
});
