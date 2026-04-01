import { afterEach, beforeEach, describe, it } from "@std/testing/bdd";
import { assertEquals, assertStringIncludes } from "@std/assert";
import { renderWidgetPage } from "../../packages/core/src/routing/widgetPageHandler.ts";
import { WidgetStore } from "../../packages/widgets/src/widgetStore.ts";
import { widgetRegistry } from "../../packages/widgets/src/widgetRegistry.ts";
import { registerBuiltinWidgets } from "../../packages/widgets/src/builtins/index.ts";
import { heroWidget } from "../../packages/widgets/src/builtins/hero.ts";
import { richTextWidget } from "../../packages/widgets/src/builtins/richText.ts";
import { imageWidget } from "../../packages/widgets/src/builtins/image.ts";
import type { WidgetInstance } from "../../packages/widgets/src/types.ts";

describe("renderWidgetPage", () => {
  let kv: Deno.Kv;
  let store: WidgetStore;

  beforeEach(async () => {
    kv = await Deno.openKv(":memory:");
    store = new WidgetStore(kv);
    registerBuiltinWidgets();
  });

  afterEach(() => {
    kv.close();
  });

  it("should return body unchanged when no widget placeholders exist", async () => {
    const body = "<p>Hello World</p>";
    const result = await renderWidgetPage("page-1", body, kv);
    assertEquals(result, body);
  });

  it("should replace {{widgets:main}} with rendered widget HTML", async () => {
    await store.create("page-1", {
      type: "hero",
      placeholder: "main",
      order: 0,
      data: {
        heading: "Welcome",
        subtitle: "",
        cta_text: "",
        cta_url: "",
        background_color: "indigo",
      },
    });

    const body = "<div>{{widgets:main}}</div>";
    const result = await renderWidgetPage("page-1", body, kv);
    assertStringIncludes(result, "ten-widget-hero");
    assertStringIncludes(result, "Welcome");
    assertEquals(result.includes("{{widgets:main}}"), false);
  });

  it("should handle multiple placeholders", async () => {
    await store.create("page-2", {
      type: "hero",
      placeholder: "header",
      order: 0,
      data: { heading: "Header Hero" },
    });
    await store.create("page-2", {
      type: "rich-text",
      placeholder: "sidebar",
      order: 0,
      data: { content: "<p>Sidebar content</p>" },
    });

    const body =
      "<header>{{widgets:header}}</header><aside>{{widgets:sidebar}}</aside>";
    const result = await renderWidgetPage("page-2", body, kv);
    assertStringIncludes(result, "Header Hero");
    assertStringIncludes(result, "Sidebar content");
    assertEquals(result.includes("{{widgets:header}}"), false);
    assertEquals(result.includes("{{widgets:sidebar}}"), false);
  });

  it("should replace placeholder with empty string when no widgets exist for it", async () => {
    const body = "<div>{{widgets:empty}}</div>";
    const result = await renderWidgetPage("page-3", body, kv);
    assertEquals(result, "<div></div>");
  });

  it("should silently skip widgets with unregistered types", async () => {
    // Insert a widget with a type that is NOT registered
    const now = new Date().toISOString();
    const fakeInstance: WidgetInstance = {
      id: "fake-1",
      type: "custom:nonexistent-xyz",
      placeholder: "main",
      order: 0,
      data: {},
      created_at: now,
      updated_at: now,
    };
    await kv.set(["widgets", "page-4", "instance", "fake-1"], fakeInstance);

    const body = "<div>{{widgets:main}}</div>";
    const result = await renderWidgetPage("page-4", body, kv);
    // Unregistered widget is skipped, placeholder replaced with empty
    assertEquals(result, "<div></div>");
  });

  it("should render widgets in correct order within a placeholder", async () => {
    await store.create("page-5", {
      type: "rich-text",
      placeholder: "main",
      order: 2,
      data: { content: "<p>Second</p>" },
    });
    await store.create("page-5", {
      type: "rich-text",
      placeholder: "main",
      order: 0,
      data: { content: "<p>First</p>" },
    });

    const body = "{{widgets:main}}";
    const result = await renderWidgetPage("page-5", body, kv);
    const firstIdx = result.indexOf("First");
    const secondIdx = result.indexOf("Second");
    assertEquals(
      firstIdx < secondIdx,
      true,
      "First widget should appear before Second widget",
    );
  });
});

