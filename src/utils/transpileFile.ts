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
export async function transpileFile(tsPath: string): Promise<string> {
  const result = await Deno.bundle({
    entrypoints: [
      tsPath,
    ],
    platform: "deno",
    minify: false,
  });
  if (result.success) {
    const file = result?.outputFiles?.shift();
    if (!file) {
      throw new Error(`Sem saída JS para ${tsPath} (verifique imports/alias).`);
    }
    console.log(`✔ Transpilado ${tsPath} -> ${file.path}`);
    return file.text();
  } else {
    console.error(`✘ Erro ao transpilar ${tsPath}:`, result.errors);
  }

  return "";
}
