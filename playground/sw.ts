import { TenCore } from "../src/core/tenCore.ts";
import { fire, listenForManifestUpdates } from "../src/sw/adapter.ts";
import type { AppManifest } from "../src/build/manifest.ts";

const emptyManifest: AppManifest = {
  routes: [],
  layouts: {},
  documentHtml: "",
  assets: {},
};

const core = new TenCore({ embedded: emptyManifest });

fire(core, {
  pathPrefix: "/preview",
  fallback: (req: Request) => fetch(req),
});

listenForManifestUpdates(core);

declare const self: ServiceWorkerGlobalScope & typeof globalThis;

interface ExtendableEvent extends Event {
  waitUntil(f: Promise<unknown>): void;
}

self.addEventListener("install", () => {
  (self as unknown as { skipWaiting(): Promise<void> }).skipWaiting();
});

self.addEventListener("activate", (evt) => {
  (evt as ExtendableEvent).waitUntil(
    (self as unknown as { clients: { claim(): Promise<void> } }).clients
      .claim(),
  );
});
