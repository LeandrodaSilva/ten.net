import type {
  WidgetDefinition,
  WidgetInstance,
  WidgetRenderContext,
} from "../types.ts";
import { widgetRegistry } from "../widgetRegistry.ts";

/**
 * Columns widget — renders a CSS grid with N columns.
 * Each column maps to a virtual sub-placeholder: `columns:{instanceId}:col:{n}`.
 * Child widgets are loaded from context.subWidgets at those keys.
 */
export const columnsWidget: WidgetDefinition = {
  type: "columns",
  label: "Colunas",
  description:
    "Grid layout with 2, 3, or 4 columns. Each column accepts widgets.",
  icon: "▦",
  fields: [
    {
      name: "layout",
      label: "Number of Columns",
      type: "select",
      required: false,
      options: ["2", "3", "4"],
      default: "2",
    },
    {
      name: "gap",
      label: "Gap",
      type: "select",
      required: false,
      options: ["sm", "md", "lg"],
      default: "md",
    },
  ],
  defaultPlaceholder: "main",
  render(instance: WidgetInstance, context?: WidgetRenderContext): string {
    const numCols = parseLayout(String(instance.data.layout ?? "2"));
    const gap = String(instance.data.gap ?? "md");
    const gapClass = gap === "sm" ? "gap-2" : gap === "lg" ? "gap-8" : "gap-4";

    const cols: string[] = [];
    for (let i = 0; i < numCols; i++) {
      const slotKey = `columns:${instance.id}:col:${i}`;
      const colContent = renderSlot(slotKey, context);
      cols.push(`<div class="ten-widget-columns__col">${colContent}</div>`);
    }

    return `<div class="ten-widget-columns grid grid-cols-${numCols} ${gapClass}">\n${
      cols.join("\n")
    }\n</div>`;
  },
};

function parseLayout(value: string): number {
  const n = parseInt(value, 10);
  return [2, 3, 4].includes(n) ? n : 2;
}

function renderSlot(slotKey: string, context?: WidgetRenderContext): string {
  if (!context?.subWidgets?.[slotKey]) return "";
  const instances = context.subWidgets[slotKey];
  const parts: string[] = [];
  for (const sub of instances) {
    const def = widgetRegistry.get(sub.type);
    if (!def) continue;
    try {
      parts.push(def.render(sub, context));
    } catch {
      // Rendering errors must not break the layout
    }
  }
  return parts.join("\n");
}
