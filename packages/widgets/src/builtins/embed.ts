import type {
  WidgetDefinition,
  WidgetInstance,
  WidgetRenderContext,
} from "../types.ts";

/**
 * Embed widget — renders a sandboxed iframe for third-party content.
 * Restricted: only admin roles may embed arbitrary URLs.
 */
export const embedWidget: WidgetDefinition = {
  type: "embed",
  label: "Embed",
  description:
    "Embed external content in a sandboxed iframe. Restricted to admin.",
  icon: "🔗",
  restricted: true,
  fields: [
    {
      name: "url",
      label: "URL",
      type: "url",
      required: true,
      default: "",
    },
    {
      name: "title",
      label: "Title",
      type: "text",
      required: false,
      default: "",
    },
    {
      name: "width",
      label: "Width",
      type: "text",
      required: false,
      default: "100%",
    },
    {
      name: "height",
      label: "Height",
      type: "number",
      required: false,
      default: 400,
    },
  ],
  defaultPlaceholder: "main",
  render(instance: WidgetInstance, _context?: WidgetRenderContext): string {
    const url = sanitizeUrl(String(instance.data.url ?? ""));
    if (!url) return "";

    const title = escapeAttr(String(instance.data.title ?? ""));
    const width = escapeAttr(String(instance.data.width ?? "100%"));
    const height = escapeAttr(String(instance.data.height ?? "400"));

    return `<div class="ten-widget-embed"><iframe src="${
      escapeAttr(url)
    }" title="${title}" width="${width}" height="${height}" frameborder="0" sandbox="allow-scripts allow-forms" loading="lazy"></iframe></div>`;
  },
};

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
