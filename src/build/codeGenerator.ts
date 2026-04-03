export function generateCompiledApp(
  encryptedDataBase64: string,
  ivBase64: string,
  keyRawBase64: string,
): string {
  return `import { Ten } from "@leproj/tennet";
import type { AppManifest } from "@leproj/tennet/build/manifest";
import { decrypt, importKeyRaw, decompressData } from "@leproj/tennet/build/crypto";

const ENCRYPTED_DATA = "${encryptedDataBase64}";
const IV = "${ivBase64}";
const KEY_RAW = "${keyRawBase64}";

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i);
  }
  return bytes;
}

async function boot() {
  const key = await importKeyRaw(base64ToBytes(KEY_RAW));
  const decrypted = await decrypt(
    base64ToBytes(ENCRYPTED_DATA),
    key,
    base64ToBytes(IV),
  );
  const decompressed = await decompressData(decrypted);
  const manifest: AppManifest = JSON.parse(
    new TextDecoder().decode(decompressed),
  );

  const port = parseInt(Deno.env.get("PORT") ?? "8000");
  const app = Ten.net({ embedded: manifest });
  await app.start({ port, onListen: () => console.log("READY:" + port) });
}

if (import.meta.main) {
  boot();
}
`;
}

/** Options for seed/sync in generated Service Worker code. */
export interface SWGenerateOptions {
  sync?: {
    serverUrl: string;
    endpoint: string;
    storeName: string;
    interval?: number;
    headers?: Record<string, string>;
  };
}

export function generateServiceWorkerApp(
  manifestJson: string,
  options?: SWGenerateOptions,
): string {
  const hasSeed = manifestJson.includes('"_seed"');
  const hasSync = !!options?.sync;
  const needsStorageImport = hasSeed || hasSync;

  const imports = [
    `import { TenCore } from "@leproj/tennet/core";`,
    `import { fire } from "@leproj/tennet/sw";`,
  ];
  if (needsStorageImport) {
    imports.push(
      `import { IndexedDBStorage } from "@leproj/tennet/storage/indexeddb";`,
    );
  }
  if (hasSync) {
    imports.push(
      `import { StorageSync } from "@leproj/tennet/storage/indexeddb";`,
    );
  }

  const syncConfig = hasSync
    ? `\nconst SYNC_CONFIG = ${JSON.stringify(options!.sync)};`
    : "";

  const installBody = hasSeed
    ? `event.waitUntil((async () => {
    await self.skipWaiting();
    if (MANIFEST._seed) {
      for (const [storeName, items] of Object.entries(MANIFEST._seed)) {
        const storage = new IndexedDBStorage("tennet", storeName);
        for (const item of items) {
          await storage.set(item.id, item);
        }
      }
      console.log("[Ten.net SW] Storage pre-seeded");
    }
  })());`
    : `event.waitUntil(self.skipWaiting());`;

  const activateBody = hasSync
    ? `event.waitUntil((async () => {
    await self.clients.claim();
    const storage = new IndexedDBStorage("tennet", SYNC_CONFIG.storeName);
    const sync = new StorageSync(storage, SYNC_CONFIG);
    sync.start();
    console.log("[Ten.net SW] Sync started for", SYNC_CONFIG.storeName);
  })());`
    : `event.waitUntil(self.clients.claim());`;

  return `${imports.join("\n")}

const MANIFEST = ${manifestJson};${syncConfig}

const core = new TenCore({ embedded: MANIFEST });
core.init();

self.addEventListener("install", (event) => {
  ${installBody}
});

self.addEventListener("activate", (event) => {
  ${activateBody}
});

fire(core);

console.log("[Ten.net SW] Ready —", core.routes.length, "routes loaded");
`;
}

export function generateServiceWorkerAppEncrypted(
  encryptedBase64: string,
  ivBase64: string,
  keyRawBase64: string,
  options?: SWGenerateOptions,
): string {
  const hasSync = !!options?.sync;

  const storageImports = [
    `import { IndexedDBStorage } from "@leproj/tennet/storage/indexeddb";`,
  ];
  if (hasSync) {
    storageImports.push(
      `import { StorageSync } from "@leproj/tennet/storage/indexeddb";`,
    );
  }

  const syncConfig = hasSync
    ? `const SYNC_CONFIG = ${JSON.stringify(options!.sync)};`
    : "";

  const seedBlock = `
    if (manifest._seed) {
      for (const [storeName, items] of Object.entries(manifest._seed)) {
        const storage = new IndexedDBStorage("tennet", storeName);
        for (const item of items) {
          await storage.set(item.id, item);
        }
      }
      console.log("[Ten.net SW] Storage pre-seeded");
    }`;

  const syncBlock = hasSync
    ? `
    const syncStorage = new IndexedDBStorage("tennet", SYNC_CONFIG.storeName);
    const sync = new StorageSync(syncStorage, SYNC_CONFIG);
    sync.start();
    console.log("[Ten.net SW] Sync started for", SYNC_CONFIG.storeName);`
    : "";

  return `import { TenCore } from "@leproj/tennet/core";
import { fire } from "@leproj/tennet/sw";
import { decrypt, importKeyRaw, decompressData } from "@leproj/tennet/build/crypto";
${storageImports.join("\n")}

const ENCRYPTED_DATA = "${encryptedBase64}";
const IV = "${ivBase64}";
const KEY_RAW = "${keyRawBase64}";
${syncConfig}

function base64ToBytes(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i);
  }
  return bytes;
}

async function boot() {
  const key = await importKeyRaw(base64ToBytes(KEY_RAW));
  const decrypted = await decrypt(
    base64ToBytes(ENCRYPTED_DATA),
    key,
    base64ToBytes(IV),
  );
  const decompressed = await decompressData(decrypted);
  const manifest = JSON.parse(new TextDecoder().decode(decompressed));

  const core = new TenCore({ embedded: manifest });
  core.init();

  self.addEventListener("install", (event) => {
    event.waitUntil((async () => {
      await self.skipWaiting();${seedBlock}
    })());
  });

  self.addEventListener("activate", (event) => {
    event.waitUntil((async () => {
      await self.clients.claim();${syncBlock}
    })());
  });

  fire(core);

  console.log("[Ten.net SW] Ready —", core.routes.length, "routes loaded");
}

boot();
`;
}

export function generateCompiledAppStandalone(
  encryptedDataBase64: string,
  ivBase64: string,
  keyRawBase64: string,
  frameworkSource: string,
): string {
  return `// Ten.net Compiled Application — Self-contained binary
// All routes, templates, and assets are embedded and encrypted.

${frameworkSource}

const ENCRYPTED_DATA = "${encryptedDataBase64}";
const IV = "${ivBase64}";
const KEY_RAW = "${keyRawBase64}";

if (import.meta.main) {
  boot(ENCRYPTED_DATA, IV, KEY_RAW);
}
`;
}
