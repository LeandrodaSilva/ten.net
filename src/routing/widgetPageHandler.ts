import { WidgetStore } from "../widgets/widgetStore.ts";
import { widgetRegistry } from "../widgets/widgetRegistry.ts";
import type { PlaceholderMap, WidgetInstance } from "../widgets/types.ts";

/**
 * Resolve all {{widgets:name}} placeholders in an HTML body string.
 *
 * For each placeholder found:
 * 1. Load all WidgetInstances for the page from KV (single kv.list op).
 * 2. Group them by placeholder name.
 * 3. Render each widget via its registered WidgetDefinition.
 * 4. Replace {{widgets:name}} with the concatenated HTML of rendered widgets.
 *
 * If a widget type is not registered in widgetRegistry, it is silently skipped.
 *
 * @param pageId - The page identifier (used as KV prefix for widget instances).
 * @param body - The raw HTML body string from the page, potentially containing {{widgets:name}} placeholders.
 * @param kv - The Deno KV instance to load widget data from.
 * @returns The body string with all {{widgets:name}} placeholders replaced.
 */
export async function renderWidgetPage(
  pageId: string,
  body: string,
  kv: Deno.Kv,
): Promise<string> {
  // Fast path: no widget placeholders in body
  if (!body.includes("{{widgets:")) {
    return body;
  }

  // Collect all unique placeholder names referenced in the body
  const placeholderNames = extractPlaceholderNames(body);
  if (placeholderNames.size === 0) {
    return body;
  }

  // Single KV list operation to load all instances for this page
  const store = new WidgetStore(kv);
  const instances = await store.loadForPage(pageId);

  // Group instances by placeholder name
  const placeholderMap = groupByPlaceholder(instances);

  // Replace each {{widgets:name}} placeholder with rendered HTML
  let result = body;
  for (const name of placeholderNames) {
    const placeholder = "{{widgets:" + name + "}}";
    const widgetInstances = placeholderMap[name] ?? [];
    const html = renderPlaceholder(widgetInstances);
    result = result.replaceAll(placeholder, html);
  }

  return result;
}

/**
 * Extract all unique placeholder names from {{widgets:name}} patterns in a string.
 */
function extractPlaceholderNames(body: string): Set<string> {
  const names = new Set<string>();
  const pattern = /\{\{widgets:([^}]+)\}\}/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(body)) !== null) {
    const name = match[1].trim();
    if (name) names.add(name);
  }
  return names;
}

/**
 * Group an array of WidgetInstances into a PlaceholderMap.
 * Instances are already sorted by placeholder + order from WidgetStore.loadForPage.
 */
function groupByPlaceholder(instances: WidgetInstance[]): PlaceholderMap {
  const map: PlaceholderMap = {};
  for (const instance of instances) {
    const key = instance.placeholder;
    if (!map[key]) map[key] = [];
    map[key].push(instance);
  }
  return map;
}

/**
 * Render all widget instances in a placeholder to an HTML string.
 * Unregistered widget types are silently skipped.
 */
function renderPlaceholder(instances: WidgetInstance[]): string {
  const parts: string[] = [];
  for (const instance of instances) {
    const definition = widgetRegistry.get(instance.type);
    if (!definition) continue;
    try {
      parts.push(definition.render(instance));
    } catch {
      // Rendering errors must not break the page
    }
  }
  return parts.join("\n");
}
