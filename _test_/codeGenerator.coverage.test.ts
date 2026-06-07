import { describe, it } from "@std/testing/bdd";
import { assertEquals, assertStringIncludes } from "@std/assert";
import {
  generateCompiledAppStandalone,
  generateServiceWorkerApp,
  generateServiceWorkerAppEncrypted,
} from "../src/build/codeGenerator.ts";

const SYNC = {
  serverUrl: "https://api.test",
  endpoint: "/sync",
  storeName: "data",
  interval: 30,
};

describe("codeGenerator — generateServiceWorkerApp", () => {
  it("emits a minimal SW for a plain manifest", () => {
    const code = generateServiceWorkerApp('{"routes":[]}');
    assertStringIncludes(code, "@leproj/tennet/core");
    assertStringIncludes(code, "fire(core)");
    assertEquals(code.includes("IndexedDBStorage"), false);
    assertEquals(code.includes("SYNC_CONFIG"), false);
  });

  it("adds seeding when the manifest has _seed", () => {
    const code = generateServiceWorkerApp('{"_seed":{"x":[]}}');
    assertStringIncludes(code, "IndexedDBStorage");
    assertStringIncludes(code, "pre-seeded");
  });

  it("adds sync wiring when a sync config is provided", () => {
    const code = generateServiceWorkerApp('{"routes":[]}', { sync: SYNC });
    assertStringIncludes(code, "StorageSync");
    assertStringIncludes(code, "SYNC_CONFIG");
    assertStringIncludes(code, "https://api.test");
  });
});

describe("codeGenerator — generateServiceWorkerAppEncrypted", () => {
  it("embeds the encrypted payload", () => {
    const code = generateServiceWorkerAppEncrypted("CT", "IV", "KEY");
    assertStringIncludes(code, "CT");
    assertStringIncludes(code, "IV");
    assertStringIncludes(code, "KEY");
    assertEquals(code.includes("StorageSync"), false);
  });

  it("includes sync wiring when configured", () => {
    const code = generateServiceWorkerAppEncrypted("CT", "IV", "KEY", {
      sync: SYNC,
    });
    assertStringIncludes(code, "StorageSync");
    assertStringIncludes(code, "https://api.test");
  });
});

describe("codeGenerator — generateCompiledAppStandalone", () => {
  it("inlines the framework source and the encrypted payload", () => {
    const code = generateCompiledAppStandalone(
      "CT",
      "IV",
      "KEY",
      "/* FRAMEWORK */",
    );
    assertStringIncludes(code, "/* FRAMEWORK */");
    assertStringIncludes(code, 'const ENCRYPTED_DATA = "CT"');
    assertStringIncludes(code, "boot(ENCRYPTED_DATA, IV, KEY_RAW)");
  });
});
