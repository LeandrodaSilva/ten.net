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
