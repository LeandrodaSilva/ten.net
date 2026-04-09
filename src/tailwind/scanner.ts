/**
 * Extracts Tailwind CSS class candidates from HTML strings.
 * Scans class="..." and class='...' attributes, splits by whitespace,
 * and deduplicates. Ignores {{placeholder}} tokens.
 */
export function extractCandidates(htmlStrings: string[]): string[] {
  const classAttrRe = /class=["']([^"']*?)["']/gi;
  const seen = new Set<string>();

  for (const html of htmlStrings) {
    let match: RegExpExecArray | null;
    while ((match = classAttrRe.exec(html)) !== null) {
      for (const token of match[1].split(/\s+/)) {
        if (
          token &&
          !token.startsWith("{{") &&
          !token.endsWith("}}") &&
          !token.includes("${")
        ) {
          seen.add(token);
        }
      }
    }
  }

  return [...seen];
}

/**
 * Extracts Tailwind class candidates from TypeScript/JavaScript source.
 * Matches all simple single-line string literals (backtick, double, single
 * quoted) and extracts whitespace-separated tokens. Intended to capture
 * classes defined in variables or helper functions outside HTML attributes,
 * e.g. `const cls = "block rounded-xl px-3";`.
 */
export function extractCandidatesFromTs(sources: string[]): string[] {
  const stringRe = /(?:`|"|')([^`"'\n]+)(?:`|"|')/g;
  const seen = new Set<string>();

  for (const ts of sources) {
    let match: RegExpExecArray | null;
    while ((match = stringRe.exec(ts)) !== null) {
      for (const token of match[1].split(/\s+/)) {
        if (
          token &&
          !token.startsWith("{{") &&
          !token.endsWith("}}") &&
          !token.includes("${")
        ) {
          seen.add(token);
        }
      }
    }
  }

  return [...seen];
}
