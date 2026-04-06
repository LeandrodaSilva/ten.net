/**
 * Generates optimized Tailwind CSS containing only the utilities
 * for the given class candidates. Uses Tailwind v4 programmatic API.
 */
export async function generateTailwindCss(
  candidates: string[],
): Promise<string> {
  const { compile } = await import("tailwindcss");

  // import.meta.resolve points to dist/index.mjs — go up one level to package root
  const twEntryUrl = import.meta.resolve("tailwindcss");
  const twPkgBase = twEntryUrl.replace(/\/dist\/[^/]+$/, "/");

  const { build } = await compile("@import 'tailwindcss'", {
    loadStylesheet: async (id: string, base: string) => {
      // "tailwindcss" → package root index.css; relative ids resolve from base
      const resolved = id === "tailwindcss"
        ? new URL("index.css", twPkgBase).href
        : new URL(id, base).href;
      const content = await Deno.readTextFile(new URL(resolved));
      return {
        path: resolved,
        base: resolved.replace(/\/[^/]+$/, "/"),
        content,
      };
    },
  });

  return build(candidates);
}
