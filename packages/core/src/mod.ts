/**
 * Ten.net — A minimalist Deno web microframework with file-based routing,
 * HTML templating, nested layouts, and a plugin system.
 *
 * @example
 * ```typescript
 * import { Ten } from "@leproj/tennet";
 *
 * const app = Ten.net();
 * await app.start();
 * ```
 *
 * @module
 */

export { Ten } from "./ten.ts";
export type {
  AppManifest,
  EmbeddedAsset,
  EmbeddedRoute,
} from "./build/manifest.ts";
export type { BuildOptions, BuildResult } from "./build/build.ts";
export { decompressData, decrypt, importKeyRaw } from "./build/crypto.ts";
export { Plugin } from "./models/Plugin.ts";
export type { PluginModel } from "./models/Plugin.ts";
export { Route } from "./models/Route.ts";
export type { Middleware } from "./middleware/middleware.ts";
export { buildPermissionKey } from "./models/Permission.ts";
export type { PermissionAction } from "./models/Permission.ts";
export type { ListOptions, Storage, StorageItem } from "./models/Storage.ts";
export {
  renderDynamicPage,
  type SeoOptions,
} from "./routing/dynamicPageHandler.ts";
export { DynamicRouteRegistry } from "./routing/dynamicRouteRegistry.ts";
export { BlogRouteRegistry } from "./routing/blogRouteRegistry.ts";
export type { WidgetPageRenderer } from "./models/WidgetResolver.ts";
export { renderWidgetPage } from "./routing/widgetPageHandler.ts";
