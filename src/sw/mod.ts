/**
 * Ten.net Service Worker Adapter.
 * Intercepts browser fetch events and routes them through TenCore.
 *
 * @example
 * ```typescript
 * import { TenCore } from "@leproj/tennet/core";
 * import { fire } from "@leproj/tennet/sw";
 *
 * const core = new TenCore({ embedded: manifest });
 * fire(core);
 * ```
 *
 * @module
 */
export { fire, handle, listenForManifestUpdates } from "./adapter.ts";
export type {
  ExtendableEvent,
  FetchEvent,
  TenServiceWorkerOptions,
} from "./types.ts";
