import type { WidgetDefinition, WidgetInstance } from "../types.ts";

/**
 * CTA Button widget — call-to-action link button.
 */
export const ctaButtonWidget: WidgetDefinition = {
  type: "cta-button",
  label: "CTA Button",
  description: "Call-to-action link button with configurable style and size.",
  icon: "🔘",
  fields: [
    {
      name: "text",
      label: "Button Text",
      type: "text",
      required: true,
      default: "",
    },
    {
      name: "url",
      label: "URL",
      type: "url",
      required: true,
      default: "",
    },
    {
      name: "style",
      label: "Style",
      type: "select",
      required: false,
      options: ["primary", "secondary", "outline", "ghost"],
      default: "primary",
    },
    {
      name: "size",
      label: "Size",
      type: "select",
      required: false,
      options: ["sm", "md", "lg"],
      default: "md",
    },
    {
      name: "new_tab",
      label: "Open in New Tab",
      type: "select",
      required: false,
      options: ["no", "yes"],
      default: "no",
    },
    {
      name: "alignment",
      label: "Alignment",
      type: "select",
      required: false,
      options: ["left", "center", "right"],
      default: "center",
    },
  ],
  defaultPlaceholder: "main",
  render(instance: WidgetInstance): string {
    const text = String(instance.data.text ?? "");
    const url = String(instance.data.url ?? "");
    const style = String(instance.data.style ?? "primary");
    const size = String(instance.data.size ?? "md");
    const newTab = String(instance.data.new_tab ?? "no");
    const alignment = String(instance.data.alignment ?? "center");

    const safeUrl = sanitizeUrl(url);

    const alignClass = alignment === "left"
      ? "text-left"
      : alignment === "right"
      ? "text-right"
      : "text-center";

    const sizeClass = size === "sm"
      ? "px-4 py-2 text-sm"
      : size === "lg"
      ? "px-8 py-4 text-lg"
      : "px-6 py-3 text-base";

    const styleClass = style === "secondary"
      ? "bg-gray-100 text-gray-800 hover:bg-gray-200"
      : style === "outline"
      ? "border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-50 bg-transparent"
      : style === "ghost"
      ? "text-indigo-600 hover:bg-indigo-50 bg-transparent"
      : "bg-indigo-600 text-white hover:bg-indigo-700";

    const targetAttr = newTab === "yes"
      ? ' target="_blank" rel="noopener noreferrer"'
      : "";

    return `<div class="ten-widget-cta-button ${escapeAttr(alignClass)}">
  <a href="${
      escapeAttr(safeUrl)
    }" class="inline-block font-semibold rounded-lg transition-colors ${
      escapeAttr(sizeClass)
    } ${escapeAttr(styleClass)}"${targetAttr}>${escapeHtml(text)}</a>
</div>`;
  },
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttr(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Sanitize a URL to prevent javascript: and data: protocol XSS. */
function sanitizeUrl(url: string): string {
  const trimmed = url.trim().toLowerCase();
  if (
    trimmed.startsWith("javascript:") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("vbscript:")
  ) {
    return "";
  }
  return url;
}
