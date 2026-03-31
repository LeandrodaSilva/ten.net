import type { WidgetDefinition, WidgetInstance } from "../types.ts";

/**
 * Spacer widget — empty vertical space between sections.
 */
export const spacerWidget: WidgetDefinition = {
  type: "spacer",
  label: "Spacer",
  description: "Empty vertical space for separating content sections.",
  icon: "↕️",
  fields: [
    {
      name: "height",
      label: "Height",
      type: "number",
      required: true,
      default: "40",
    },
    {
      name: "unit",
      label: "Unit",
      type: "select",
      required: false,
      options: ["px", "rem", "em"],
      default: "px",
    },
  ],
  defaultPlaceholder: "main",
  render(instance: WidgetInstance): string {
    const rawHeight = Number(instance.data.height ?? 40);
    const unit = String(instance.data.unit ?? "px");

    // Clamp height to 1-500
    const height = Math.min(
      500,
      Math.max(1, isNaN(rawHeight) ? 40 : rawHeight),
    );
    const validUnit = ["px", "rem", "em"].includes(unit) ? unit : "px";

    return `<div class="ten-widget-spacer" style="height:${height}${
      escapeAttr(validUnit)
    }" aria-hidden="true"></div>`;
  },
};

function escapeAttr(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
