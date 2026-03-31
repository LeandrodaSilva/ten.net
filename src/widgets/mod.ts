/**
 * Public API for the Ten.net widget system.
 *
 * ```ts
 * import { widgetRegistry, registerBuiltinWidgets } from "@leproj/tennet/widgets";
 * ```
 */

export { widgetRegistry } from "./widgetRegistry.ts";
export { registerBuiltinWidgets } from "./builtins/index.ts";
export { WidgetPermissionsStore } from "./widgetPermissionsStore.ts";
export { WidgetAuditLogger } from "./widgetAuditLogger.ts";

export type {
  BuiltinWidgetType,
  PageLayout,
  PlaceholderMap,
  WidgetDefinition,
  WidgetFieldSchema,
  WidgetInstance,
  WidgetRenderContext,
  WidgetType,
} from "./types.ts";
