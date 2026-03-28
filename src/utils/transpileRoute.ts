import { transpile } from "@deno/emit";

/**
 * Transpiles a TypeScript file to JavaScript using @deno/emit.
 *
 * @param tsPath - The file path to the TypeScript file to be transpiled
 * @returns A Promise that resolves to the transpiled JavaScript code as a string, or an empty string if transpilation fails
 *
 * @example
 * ```typescript
 * const jsCode = await transpileRoute('./src/example.ts');
 * console.log(jsCode); // Transpiled JavaScript code
 * ```
 */
export async function transpileRoute(tsPath: string): Promise<string> {
  if (!tsPath) return "";

  try {
    const url = new URL(tsPath, `file://${Deno.cwd()}/`);
    const result = await transpile(url);
    const code = result.get(url.href);
    if (!code) return "";

    const lines = code.split("\n");
    if (lines[0]?.startsWith("//")) {
      lines.shift();
    }
    return lines.join("\n");
  } catch {
    return "";
  }
}
