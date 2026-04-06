/**
 * Embeds `tailwindcss/index.css` into a TypeScript constant so the runtime
 * generator has a fallback when `import.meta.resolve("tailwindcss")` returns
 * a non-file scheme (e.g., `npm:tailwindcss@^4` in some Deno/JSR environments
 * like Linux/Docker or JSR-loaded code).
 *
 * Run via: `deno task embed-tailwind`
 */

const twEntryUrl = import.meta.resolve("tailwindcss");

if (!twEntryUrl.startsWith("file:")) {
  throw new Error(
    `embedTailwindCss: expected import.meta.resolve("tailwindcss") to return a file:// URL, got "${twEntryUrl}". ` +
      `This script must run in an environment where Deno can locate the installed tailwindcss package on disk.`,
  );
}

const versionMatch = twEntryUrl.match(/\/tailwindcss\/([^/]+)\//);
if (!versionMatch) {
  throw new Error(
    `embedTailwindCss: could not extract version from resolved URL "${twEntryUrl}".`,
  );
}
const version = versionMatch[1];

const pkgBase = twEntryUrl.replace(/\/dist\/[^/]+$/, "/");
const indexCssUrl = new URL("index.css", pkgBase);
const cssContent = await Deno.readTextFile(indexCssUrl);

const header =
  `// AUTO-GENERATED from tailwindcss@${version}/index.css — DO NOT EDIT.\n` +
  `// Regenerate with: deno task embed-tailwind\n`;

const body =
  `export const TAILWIND_INDEX_CSS_VERSION = ${JSON.stringify(version)};\n` +
  `export const TAILWIND_INDEX_CSS = ${JSON.stringify(cssContent)};\n`;

const outUrl = new URL("../src/tailwind/_tailwindIndexCss.ts", import.meta.url);
await Deno.writeTextFile(outUrl, header + body);

const byteLength = new TextEncoder().encode(cssContent).byteLength;
console.log(`Embedded ${byteLength} bytes from tailwindcss@${version}`);
