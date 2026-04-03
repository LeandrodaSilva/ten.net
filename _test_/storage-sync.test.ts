import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, it } from "@std/testing/bdd";
import { assertEquals } from "@std/assert";
import { IndexedDBStorage } from "../src/storage/indexeddb.ts";
import { StorageSync } from "../src/storage/sync.ts";
import { FakeTime } from "@std/testing/time";

let storage: IndexedDBStorage;
let dbCounter = 0;
const originalFetch = globalThis.fetch;

function createStorage(): IndexedDBStorage {
  dbCounter++;
  return new IndexedDBStorage(`test-sync-${Date.now()}-${dbCounter}`);
}

function mockFetch(response: unknown, ok = true): void {
  globalThis.fetch = (() =>
    Promise.resolve({
      ok,
      status: ok ? 200 : 500,
      statusText: ok ? "OK" : "Internal Server Error",
      json: () => Promise.resolve(response),
    })) as unknown as typeof fetch;
}

describe("StorageSync", () => {
  beforeEach(() => {
    storage = createStorage();
  });

  afterEach(async () => {
    globalThis.fetch = originalFetch;
    if (storage) await storage.destroy();
  });

  it("pull() busca items do servidor e salva no storage", async () => {
    mockFetch({
      items: [
        { id: "p1", title: "Page 1" },
        { id: "p2", title: "Page 2" },
      ],
      deleted: [],
      timestamp: 1000,
    });

    const sync = new StorageSync(storage, {
      serverUrl: "https://example.com",
      endpoint: "/api/sync",
    });

    const result = await sync.pull();
    assertEquals(result.updated, 2);
    assertEquals(result.deleted, 0);

    const p1 = await storage.get("p1");
    assertEquals(p1!.title, "Page 1");
    const p2 = await storage.get("p2");
    assertEquals(p2!.title, "Page 2");
  });

  it("pull() remove items deletados do storage", async () => {
    await storage.set("old", { id: "old", title: "To Remove" });

    mockFetch({
      items: [],
      deleted: ["old"],
      timestamp: 2000,
    });

    const sync = new StorageSync(storage, {
      serverUrl: "https://example.com",
      endpoint: "/api/sync",
    });

    const result = await sync.pull();
    assertEquals(result.deleted, 1);
    const item = await storage.get("old");
    assertEquals(item, null);
  });

  it("pull() envia lastSync como query param", async () => {
    let capturedUrl = "";
    globalThis.fetch = ((url: string | URL) => {
      capturedUrl = String(url);
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({ items: [], deleted: [], timestamp: 5000 }),
      });
    }) as unknown as typeof fetch;

    const sync = new StorageSync(storage, {
      serverUrl: "https://example.com",
      endpoint: "/api/sync",
    });

    // First pull: lastSync = 0
    await sync.pull();
    assertEquals(capturedUrl, "https://example.com/api/sync?since=0");

    // Second pull: lastSync = 5000
    await sync.pull();
    assertEquals(capturedUrl, "https://example.com/api/sync?since=5000");
  });

  it("start() faz sync imediato + periodico", async () => {
    let pullCount = 0;
    globalThis.fetch = (() => {
      pullCount++;
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({ items: [], deleted: [], timestamp: pullCount }),
      });
    }) as unknown as typeof fetch;

    const time = new FakeTime();
    try {
      const sync = new StorageSync(storage, {
        serverUrl: "https://example.com",
        endpoint: "/api/sync",
        interval: 1000,
      });

      sync.start();

      // Wait for the immediate pull to resolve
      await time.runMicrotasks();
      assertEquals(pullCount >= 1, true);

      // Advance time to trigger periodic pull
      await time.tickAsync(1000);
      assertEquals(pullCount >= 2, true);

      sync.stop();
    } finally {
      time.restore();
    }
  });

  it("stop() para sync periodico", async () => {
    let pullCount = 0;
    globalThis.fetch = (() => {
      pullCount++;
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({ items: [], deleted: [], timestamp: pullCount }),
      });
    }) as unknown as typeof fetch;

    const time = new FakeTime();
    try {
      const sync = new StorageSync(storage, {
        serverUrl: "https://example.com",
        endpoint: "/api/sync",
        interval: 1000,
      });

      sync.start();
      await time.runMicrotasks();
      const countAfterStart = pullCount;

      sync.stop();

      // Advance time — should NOT trigger more pulls
      await time.tickAsync(5000);
      assertEquals(pullCount, countAfterStart);
    } finally {
      time.restore();
    }
  });

  it("pull() trata erro de rede sem crashar", async () => {
    globalThis.fetch =
      (() =>
        Promise.reject(new Error("Network error"))) as unknown as typeof fetch;

    const sync = new StorageSync(storage, {
      serverUrl: "https://example.com",
      endpoint: "/api/sync",
    });

    let threw = false;
    try {
      await sync.pull();
    } catch {
      threw = true;
    }
    assertEquals(threw, true);

    // Storage should still be functional
    await storage.set("1", { id: "1", name: "still works" });
    const item = await storage.get("1");
    assertEquals(item!.name, "still works");
  });
});
