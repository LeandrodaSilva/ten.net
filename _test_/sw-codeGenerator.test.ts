import { describe, it } from "@std/testing/bdd";
import { assertStringIncludes } from "@std/assert";
import {
  generateServiceWorkerApp,
  generateServiceWorkerAppEncrypted,
} from "../src/build/codeGenerator.ts";

// ---------------------------------------------------------------------------
// Tests — generateServiceWorkerApp
// ---------------------------------------------------------------------------

describe("generateServiceWorkerApp()", () => {
  const manifestJson = JSON.stringify({
    routes: [
      {
        path: "/test",
        regexSource: "^\\/test$",
        regexFlags: "",
        hasPage: false,
        transpiledCode: 'export function GET() { return new Response("ok"); }',
        pageContent: "",
      },
    ],
    layouts: {},
    documentHtml: "<html>{{content}}</html>",
    assets: {},
  });

  const output = generateServiceWorkerApp(manifestJson);

  it("should import TenCore from @leproj/tennet/core", () => {
    assertStringIncludes(
      output,
      'import { TenCore } from "@leproj/tennet/core"',
    );
  });

  it("should import fire from @leproj/tennet/sw", () => {
    assertStringIncludes(output, 'import { fire } from "@leproj/tennet/sw"');
  });

  it("should contain the manifest JSON inline", () => {
    assertStringIncludes(output, "/test");
    assertStringIncludes(output, "MANIFEST");
  });

  it("should contain skipWaiting and clients.claim", () => {
    assertStringIncludes(output, "skipWaiting");
    assertStringIncludes(output, "clients.claim");
  });

  it("should contain fire(core)", () => {
    assertStringIncludes(output, "fire(core)");
  });
});

// ---------------------------------------------------------------------------
// Tests — generateServiceWorkerAppEncrypted
// ---------------------------------------------------------------------------

describe("generateServiceWorkerAppEncrypted()", () => {
  const encrypted = "dGVzdC1lbmNyeXB0ZWQ="; // base64 "test-encrypted"
  const iv = "dGVzdC1pdg=="; // base64 "test-iv"
  const key = "dGVzdC1rZXk="; // base64 "test-key"

  const output = generateServiceWorkerAppEncrypted(encrypted, iv, key);

  it("should import decrypt utilities from @leproj/tennet/build/crypto", () => {
    assertStringIncludes(output, '@leproj/tennet/build/crypto"');
    assertStringIncludes(output, "decrypt");
    assertStringIncludes(output, "importKeyRaw");
    assertStringIncludes(output, "decompressData");
  });

  it("should contain ENCRYPTED_DATA, IV, and KEY_RAW constants", () => {
    assertStringIncludes(output, `ENCRYPTED_DATA = "${encrypted}"`);
    assertStringIncludes(output, `IV = "${iv}"`);
    assertStringIncludes(output, `KEY_RAW = "${key}"`);
  });

  it("should contain decrypt and decompressData calls", () => {
    assertStringIncludes(output, "decrypt(");
    assertStringIncludes(output, "decompressData(");
  });
});
