import type { WidgetDefinition, WidgetInstance } from "../types.ts";

/**
 * Gallery widget — responsive image grid.
 */
export const galleryWidget: WidgetDefinition = {
  type: "gallery",
  label: "Galeria de Imagens",
  description: "Responsive image grid with optional lightbox support.",
  icon: "🖼️",
  fields: [
    {
      name: "images",
      label: "Images (JSON array of URLs)",
      type: "textarea",
      required: true,
      default: "",
    },
    {
      name: "columns",
      label: "Columns",
      type: "number",
      required: false,
      default: "3",
    },
    {
      name: "lightbox",
      label: "Lightbox",
      type: "select",
      required: false,
      options: ["no", "yes"],
      default: "no",
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
  render(instance: WidgetInstance): string {
    const imagesRaw = String(instance.data.images ?? "[]");
    const rawCols = Number(instance.data.columns ?? 3);
    const lightbox = String(instance.data.lightbox ?? "no");
    const gap = String(instance.data.gap ?? "md");

    const cols = Math.min(6, Math.max(1, isNaN(rawCols) ? 3 : rawCols));

    const gapClass = gap === "sm" ? "gap-2" : gap === "lg" ? "gap-6" : "gap-4";

    let urls: string[] = [];
    try {
      const parsed = JSON.parse(imagesRaw);
      if (Array.isArray(parsed)) {
        urls = parsed.filter((u) => typeof u === "string").map(String);
      }
    } catch {
      // Invalid JSON — render empty gallery
    }

    const items = urls.map((url) => {
      const safeUrl = sanitizeUrl(url);
      if (!safeUrl) return "";
      const imgTag = `<img src="${
        escapeAttr(safeUrl)
      }" loading="lazy" class="w-full h-full object-cover" alt="">`;
      if (lightbox === "yes") {
        return `<a href="${
          escapeAttr(safeUrl)
        }" target="_blank" rel="noopener noreferrer" class="block aspect-square overflow-hidden rounded">${imgTag}</a>`;
      }
      return `<div class="aspect-square overflow-hidden rounded">${imgTag}</div>`;
    }).filter(Boolean).join("\n  ");

    return `<div class="ten-widget-gallery grid grid-cols-${cols} ${
      escapeAttr(gapClass)
    }">
  ${items}
</div>`;
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
