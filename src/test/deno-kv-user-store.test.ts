import { afterEach, beforeEach, describe, it } from "@std/testing/bdd";
import { assertEquals, assertNotEquals } from "@std/assert";
import { DenoKvUserStore } from "../storage/denoKvUserStore.ts";
import { seedDefaultAdmin } from "../auth/userStore.ts";
import type { User } from "../auth/types.ts";

describe("DenoKvUserStore", () => {
  let kv: Deno.Kv;
  let store: DenoKvUserStore;

  beforeEach(async () => {
    kv = await Deno.openKv(":memory:");
    store = new DenoKvUserStore(kv);
  });

  afterEach(() => {
    kv.close();
  });

  it("get() returns null for non-existent user", async () => {
    const result = await store.get("nonexistent");
    assertEquals(result, null);
  });

  it("set() and get() roundtrip", async () => {
    const user: User = {
      id: "test-id",
      username: "testuser",
      passwordHash: "hash123",
      salt: "salt123",
      role: "admin",
      createdAt: Date.now(),
    };

    await store.set("testuser", user);
    const retrieved = await store.get("testuser");

    assertEquals(retrieved, user);
  });

  it("delete() removes user", async () => {
    const user: User = {
      id: "del-id",
      username: "deluser",
      passwordHash: "hash",
      salt: "salt",
      role: "editor",
      createdAt: Date.now(),
    };

    await store.set("deluser", user);
    assertEquals((await store.get("deluser"))?.username, "deluser");

    await store.delete("deluser");
    assertEquals(await store.get("deluser"), null);
  });

  it("seedDefaultAdmin creates admin user", async () => {
    await seedDefaultAdmin(store);
    const admin = await store.get("admin");

    assertNotEquals(admin, null);
    assertEquals(admin!.username, "admin");
    assertEquals(admin!.role, "admin");
  });

  it("seedDefaultAdmin does not overwrite existing admin", async () => {
    await seedDefaultAdmin(store);
    const firstAdmin = await store.get("admin");
    const originalId = firstAdmin!.id;

    await seedDefaultAdmin(store);
    const secondAdmin = await store.get("admin");

    assertEquals(secondAdmin!.id, originalId);
  });
});
