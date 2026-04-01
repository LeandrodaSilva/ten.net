/** RSS auto-discovery link tag for blog pages. */
export const RSS_DISCOVERY_TAG =
  `<link rel="alternate" type="application/rss+xml" title="Blog" href="/blog/rss.xml">`;

/** Inject extra tags into the <head> of an HTML string (before </head>). */
export function injectHeadTags(html: string, tags: string): string {
  return html.replace("</head>", `${tags}\n</head>`);
}

/** Escape a string for safe HTML text content. */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Escape a string for use in an HTML attribute value. */
export function escapeAttrValue(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Sanitize rich HTML content by stripping dangerous elements.
 * Removes <script>, <iframe>, <object>, <embed>, <form>, <base>, <link>, <style>,
 * <meta>, <svg> (can contain scripts), <math> tags, on* event handler attributes,
 * and javascript:/data:/vbscript: URLs in href/src/action attributes.
 *
 * NOTE: Regex-based sanitization is inherently imperfect. For untrusted user input,
 * a DOM-based sanitizer (e.g. DOMPurify) should be used instead. This function
 * is a defense-in-depth layer for admin-authored content.
 */
export function sanitizeHtml(s: string): string {
  return s
    // Remove matched open+close tag pairs for dangerous elements
    .replace(
      /<\s*(script|iframe|object|embed|form|base|link|style|meta|svg|math)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi,
      "",
    )
    // Remove self-closing or unclosed dangerous tags
    .replace(
      /<\s*(script|iframe|object|embed|form|base|link|style|meta|svg|math)\b[^>]*\/?>/gi,
      "",
    )
    // Remove on* event handlers (onclick, onerror, onload, etc.)
    .replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    // Remove javascript:/vbscript:/data: in href, src, action attributes
    .replace(
      /(href|src|action)\s*=\s*(?:"[^"]*(?:javascript|vbscript|data)\s*:[^"]*"|'[^']*(?:javascript|vbscript|data)\s*:[^']*')/gi,
      "",
    );
}
