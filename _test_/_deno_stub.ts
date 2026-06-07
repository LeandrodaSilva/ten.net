/**
 * Replace a property on the global `Deno` object for the duration of a test,
 * returning a restore function.
 *
 * Uses `Object.defineProperty` because some Deno APIs (notably `Deno.serve`)
 * are exposed as getter-only properties on recent runtimes and can no longer
 * be reassigned with a plain `Deno.x = ...` assignment.
 */
export function stubDeno<K extends keyof typeof Deno>(
  key: K,
  // deno-lint-ignore no-explicit-any
  value: any,
): () => void {
  const original = Deno[key];
  Object.defineProperty(Deno, key, {
    value,
    configurable: true,
    writable: true,
  });
  return () => {
    Object.defineProperty(Deno, key, {
      value: original,
      configurable: true,
      writable: true,
    });
  };
}
