import { describe, it } from "@std/testing/bdd";
import { assertEquals, assertExists, assertNotEquals } from "@std/assert";
import {
  createPasswordHash,
  generateSalt,
  hashPassword,
  verifyPassword,
} from "../../packages/admin/src/auth/passwordHasher.ts";
import { InMemorySessionStore } from "../../packages/admin/src/auth/sessionStore.ts";
import type { Session } from "../../packages/admin/src/auth/types.ts";

function makeSession(overrides?: Partial<Session>): Session {
  return {
    id: "sess-1",
    userId: "user-1",
    username: "admin",
    role: "admin",
    csrfToken: "token-abc",
    createdAt: Date.now(),
    expiresAt: Date.now() + 3600_000,
    ...overrides,
  };
}

describe("generateSalt", () => {
  it("should return a Uint8Array of 16 bytes", () => {
    const salt = generateSalt();
    assertEquals(salt instanceof Uint8Array, true);
    assertEquals(salt.length, 16);
  });

  it("should return different values each call", () => {
    const a = generateSalt();
    const b = generateSalt();
    // Technically could collide but astronomically unlikely
    assertNotEquals(Array.from(a).join(","), Array.from(b).join(","));
  });
});

describe("hashPassword", () => {
  it("should produce a 32-byte output", async () => {
    const salt = generateSalt();
    const hash = await hashPassword("password", salt);
    assertEquals(hash instanceof Uint8Array, true);
    assertEquals(hash.length, 32);
  });

  it("should produce consistent output for same inputs", async () => {
    const salt = generateSalt();
    const hash1 = await hashPassword("mysecret", salt, 1000);
    const hash2 = await hashPassword("mysecret", salt, 1000);
    assertEquals(Array.from(hash1).join(","), Array.from(hash2).join(","));
  });

  it("should produce different output for different passwords", async () => {
    const salt = generateSalt();
    const hash1 = await hashPassword("password1", salt, 1000);
    const hash2 = await hashPassword("password2", salt, 1000);
    assertNotEquals(
      Array.from(hash1).join(","),
      Array.from(hash2).join(","),
    );
  });

  it("should produce different output for different salts", async () => {
    const salt1 = generateSalt();
    const salt2 = generateSalt();
    const hash1 = await hashPassword("same", salt1, 1000);
    const hash2 = await hashPassword("same", salt2, 1000);
    assertNotEquals(
      Array.from(hash1).join(","),
      Array.from(hash2).join(","),
    );
  });
});

describe("verifyPassword", () => {
  it("should return true for correct password", async () => {
    const { hash, salt } = await createPasswordHash("correctpassword", 1000);
    const result = await verifyPassword("correctpassword", hash, salt, 1000);
    assertEquals(result, true);
  });

  it("should return false for wrong password", async () => {
    const { hash, salt } = await createPasswordHash("correctpassword", 1000);
    const result = await verifyPassword("wrongpassword", hash, salt, 1000);
    assertEquals(result, false);
  });

  it("should return false for empty string password", async () => {
    const { hash, salt } = await createPasswordHash("somepassword", 1000);
    const result = await verifyPassword("", hash, salt, 1000);
    assertEquals(result, false);
  });
});

describe("createPasswordHash", () => {
  it("should return an object with hash and salt", async () => {
    const result = await createPasswordHash("mypassword", 1000);
    assertExists(result.hash);
    assertExists(result.salt);
    assertEquals(typeof result.hash, "string");
    assertEquals(typeof result.salt, "string");
  });

  it("should return a non-empty base64 hash", async () => {
    const { hash } = await createPasswordHash("password", 1000);
    assertEquals(hash.length > 0, true);
  });

  it("should return a non-empty base64 salt", async () => {
    const { salt } = await createPasswordHash("password", 1000);
    assertEquals(salt.length > 0, true);
  });

  it("should produce different hashes for same password on each call", async () => {
    const r1 = await createPasswordHash("same", 1000);
    const r2 = await createPasswordHash("same", 1000);
    // Salts differ → hashes differ
    assertNotEquals(r1.salt, r2.salt);
    assertNotEquals(r1.hash, r2.hash);
  });
});

describe("InMemorySessionStore", () => {
  it("should return null for non-existent session", async () => {
    const store = new InMemorySessionStore();
    const result = await store.get("non-existent");
    assertEquals(result, null);
  });

  it("should set and get a session (roundtrip)", async () => {
    const store = new InMemorySessionStore();
    const session = makeSession({ id: "sess-1" });
    await store.set("sess-1", session);
    const result = await store.get("sess-1");
    assertExists(result);
    assertEquals(result.id, "sess-1");
    assertEquals(result.username, "admin");
  });

  it("should delete a session", async () => {
    const store = new InMemorySessionStore();
    const session = makeSession({ id: "sess-del" });
    await store.set("sess-del", session);
    await store.delete("sess-del");
    const result = await store.get("sess-del");
    assertEquals(result, null);
  });

  it("should delete silently when session does not exist", async () => {
    const store = new InMemorySessionStore();
    // Should not throw
    await store.delete("ghost");
    assertEquals(true, true);
  });

  it("should deleteByUserId remove all sessions for that user", async () => {
    const store = new InMemorySessionStore();
    await store.set("s1", makeSession({ id: "s1", userId: "u1" }));
    await store.set("s2", makeSession({ id: "s2", userId: "u1" }));
    await store.set("s3", makeSession({ id: "s3", userId: "u2" }));
    await store.deleteByUserId("u1");
    assertEquals(await store.get("s1"), null);
    assertEquals(await store.get("s2"), null);
    assertExists(await store.get("s3"));
  });

  it("should return null for an expired session and remove it", async () => {
    const store = new InMemorySessionStore();
    const expiredSession = makeSession({
      id: "sess-expired",
      expiresAt: Date.now() - 1000,
    });
    await store.set("sess-expired", expiredSession);
    const result = await store.get("sess-expired");
    assertEquals(result, null);
  });

  it("should return valid session that has not expired", async () => {
    const store = new InMemorySessionStore();
    const validSession = makeSession({
      id: "sess-valid",
      expiresAt: Date.now() + 3600_000,
    });
    await store.set("sess-valid", validSession);
    const result = await store.get("sess-valid");
    assertExists(result);
    assertEquals(result.id, "sess-valid");
  });
});
