/** CDN script pattern to detect and remove */
const TAILWIND_CDN_RE = /<script[^>]*@tailwindcss\/browser[^>]*>\s*<\/script>/i;

/** Returns true if the document uses the Tailwind CDN */
export function hasTailwindCdn(documentHtml: string): boolean {
  return TAILWIND_CDN_RE.test(documentHtml);
}

/**
 * Replaces the Tailwind CDN script with an inline style tag.
 * Keeps Tailwind Plus Elements CDN script untouched.
 */
export function injectTailwindCss(
  documentHtml: string,
  css: string,
): string {
  let result = documentHtml.replace(TAILWIND_CDN_RE, "");
  result = result.replace("</head>", `<style id="tw">${css}</style>\n</head>`);
  return result;
}
