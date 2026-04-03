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

export function generateServiceWorkerApp(
  manifestJson: string,
): string {
  return `import { TenCore } from "@leproj/tennet/core";
import { fire } from "@leproj/tennet/sw";

const MANIFEST = ${manifestJson};

const core = new TenCore({ embedded: MANIFEST });
core.init();

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

fire(core);

console.log("[Ten.net SW] Ready —", core.routes.length, "routes loaded");
`;
}

export function generateServiceWorkerAppEncrypted(
  encryptedBase64: string,
  ivBase64: string,
  keyRawBase64: string,
): string {
  return `import { TenCore } from "@leproj/tennet/core";
import { fire } from "@leproj/tennet/sw";
import { decrypt, importKeyRaw, decompressData } from "@leproj/tennet/build/crypto";

const ENCRYPTED_DATA = "${encryptedBase64}";
const IV = "${ivBase64}";
const KEY_RAW = "${keyRawBase64}";

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
    event.waitUntil(self.skipWaiting());
  });

  self.addEventListener("activate", (event) => {
    event.waitUntil(self.clients.claim());
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
