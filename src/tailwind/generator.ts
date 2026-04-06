import { TAILWIND_INDEX_CSS } from "./_tailwindIndexCss.ts";

/**
 * Generates optimized Tailwind CSS containing only the utilities
 * for the given class candidates. Uses Tailwind v4 programmatic API.
 */
export async function generateTailwindCss(
  candidates: string[],
): Promise<string> {
  const { compile } = await import("tailwindcss");

  // Try to resolve tailwindcss's installed index.css via import.meta.resolve.
  // Falls back to embedded CSS when resolve returns a non-file scheme
  // (e.g., "npm:tailwindcss@^4" in some Deno/JSR environments).
  let indexCssContent: string;
  try {
    const twEntryUrl = import.meta.resolve("tailwindcss");
    if (twEntryUrl.startsWith("file:")) {
      const pkgBase = twEntryUrl.replace(/\/dist\/[^/]+$/, "/");
      const indexCssUrl = new URL("index.css", pkgBase);
      indexCssContent = await Deno.readTextFile(indexCssUrl);
    } else {
      indexCssContent = TAILWIND_INDEX_CSS;
    }
  } catch {
    indexCssContent = TAILWIND_INDEX_CSS;
  }

  const { build } = await compile("@import 'tailwindcss'", {
    loadStylesheet: async (id: string, base: string) => {
      if (id === "tailwindcss") {
        return { path: "tailwindcss", base: "", content: indexCssContent };
      }
      // Fallback for relative ids (not triggered by 4.2.2's self-contained index.css)
      const resolved = new URL(id, base).href;
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
