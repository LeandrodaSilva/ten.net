/**
 * Ten.net core — runtime-agnostic request handler.
 *
 * Import this entrypoint when you need the HTTP pipeline without any
 * Deno-specific dependencies. Suitable for browsers, Service Workers,
 * Cloudflare Workers, and Node.js.
 *
 * @example
 * ```typescript
 * import { TenCore } from "@leproj/tennet/core";
 * import type { AppManifest } from "@leproj/tennet/build/manifest";
 *
 * declare const manifest: AppManifest;
 * const core = new TenCore({ embedded: manifest });
 *
 * // Service Worker
 * self.addEventListener("fetch", (event) => {
 *   event.respondWith(core.fetch(event.request));
 * });
 * ```
 *
 * @module
 */

export { TenCore } from "./tenCore.ts";
export { decodeBase64Universal } from "./base64.ts";
export type {
  AdminPluginLikeCore,
  Base64Decoder,
  DynamicPageRenderer,
  DynamicRouteLike,
  DynamicRouteRegistryLike,
  DynamicRouteSitemapLike,
  SitemapEntriesProvider,
  TenCoreOptions,
  WidgetPageRendererCore,
} from "./types.ts";
