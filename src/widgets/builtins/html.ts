import type {
  WidgetDefinition,
  WidgetInstance,
  WidgetRenderContext,
} from "../types.ts";

/**
 * HTML widget — renders raw HTML content without escaping.
 * Restricted: only admin roles may use this widget to prevent XSS injection
 * by unprivileged users.
 */
export const htmlWidget: WidgetDefinition = {
  type: "html",
  label: "HTML",
  description: "Raw HTML block. Restricted to admin — output is not escaped.",
  icon: "🧩",
  restricted: true,
  fields: [
    {
      name: "content",
      label: "HTML Content",
      type: "textarea",
      required: true,
      default: "",
    },
  ],
  defaultPlaceholder: "main",
  render(instance: WidgetInstance, _context?: WidgetRenderContext): string {
    const content = String(instance.data.content ?? "");
    return `<div class="ten-widget-html">${content}</div>`;
  },
};
