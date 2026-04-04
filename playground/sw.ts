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
  fallback: (input: RequestInfo | URL, init?: RequestInit) =>
    fetch(input, init),
});

listenForManifestUpdates(core);

// deno-lint-ignore no-explicit-any
const sw = self as any;

sw.addEventListener("install", () => {
  sw.skipWaiting();
});

sw.addEventListener("activate", (evt: Event) => {
  (evt as Event & { waitUntil(f: Promise<unknown>): void }).waitUntil(
    sw.clients.claim(),
  );
});
