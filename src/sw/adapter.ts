import type { AppManifest } from "../build/manifest.ts";
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
        const url = new URL(evt.request.url);

        if (opts.pathPrefix) {
          if (!url.pathname.startsWith(opts.pathPrefix)) {
            if (opts.fallback) return opts.fallback(evt.request);
            return fetch(evt.request);
          }
          const strippedPath = url.pathname.slice(opts.pathPrefix.length) || "/";
          const strippedUrl = new URL(strippedPath, url.origin);
          strippedUrl.search = url.search;
          strippedUrl.hash = url.hash;
          const strippedReq = new Request(strippedUrl.href, {
            method: evt.request.method,
            headers: evt.request.headers,
            body: evt.request.body,
          });
          const res = await core.fetch(strippedReq);
          if (res.status === 404 && opts.fallback) {
            return opts.fallback(evt.request);
          }
          return res;
        }

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
 * Listen for postMessage events to hot-swap the TenCore manifest.
 * Expected message format: { type: "UPDATE_MANIFEST", manifest: AppManifest }
 */
export function listenForManifestUpdates(core: TenCore): void {
  (self as unknown as EventTarget).addEventListener(
    "message",
    ((evt: MessageEvent) => {
      if (evt.data?.type === "UPDATE_MANIFEST" && evt.data.manifest) {
        core.updateManifest(evt.data.manifest as AppManifest);
      }
    }) as EventListener,
  );
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
