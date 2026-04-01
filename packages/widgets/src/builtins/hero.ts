import type { WidgetDefinition, WidgetInstance } from "../types.ts";

/**
 * Hero widget — full-width banner with heading, subtitle, and optional CTA.
 */
export const heroWidget: WidgetDefinition = {
  type: "hero",
  label: "Hero Banner",
  description: "Full-width banner with heading, subtitle, and call-to-action.",
  icon: "🦸",
  fields: [
    {
      name: "heading",
      label: "Heading",
      type: "text",
      required: true,
      default: "Welcome to our site",
    },
    {
      name: "subtitle",
      label: "Subtitle",
      type: "textarea",
      required: false,
      default: "",
    },
    {
      name: "cta_text",
      label: "Button Text",
      type: "text",
      required: false,
      default: "",
    },
    {
      name: "cta_url",
      label: "Button URL",
      type: "url",
      required: false,
      default: "",
    },
    {
      name: "background_color",
      label: "Background Color",
      type: "select",
      required: false,
      options: ["indigo", "gray", "white", "dark"],
      default: "indigo",
    },
  ],
  defaultPlaceholder: "main",
  render(instance: WidgetInstance): string {
    const heading = String(instance.data.heading ?? "");
    const subtitle = String(instance.data.subtitle ?? "");
    const ctaText = String(instance.data.cta_text ?? "");
    const ctaUrl = String(instance.data.cta_url ?? "");
    const bg = String(instance.data.background_color ?? "indigo");

    const bgClass = bg === "dark"
      ? "bg-gray-900 text-white"
      : bg === "gray"
      ? "bg-gray-100 text-gray-900"
      : bg === "white"
      ? "bg-white text-gray-900"
      : "bg-indigo-600 text-white";

    const safeCtaUrl = sanitizeUrl(ctaUrl);
    const ctaHtml = ctaText && safeCtaUrl
      ? `<a href="${
        escapeAttr(safeCtaUrl)
      }" class="inline-block mt-6 px-8 py-3 bg-white text-indigo-600 font-semibold rounded-lg hover:bg-indigo-50 transition-colors">${
        escapeHtml(ctaText)
      }</a>`
      : "";

    const subtitleHtml = subtitle
      ? `<p class="mt-4 text-lg opacity-90 max-w-2xl mx-auto">${
        escapeHtml(subtitle)
      }</p>`
      : "";

    return `<section class="ten-widget-hero ${bgClass} py-20 px-6 text-center">
  <h1 class="text-4xl font-bold tracking-tight">${escapeHtml(heading)}</h1>
  ${subtitleHtml}
  ${ctaHtml}
</section>`;
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
