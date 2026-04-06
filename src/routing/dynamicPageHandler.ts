import { findDocumentLayoutRoot } from "../utils/findDocumentLayoutRoot.ts";
import { findOrderedLayouts } from "../utils/findOrderedLayouts.ts";
import type { StorageItem } from "../models/Storage.ts";
import type { WidgetPageRenderer } from "../models/WidgetResolver.ts";

/** Open Graph / Twitter Card options for a dynamic page. */
export interface SeoOptions {
  /** Canonical URL → og:url */
  url?: string;
  /** "website" | "article" → og:type (defaults to "website") */
  type?: string;
  /** Image URL → og:image + twitter:image */
  ogImage?: string;
}

/**
 * Render a dynamic page (from PagePlugin storage) into a full HTML document.
 *
 * Pipeline:
 * 1. Start with the item's `body` HTML (unescaped).
 * 2. If widgets_enabled === "true" and kv is provided, resolve {{widgets:name}} placeholders.
 * 3. Apply root layout.html (from app/) if it exists, wrapping the body.
 * 4. Apply document.html, injecting SEO meta tags.
 * 5. Fallback: if document.html doesn't exist, use a minimal wrapper.
 *
 * @param item - The StorageItem representing a page (must have body, title, seo_title, seo_description, template).
 * @param appPath - Path to the app/ directory (for loading layouts and document.html).
 * @param kv - Optional Deno KV instance. Required when widgets_enabled === "true".
 * @param seoOptions - Optional Open Graph / Twitter Card metadata.
 * @param widgetRenderer - Optional function to resolve {{widgets:name}} placeholders. Provided by the CMS plugin.
 * @returns The fully rendered HTML string.
 */
export async function renderDynamicPage(
  item: StorageItem,
  appPath: string,
  kv?: Deno.Kv,
  seoOptions?: SeoOptions,
  widgetRenderer?: WidgetPageRenderer,
  tailwindCss?: string,
): Promise<string> {
  let body = String(item.body ?? "");
  const seoTitle = String(item.seo_title ?? item.title ?? "");
  const seoDescription = String(item.seo_description ?? "");

  // Widget pipeline: resolve {{widgets:name}} placeholders when enabled
  if (
    String(item.widgets_enabled) === "true" && kv && item.id && widgetRenderer
  ) {
    body = await widgetRenderer(String(item.id), body, kv);
  }

  // Start with the resolved body HTML (unescaped — this is intentional for rich content)
  let html = body;

  // Apply layout.html files from the root (same as file-based routing for "/")
  const layouts = await findOrderedLayouts(appPath, "/");
  for (let i = layouts.length - 1; i >= 0; i--) {
    const layoutContent = await Deno.readTextFile(layouts[i]);
    html = layoutContent.replace("{{content}}", html);
  }

  // Apply document.html wrapper
  let document = await findDocumentLayoutRoot(appPath);

  // Inject SEO tags into the document <head>
  if (seoTitle) {
    // Replace {{seo_title}} placeholder with escaped content
    document = document.replace("{{seo_title}}", escapeHtmlContent(seoTitle));
  }

  if (seoDescription) {
    // Insert meta description before </head> if not already present
    if (document.includes("{{seo_description}}")) {
      document = document.replace(
        "{{seo_description}}",
        escapeAttr(seoDescription),
      );
    } else if (!document.includes('name="description"')) {
      document = document.replace(
        "</head>",
        `  <meta name="description" content="${
          escapeAttr(seoDescription)
        }">\n  </head>`,
      );
    }
  }

  // Replace <title> tag with SEO title (escaped)
  if (seoTitle) {
    document = document.replace(
      /<title>[^<]*<\/title>/i,
      `<title>${escapeHtmlContent(seoTitle)}</title>`,
    );
  }

  // Build Open Graph / Twitter Card meta tags
  const ogTags: string[] = [];
  if (seoTitle) {
    ogTags.push(`<meta property="og:title" content="${escapeAttr(seoTitle)}">`);
    ogTags.push(
      `<meta name="twitter:title" content="${escapeAttr(seoTitle)}">`,
    );
  }
  if (seoDescription) {
    ogTags.push(
      `<meta property="og:description" content="${
        escapeAttr(seoDescription)
      }">`,
    );
    ogTags.push(
      `<meta name="twitter:description" content="${
        escapeAttr(seoDescription)
      }">`,
    );
  }
  if (seoOptions?.url) {
    ogTags.push(
      `<meta property="og:url" content="${escapeAttr(seoOptions.url)}">`,
    );
  }
  ogTags.push(
    `<meta property="og:type" content="${
      escapeAttr(seoOptions?.type ?? "website")
    }">`,
  );
  ogTags.push(`<meta name="twitter:card" content="summary">`);
  if (seoOptions?.ogImage) {
    ogTags.push(
      `<meta property="og:image" content="${escapeAttr(seoOptions.ogImage)}">`,
    );
    ogTags.push(
      `<meta name="twitter:image" content="${escapeAttr(seoOptions.ogImage)}">`,
    );
    ogTags.push(`<meta name="twitter:card" content="summary_large_image">`);
  }
  if (ogTags.length > 0) {
    document = document.replace(
      "</head>",
      `  ${ogTags.join("\n  ")}\n  </head>`,
    );
  }

  // Inject Tailwind CSS inline if available
  if (tailwindCss) {
    const { injectTailwindCss } = await import("../tailwind/inject.ts");
    document = injectTailwindCss(document, tailwindCss);
  }

  html = document.replace("{{content}}", html);

  return html;
}

/** Escape a string for use in an HTML attribute value. */
function escapeAttr(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Escape a string for use in HTML text content (not attributes). */
function escapeHtmlContent(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
