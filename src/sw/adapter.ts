import type { TenCore } from "../core/tenCore.ts";
import type { FetchEvent, TenServiceWorkerOptions } from "./types.ts";

/**
 * Creates a FetchEvent handler that delegates to TenCore.
 * Use with: self.addEventListener("fetch", handle(core))
 */
export function handle(
  core: TenCore,
  opts: TenServiceWorkerOptions = {},
): (evt: FetchEvent) => void {
  return (evt) => {
    evt.respondWith(
      (async () => {
        const res = await core.fetch(evt.request);
        if (res.status === 404 && opts.fallback) {
          return opts.fallback(evt.request);
        }
        return res;
      })(),
    );
  };
}

/**
 * Convenience: registers the fetch listener automatically.
 * Call once at SW top level: fire(core)
 */
export function fire(
  core: TenCore,
  opts: TenServiceWorkerOptions = {},
): void {
  (self as unknown as EventTarget).addEventListener(
    "fetch",
    handle(core, opts) as EventListener,
  );
}
