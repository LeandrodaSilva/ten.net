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
        if (token && !token.startsWith("{{") && !token.endsWith("}}")) {
          seen.add(token);
        }
      }
    }
  }

  return [...seen];
}
