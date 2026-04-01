import type { WidgetDefinition, WidgetInstance } from "../types.ts";

/**
 * Rich Text widget — renders arbitrary HTML content from a rich-text field.
 *
 * SECURITY NOTE: The `content` field is rendered as raw, unescaped HTML.
 * This is intentional — rich-text editors produce HTML that must be preserved.
 * Content is authored via the authenticated admin panel, NOT submitted by
 * end-users. If this widget is ever exposed to untrusted input, the content
 * MUST be sanitized with a proper HTML sanitizer (e.g. DOMPurify) before
 * storing it.
 */
export const richTextWidget: WidgetDefinition = {
  type: "rich-text",
  label: "Rich Text",
  description: "Free-form HTML content block for paragraphs, lists, and more.",
  icon: "📝",
  fields: [
    {
      name: "content",
      label: "Content",
      type: "rich-text",
      required: true,
      default: "",
    },
  ],
  defaultPlaceholder: "main",
  render(instance: WidgetInstance): string {
    // Content is trusted HTML (authored via admin editor — not user-submitted)
    const content = String(instance.data.content ?? "");

    return `<div class="ten-widget-rich-text prose max-w-none px-6 py-4">${content}</div>`;
  },
};
