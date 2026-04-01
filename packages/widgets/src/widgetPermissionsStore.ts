import type { WidgetDefinition, WidgetType } from "./types.ts";
import { widgetRegistry } from "./widgetRegistry.ts";

/**
 * KV-backed store for per-role widget permissions.
 *
 * Key layout: ["widget-permissions", roleSlug, widgetType] → boolean
 *
 * Fallback rules (no explicit KV entry):
 *   - restricted widget → false for non-admin roles, true for admin
 *   - non-restricted widget → true for all roles
 */
export class WidgetPermissionsStore {
  constructor(private readonly _kv: Deno.Kv) {}

  /**
   * Check whether a role may use a widget type.
   * Reads from KV; falls back to the widget's `restricted` flag.
   */
  async canUse(role: string, type: WidgetType): Promise<boolean> {
    const key = ["widget-permissions", role, type] as const;
    const entry = await this._kv.get<boolean>(key);
    if (entry.value !== null) return entry.value;

    // Fallback: restricted widgets are admin-only by default
    const def = widgetRegistry.get(type);
    if (def?.restricted) return role === "admin";
    return true;
  }

  /**
   * Explicitly grant or revoke a widget type for a role.
   */
  async setAllowed(
    role: string,
    type: WidgetType,
    allowed: boolean,
  ): Promise<void> {
    await this._kv.set(["widget-permissions", role, type], allowed);
  }

  /**
   * Return all widget definitions that the given role is allowed to use.
   * Iterates the full registry and applies canUse for each entry.
   */
  async getAllowedWidgets(role: string): Promise<WidgetDefinition[]> {
    const all = widgetRegistry.all();
    const allowed: WidgetDefinition[] = [];
    for (const def of all) {
      if (await this.canUse(role, def.type)) {
        allowed.push(def);
      }
    }
    return allowed;
  }
}
