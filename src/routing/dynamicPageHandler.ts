import { findDocumentLayoutRoot } from "../utils/findDocumentLayoutRoot.ts";
import { findOrderedLayouts } from "../utils/findOrderedLayouts.ts";
import type { StorageItem } from "../models/Storage.ts";

/**
 * Render a dynamic page (from PagePlugin storage) into a full HTML document.
 *
 * Pipeline:
 * 1. Start with the item's `body` HTML (unescaped).
 * 2. Apply root layout.html (from app/) if it exists, wrapping the body.
 * 3. Apply document.html, injecting SEO meta tags.
 * 4. Fallback: if document.html doesn't exist, use a minimal wrapper.
 *
 * @param item - The StorageItem representing a page (must have body, title, seo_title, seo_description, template).
 * @param appPath - Path to the app/ directory (for loading layouts and document.html).
 * @returns The fully rendered HTML string.
 */
export function renderDynamicPage(
  item: StorageItem,
  appPath: string,
): string {
  const body = String(item.body ?? "");
  const seoTitle = String(item.seo_title ?? item.title ?? "");
  const seoDescription = String(item.seo_description ?? "");

  // Start with the raw body HTML (unescaped — this is intentional for rich content)
  let html = body;

  // Apply layout.html files from the root (same as file-based routing for "/")
  const layouts = findOrderedLayouts(appPath, "/");
  for (let i = layouts.length - 1; i >= 0; i--) {
    const layoutContent = Deno.readTextFileSync(layouts[i]);
    html = layoutContent.replace("{{content}}", html);
  }

  // Apply document.html wrapper
  let document = findDocumentLayoutRoot(appPath);

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
