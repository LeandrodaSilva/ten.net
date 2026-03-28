/**
 * Evaluates transpiled JavaScript module code using the Function constructor,
 * extracting ES module exports as a plain object. This avoids dynamic `import()`
 * which fails with blob/data URIs in `deno compile` binaries.
 *
 * @param code - Self-contained JavaScript with ES module export statements
 * @returns Promise resolving to a record of exported names → values
 *
 * @example
 * ```typescript
 * const mod = await evaluateModuleCode('export function GET() { return new Response("ok"); }');
 * // mod.GET is the function
 * ```
 *
 * @module
 */

// deno-lint-ignore no-explicit-any
const AsyncFunction = Object.getPrototypeOf(async function () {})
  .constructor as new (...args: any[]) => (...args: any[]) => Promise<any>;

/**
 * Evaluates self-contained JavaScript code that uses ES module `export` syntax,
 * returning the exported bindings as a plain object.
 *
 * Handles three export patterns produced by `Deno.bundle()`:
 * 1. `export function NAME(...)` → direct export
 * 2. `export const NAME = ...` → const export
 * 3. `export { NAME1, NAME2 }` → aggregated export block (may be multiline)
 */
export async function evaluateModuleCode(
  code: string,
): Promise<Record<string, unknown>> {
  // Maps exportedName → localName (same when no alias)
  const exportMap: Map<string, string> = new Map();
  let strippedCode = code;

  // Pattern 1: export [async] function NAME(...)
  strippedCode = strippedCode.replace(
    /export\s+(async\s+)?function\s+(\w+)/g,
    (_match, asyncKw: string | undefined, name: string) => {
      exportMap.set(name, name);
      return `${asyncKw ?? ""}function ${name}`;
    },
  );

  // Pattern 2: export const NAME = ...
  strippedCode = strippedCode.replace(
    /export\s+const\s+(\w+)/g,
    (_match, name: string) => {
      exportMap.set(name, name);
      return `const ${name}`;
    },
  );

  // Pattern 3: export { NAME1, NAME2, ... } (may span multiple lines)
  strippedCode = strippedCode.replace(
    /export\s*\{([^}]+)\}/g,
    (_match, names: string) => {
      names
        .split(",")
        .map((n) => n.trim())
        .filter((n) => n.length > 0)
        .forEach((n) => {
          const parts = n.split(/\s+as\s+/);
          const localName = parts[0].trim();
          const exportedName = parts[parts.length - 1].trim();
          exportMap.set(exportedName, localName);
        });
      return ""; // Remove the export block
    },
  );

  // Pattern 4: export default ... (capture as "default")
  strippedCode = strippedCode.replace(
    /export\s+default\s+/g,
    () => {
      exportMap.set("default", "__default__");
      return "const __default__ = ";
    },
  );

  if (exportMap.size === 0) {
    return {};
  }

  // Build the return statement mapping exported names to local variable names
  const returnEntries = [...exportMap.entries()]
    .map(([exported, local]) =>
      exported === local ? exported : `${JSON.stringify(exported)}: ${local}`
    )
    .join(", ");

  const wrappedCode = `${strippedCode}\nreturn { ${returnEntries} };`;

  const fn = new AsyncFunction(wrappedCode);
  return await fn() as Record<string, unknown>;
}
