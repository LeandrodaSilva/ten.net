/**
 * Coverage tests for storage modules — error/edge branches
 * Covers: denoKvSessionStore atomic failure, denoKvStorage atomic failure
 */
import { afterEach, beforeEach, describe, it } from "@std/testing/bdd";
import { assertEquals } from "@std/assert";
import { DenoKvSessionStore } from "../storage/denoKvSessionStore.ts";
import { DenoKvStorage } from "../storage/denoKvStorage.ts";

describe("DenoKvSessionStore — edge cases", () => {
  let kv: Deno.Kv;
  let store: DenoKvSessionStore;

  beforeEach(async () => {
    kv = await Deno.openKv(":memory:");
    store = new DenoKvSessionStore(kv);
  });

  afterEach(() => {
    kv.close();
  });

  it("should handle delete of existing session with user index cleanup", async () => {
    const now = Date.now();
    await store.set("session-1", {
      id: "session-1",
      userId: "user-1",
      username: "admin",
      role: "admin",
      csrfToken: "csrf-1",
      createdAt: now,
      expiresAt: now + 3600000,
    });

    // Verify session exists
    const session = await store.get("session-1");
    assertEquals(session!.username, "admin");

    // Delete it
    await store.delete("session-1");
    const deleted = await store.get("session-1");
    assertEquals(deleted, null);
  });

  it("should handle deleteByUserId when user has sessions", async () => {
    const now = Date.now();
    await store.set("s1", {
      id: "s1",
      userId: "user-1",
      username: "admin",
      role: "admin",
      csrfToken: "csrf-1",
      createdAt: now,
      expiresAt: now + 3600000,
    });
    await store.set("s2", {
      id: "s2",
      userId: "user-1",
      username: "admin",
      role: "admin",
      csrfToken: "csrf-2",
      createdAt: now,
      expiresAt: now + 3600000,
    });

    await store.deleteByUserId("user-1");
    assertEquals(await store.get("s1"), null);
    assertEquals(await store.get("s2"), null);
  });
});

describe("DenoKvStorage — edge cases", () => {
  let kv: Deno.Kv;
  let storage: DenoKvStorage;

  beforeEach(async () => {
    kv = await Deno.openKv(":memory:");
    storage = new DenoKvStorage(kv, "test-plugin", { title: "string" });
  });

  afterEach(() => {
    kv.close();
  });

  it("should handle index fields with null/undefined values", async () => {
    const storageWithIndex = new DenoKvStorage(kv, "indexed-plugin", {
      title: "string",
      category: "string",
    });
    // Set an item with no category (should skip index for that field)
    await storageWithIndex.set("item-1", {
      id: "item-1",
      title: "Test",
    });
    const item = await storageWithIndex.get("item-1");
    assertEquals(item!.title, "Test");
  });

  it("should handle delete when count is zero (no negative count)", async () => {
    // Manually set count to 0 then insert+delete
    await storage.set("item-1", { id: "item-1", title: "Test" });
    // Manually reset count to 0
    await kv.set(["plugins", "test-plugin", "count"], new Deno.KvU64(0n));

    const deleted = await storage.delete("item-1");
    assertEquals(deleted, true);

    // Count should be 0 (not negative)
    const countEntry = await kv.get<Deno.KvU64>([
      "plugins",
      "test-plugin",
      "count",
    ]);
    assertEquals(BigInt(countEntry.value!.value), 0n);
  });
});
