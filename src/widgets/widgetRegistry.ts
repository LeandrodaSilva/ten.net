import type { WidgetDefinition, WidgetType } from "./types.ts";

/**
 * Registry for widget definitions.
 *
 * Plugins and application code register WidgetDefinitions here.
 * The registry is a singleton — use the exported `widgetRegistry` instance.
 */
class WidgetRegistry {
  private readonly _definitions = new Map<WidgetType, WidgetDefinition>();

  /**
   * Register a widget definition.
   * Overwrites an existing registration if the same type is provided.
   */
  register(definition: WidgetDefinition): void {
    this._definitions.set(definition.type, definition);
  }

  /**
   * Get a widget definition by type.
   * Returns null if the type is not registered.
   */
  get(type: WidgetType): WidgetDefinition | null {
    return this._definitions.get(type) ?? null;
  }

  /** Return all registered widget definitions. */
  all(): WidgetDefinition[] {
    return Array.from(this._definitions.values());
  }
}

/** Global widget registry singleton. */
export const widgetRegistry: WidgetRegistry = new WidgetRegistry();
