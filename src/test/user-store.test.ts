import { describe, it } from "@std/testing/bdd";
import { assertEquals, assertExists, assertNotEquals } from "@std/assert";
import {
  InMemoryUserStore,
  seedDefaultAdmin,
} from "../../packages/admin/src/auth/userStore.ts";
import { verifyPassword } from "../../packages/admin/src/auth/passwordHasher.ts";

describe("InMemoryUserStore", () => {
  it("should return null for non-existent user", async () => {
    const store = new InMemoryUserStore();
    const result = await store.get("nobody");
    assertEquals(result, null);
  });

  it("should set and get a user (roundtrip)", async () => {
    const store = new InMemoryUserStore();
    const user = {
      id: "u-1",
      username: "alice",
      passwordHash: "hash",
      salt: "salt",
      role: "editor" as const,
      createdAt: Date.now(),
    };
    await store.set("alice", user);
    const result = await store.get("alice");
    assertExists(result);
    assertEquals(result.id, "u-1");
    assertEquals(result.username, "alice");
    assertEquals(result.role, "editor");
  });

  it("should delete a user", async () => {
    const store = new InMemoryUserStore();
    const user = {
      id: "u-del",
      username: "bob",
      passwordHash: "hash",
      salt: "salt",
      role: "viewer" as const,
      createdAt: Date.now(),
    };
    await store.set("bob", user);
    await store.delete("bob");
    const result = await store.get("bob");
    assertEquals(result, null);
  });
});

describe("seedDefaultAdmin", () => {
  it("should create an admin user with username 'admin'", async () => {
    const store = new InMemoryUserStore();
    await seedDefaultAdmin(store);
    const admin = await store.get("admin");
    assertExists(admin);
    assertEquals(admin.username, "admin");
    assertEquals(admin.role, "admin");
  });

  it("should be idempotent — calling twice does not overwrite", async () => {
    const store = new InMemoryUserStore();
    await seedDefaultAdmin(store);
    const first = await store.get("admin");
    assertExists(first);
    const originalId = first.id;

    await seedDefaultAdmin(store);
    const second = await store.get("admin");
    assertExists(second);
    assertEquals(second.id, originalId);
  });

  it("should seed a password that verifies as 'admin'", async () => {
    const store = new InMemoryUserStore();
    await seedDefaultAdmin(store);
    const admin = await store.get("admin");
    assertExists(admin);
    assertNotEquals(admin.passwordHash, "");
    assertNotEquals(admin.salt, "");
    const valid = await verifyPassword(
      "admin",
      admin.passwordHash,
      admin.salt,
    );
    assertEquals(valid, true);
  });
});
