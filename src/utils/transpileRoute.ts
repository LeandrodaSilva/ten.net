/**
 * Transpiles a TypeScript file to JavaScript using Deno's bundler.
 *
 * @param tsPath - The file path to the TypeScript file to be transpiled
 * @returns A Promise that resolves to the transpiled JavaScript code as a string, or an empty string if transpilation fails
 * @throws {Error} When no JavaScript output is generated for the given TypeScript file
 *
 * @example
 * ```typescript
 * const jsCode = await transpileFile('./src/example.ts');
 * console.log(jsCode); // Transpiled JavaScript code
 * ```
 */
export async function transpileRoute(tsPath: string): Promise<string> {
  const result = await Deno.bundle({
    entrypoints: [
      tsPath,
    ],
    platform: "deno",
    minify: false,
    write: false,
  });
  if (result.success) {
    const file = result?.outputFiles?.shift();
    const text = file?.text();
    const lines = text?.split("\n");
    if (lines![0]?.startsWith("//")) {
      lines?.shift();
    }
    return lines?.join("\n") ?? "";
  }

  return "";
}
