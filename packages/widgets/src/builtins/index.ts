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
import { ctaButtonWidget } from "./ctaButton.ts";
import { spacerWidget } from "./spacer.ts";
import { galleryWidget } from "./gallery.ts";
import { contactFormWidget } from "./contactForm.ts";
import { htmlWidget } from "./html.ts";
import { embedWidget } from "./embed.ts";
import { columnsWidget } from "./columns.ts";

export { heroWidget } from "./hero.ts";
export { richTextWidget } from "./richText.ts";
export { imageWidget } from "./image.ts";
export { ctaButtonWidget } from "./ctaButton.ts";
export { spacerWidget } from "./spacer.ts";
export { galleryWidget } from "./gallery.ts";
export { contactFormWidget } from "./contactForm.ts";
export { htmlWidget } from "./html.ts";
export { embedWidget } from "./embed.ts";
export { columnsWidget } from "./columns.ts";

/**
 * Register all built-in widget definitions with the global widgetRegistry.
 * Safe to call multiple times — registry.register() is idempotent per type.
 */
export function registerBuiltinWidgets(): void {
  widgetRegistry.register(heroWidget);
  widgetRegistry.register(richTextWidget);
  widgetRegistry.register(imageWidget);
  widgetRegistry.register(ctaButtonWidget);
  widgetRegistry.register(spacerWidget);
  widgetRegistry.register(galleryWidget);
  widgetRegistry.register(contactFormWidget);
  widgetRegistry.register(htmlWidget);
  widgetRegistry.register(embedWidget);
  widgetRegistry.register(columnsWidget);
}
