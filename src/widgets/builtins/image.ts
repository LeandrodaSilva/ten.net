import type { WidgetDefinition, WidgetInstance } from "../types.ts";

/**
 * Image widget — displays a single image with optional caption and link.
 */
export const imageWidget: WidgetDefinition = {
  type: "image",
  label: "Image",
  description: "Single image with optional caption and link.",
  icon: "🖼️",
  fields: [
    {
      name: "src",
      label: "Image URL",
      type: "image",
      required: true,
      default: "",
    },
    {
      name: "alt",
      label: "Alt Text",
      type: "text",
      required: false,
      default: "",
    },
    {
      name: "caption",
      label: "Caption",
      type: "text",
      required: false,
      default: "",
    },
    {
      name: "link_url",
      label: "Link URL",
      type: "url",
      required: false,
      default: "",
    },
    {
      name: "alignment",
      label: "Alignment",
      type: "select",
      required: false,
      options: ["left", "center", "right", "full"],
      default: "center",
    },
  ],
  defaultPlaceholder: "main",
  render(instance: WidgetInstance): string {
    const rawSrc = String(instance.data.src ?? "");
    const alt = String(instance.data.alt ?? "");
    const caption = String(instance.data.caption ?? "");
    const rawLinkUrl = String(instance.data.link_url ?? "");
    const alignment = String(instance.data.alignment ?? "center");

    const src = sanitizeUrl(rawSrc);
    const linkUrl = sanitizeUrl(rawLinkUrl);

    if (!src) return "";

    const alignClass = alignment === "left"
      ? "mr-auto"
      : alignment === "right"
      ? "ml-auto"
      : alignment === "full"
      ? "w-full"
      : "mx-auto";

    const imgTag = `<img src="${escapeAttr(src)}" alt="${
      escapeAttr(alt)
    }" class="block ${alignClass} max-w-full h-auto rounded" />`;

    const inner = linkUrl
      ? `<a href="${escapeAttr(linkUrl)}">${imgTag}</a>`
      : imgTag;

    const captionHtml = caption
      ? `<figcaption class="text-center text-sm text-gray-500 mt-2">${
        escapeHtml(caption)
      }</figcaption>`
      : "";

    return `<figure class="ten-widget-image px-6 py-4">
  ${inner}
  ${captionHtml}
</figure>`;
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
