import { beforeEach, describe, it } from "@std/testing/bdd";
import { assertEquals } from "@std/assert";
import { widgetRegistry } from "../../packages/widgets/src/widgetRegistry.ts";
import type {
  WidgetDefinition,
  WidgetInstance,
  WidgetType,
} from "../../packages/widgets/src/types.ts";

/** Helper: create a minimal valid WidgetDefinition with overrides. */
function makeDef(overrides?: Partial<WidgetDefinition>): WidgetDefinition {
  return {
    type: "rich-text",
    label: "Rich Text",
    description: "A rich text block",
    fields: [{ name: "body", label: "Body", type: "rich-text" }],
    render: (_instance: WidgetInstance) => "<p>test</p>",
    ...overrides,
  };
}

describe("WidgetRegistry", () => {
  beforeEach(() => {
    // Clear registry before each test by re-registering nothing.
    // Since WidgetRegistry is a singleton with a private Map, we reset
    // by accessing all() and ensuring a clean slate via overwrite strategy.
    // We register a temp key then rely on tests to set their own state.
    // Actually, the simplest approach: the singleton keeps state between tests,
    // so we need to be careful. We'll work around by using unique types per test
    // or accepting the singleton nature.
  });

  describe("register()", () => {
    it("should register a widget definition", () => {
      const def = makeDef({ type: "hero", label: "Hero" });
      widgetRegistry.register(def);
      const result = widgetRegistry.get("hero");
      assertEquals(result !== null, true);
      assertEquals(result!.type, "hero");
      assertEquals(result!.label, "Hero");
    });

    it("should overwrite an existing definition with the same type", () => {
      const original = makeDef({ type: "image", label: "Image V1" });
      widgetRegistry.register(original);

      const updated = makeDef({ type: "image", label: "Image V2" });
      widgetRegistry.register(updated);

      const result = widgetRegistry.get("image");
      assertEquals(result!.label, "Image V2");
    });
  });

  describe("get()", () => {
    it("should return a registered widget definition", () => {
      const def = makeDef({ type: "gallery", label: "Gallery" });
      widgetRegistry.register(def);
      const result = widgetRegistry.get("gallery");
      assertEquals(result !== null, true);
      assertEquals(result!.type, "gallery");
    });

    it("should return null for an unknown type", () => {
      // Use a definitely-unregistered custom type
      const result = widgetRegistry.get(
        "custom:nonexistent-widget-xyz" as WidgetType,
      );
      assertEquals(result, null);
    });
  });

  describe("all()", () => {
    it("should return all registered definitions", () => {
      // Register a few unique types to verify
      widgetRegistry.register(
        makeDef({ type: "html", label: "HTML Block" }),
      );
      widgetRegistry.register(
        makeDef({ type: "embed", label: "Embed" }),
      );

      const all = widgetRegistry.all();
      assertEquals(Array.isArray(all), true);
      // Should contain at least the ones we registered
      const types = all.map((d) => d.type);
      assertEquals(types.includes("html"), true);
      assertEquals(types.includes("embed"), true);
    });
  });

  describe("custom widget type", () => {
    it("should register and retrieve a custom:my-widget type", () => {
      const customDef = makeDef({
        type: "custom:my-widget",
        label: "My Custom Widget",
        description: "A user-defined custom widget",
        fields: [
          { name: "title", label: "Title", type: "text", required: true },
          { name: "content", label: "Content", type: "textarea" },
        ],
      });

      widgetRegistry.register(customDef);

      const result = widgetRegistry.get("custom:my-widget");
      assertEquals(result !== null, true);
      assertEquals(result!.type, "custom:my-widget");
      assertEquals(result!.label, "My Custom Widget");
      assertEquals(result!.fields.length, 2);
    });
  });

  describe("render()", () => {
    it("should call the render function of a registered widget", () => {
      const def = makeDef({
        type: "rich-text",
        render: (instance: WidgetInstance) =>
          `<div>${String(instance.data.body ?? "")}</div>`,
      });
      widgetRegistry.register(def);

      const widget = widgetRegistry.get("rich-text")!;
      const html = widget.render({
        id: "w1",
        type: "rich-text",
        placeholder: "main",
        order: 0,
        data: { body: "Hello World" },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      assertEquals(html, "<div>Hello World</div>");
    });
  });
});
