import { describe, it } from "@std/testing/bdd";
import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { columnsWidget } from "../widgets/builtins/columns.ts";
import { registerBuiltinWidgets } from "../widgets/builtins/index.ts";
import type { WidgetInstance, WidgetRenderContext } from "../widgets/types.ts";

// Ensure hero/rich-text etc. are registered so sub-widget rendering works
registerBuiltinWidgets();

function makeInstance(
  type: string,
  data: Record<string, unknown>,
  id = "col-test-id",
): WidgetInstance {
  return {
    id,
    type: type as WidgetInstance["type"],
    placeholder: "main",
    order: 0,
    data,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  };
}

describe("columnsWidget", () => {
  it("should render 2 columns by default", () => {
    const html = columnsWidget.render(makeInstance("columns", {}));
    assertStringIncludes(html, "grid-cols-2");
    assertStringIncludes(html, "ten-widget-columns");
    // Should have 2 column divs
    const colCount = (html.match(/ten-widget-columns__col/g) ?? []).length;
    assertEquals(colCount, 2);
  });

  it("should render 3 columns", () => {
    const html = columnsWidget.render(
      makeInstance("columns", { layout: "3" }),
    );
    assertStringIncludes(html, "grid-cols-3");
    const colCount = (html.match(/ten-widget-columns__col/g) ?? []).length;
    assertEquals(colCount, 3);
  });

  it("should render 4 columns", () => {
    const html = columnsWidget.render(
      makeInstance("columns", { layout: "4" }),
    );
    assertStringIncludes(html, "grid-cols-4");
    const colCount = (html.match(/ten-widget-columns__col/g) ?? []).length;
    assertEquals(colCount, 4);
  });

  it("should default to 2 columns for invalid layout", () => {
    const html = columnsWidget.render(
      makeInstance("columns", { layout: "7" }),
    );
    assertStringIncludes(html, "grid-cols-2");
  });

  it("should default to 2 columns for NaN layout", () => {
    const html = columnsWidget.render(
      makeInstance("columns", { layout: "abc" }),
    );
    assertStringIncludes(html, "grid-cols-2");
  });

  it("should apply gap-2 for sm gap", () => {
    const html = columnsWidget.render(
      makeInstance("columns", { gap: "sm" }),
    );
    assertStringIncludes(html, "gap-2");
  });

  it("should apply gap-4 for md gap (default)", () => {
    const html = columnsWidget.render(makeInstance("columns", {}));
    assertStringIncludes(html, "gap-4");
  });

  it("should apply gap-8 for lg gap", () => {
    const html = columnsWidget.render(
      makeInstance("columns", { gap: "lg" }),
    );
    assertStringIncludes(html, "gap-8");
  });

  it("should apply gap-4 for unknown gap value", () => {
    const html = columnsWidget.render(
      makeInstance("columns", { gap: "xl" }),
    );
    assertStringIncludes(html, "gap-4");
  });

  it("should render sub-widgets via context.subWidgets", () => {
    const instanceId = "col-123";
    const subWidget = makeInstance("hero", { heading: "Sub Hero" }, "sub-1");

    const context: WidgetRenderContext = {
      subWidgets: {
        [`columns:${instanceId}:col:0`]: [subWidget],
      },
    };

    const html = columnsWidget.render(
      makeInstance("columns", { layout: "2" }, instanceId),
      context,
    );
    assertStringIncludes(html, "Sub Hero");
  });

  it("should render empty columns when no sub-widgets provided", () => {
    const html = columnsWidget.render(makeInstance("columns", { layout: "2" }));
    // Columns should exist but be empty
    const colCount = (html.match(/ten-widget-columns__col/g) ?? []).length;
    assertEquals(colCount, 2);
    // No sub-widget content
    assert(!html.includes("ten-widget-hero"));
  });

  it("should render empty columns when context has no matching keys", () => {
    const context: WidgetRenderContext = {
      subWidgets: {
        "other-key": [makeInstance("hero", { heading: "X" }, "x-1")],
      },
    };

    const html = columnsWidget.render(
      makeInstance("columns", { layout: "2" }, "col-no-match"),
      context,
    );
    assert(!html.includes("ten-widget-hero"));
  });

  it("should have type columns", () => {
    assertEquals(columnsWidget.type, "columns");
  });

  it("should NOT be restricted", () => {
    assert(!columnsWidget.restricted);
  });
});
