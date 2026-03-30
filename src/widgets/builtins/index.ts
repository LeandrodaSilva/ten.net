/**
 * Built-in widget definitions for Ten.net.
 *
 * Import this module to register all built-in widgets with the widgetRegistry:
 *
 * ```ts
 * import { registerBuiltinWidgets } from "./builtins/index.ts";
 * registerBuiltinWidgets();
 * ```
 */
import { widgetRegistry } from "../widgetRegistry.ts";
import { heroWidget } from "./hero.ts";
import { richTextWidget } from "./richText.ts";
import { imageWidget } from "./image.ts";

export { heroWidget } from "./hero.ts";
export { richTextWidget } from "./richText.ts";
export { imageWidget } from "./image.ts";

/**
 * Register all built-in widget definitions with the global widgetRegistry.
 * Safe to call multiple times — registry.register() is idempotent per type.
 */
export function registerBuiltinWidgets(): void {
  widgetRegistry.register(heroWidget);
  widgetRegistry.register(richTextWidget);
  widgetRegistry.register(imageWidget);
}