describe("Built-in widgets", () => {
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

  describe("heroWidget", () => {
    it("should render a section with heading", () => {
      const html = heroWidget.render(
        makeInstance("hero", { heading: "Hello World" }),
      );
      assertStringIncludes(html, "<section");
      assertStringIncludes(html, "ten-widget-hero");
      assertStringIncludes(html, "Hello World");
    });

    it("should render subtitle when provided", () => {
      const html = heroWidget.render(
        makeInstance("hero", { heading: "Title", subtitle: "A subtitle" }),
      );
      assertStringIncludes(html, "A subtitle");
      assertStringIncludes(html, "<p");
    });

    it("should render CTA link when both text and url are provided", () => {
      const html = heroWidget.render(
        makeInstance("hero", {
          heading: "Title",
          cta_text: "Click me",
          cta_url: "/action",
        }),
      );
      assertStringIncludes(html, "<a");
      assertStringIncludes(html, "Click me");
      assertStringIncludes(html, "/action");
    });

    it("should not render CTA when text is missing", () => {
      const html = heroWidget.render(
        makeInstance("hero", { heading: "Title", cta_url: "/action" }),
      );
      assertEquals(html.includes("<a"), false);
    });
  });

  describe("richTextWidget", () => {
    it("should render content in a prose div", () => {
      const html = richTextWidget.render(
        makeInstance("rich-text", { content: "<p>Hello</p>" }),
      );
      assertStringIncludes(html, "ten-widget-rich-text");
      assertStringIncludes(html, "prose");
      assertStringIncludes(html, "<p>Hello</p>");
    });

    it("should handle empty content", () => {
      const html = richTextWidget.render(
        makeInstance("rich-text", { content: "" }),
      );
      assertStringIncludes(html, "ten-widget-rich-text");
    });
  });

  describe("imageWidget", () => {
    it("should render figure with img and figcaption", () => {
      const html = imageWidget.render(
        makeInstance("image", {
          src: "/photo.jpg",
          alt: "A photo",
          caption: "My photo",
        }),
      );
      assertStringIncludes(html, "<figure");
      assertStringIncludes(html, "ten-widget-image");
      assertStringIncludes(html, "<img");
      assertStringIncludes(html, "/photo.jpg");
      assertStringIncludes(html, "A photo");
      assertStringIncludes(html, "<figcaption");
      assertStringIncludes(html, "My photo");
    });

    it("should not render figcaption when caption is empty", () => {
      const html = imageWidget.render(
        makeInstance("image", { src: "/photo.jpg", alt: "Alt", caption: "" }),
      );
      assertEquals(html.includes("<figcaption"), false);
    });

    it("should return empty string when src is empty", () => {
      const html = imageWidget.render(
        makeInstance("image", { src: "" }),
      );
      assertEquals(html, "");
    });

    it("should wrap img in link when link_url is provided", () => {
      const html = imageWidget.render(
        makeInstance("image", { src: "/photo.jpg", link_url: "/gallery" }),
      );
      assertStringIncludes(html, "<a");
      assertStringIncludes(html, "/gallery");
    });
  });

  describe("registerBuiltinWidgets", () => {
    it("should register hero, rich-text, and image in the registry", () => {
      registerBuiltinWidgets();
      assertEquals(widgetRegistry.get("hero") !== null, true);
      assertEquals(widgetRegistry.get("rich-text") !== null, true);
      assertEquals(widgetRegistry.get("image") !== null, true);
    });
  });
});
