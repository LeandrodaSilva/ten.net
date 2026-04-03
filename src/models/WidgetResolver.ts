/**
 * Function type for rendering widget placeholders in dynamic page HTML.
 *
 * The core framework calls this function when a dynamic page has
 * `widgets_enabled === "true"` to resolve `{{widgets:name}}` placeholders.
 *
 * The implementation lives in the CMS plugin (`@leproj/tennet-cms`),
 * keeping the core free of widget dependencies.
 *
 * @param pageId - The page identifier (KV prefix for widget instances)
 * @param body - HTML string potentially containing `{{widgets:name}}` placeholders
 * @param kv - The Deno KV instance to load widget data from
 * @returns The body string with all widget placeholders resolved
 */
export type WidgetPageRenderer = (
  pageId: string,
  body: string,
  kv: Deno.Kv,
) => Promise<string>;
