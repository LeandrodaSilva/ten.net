import { afterEach, beforeEach, describe, it } from "@std/testing/bdd";
import { assertEquals, assertExists } from "@std/assert";
import { DenoKvSessionStore } from "../../packages/admin/src/storage/denoKvSessionStore.ts";
import type { Session } from "../../packages/admin/src/auth/types.ts";

function makeSession(overrides?: Partial<Session>): Session {
  return {
    id: "sess-1",
    userId: "user-1",
    username: "admin",
    role: "admin",
    csrfToken: "csrf-token",
    createdAt: Date.now(),
    expiresAt: Date.now() + 3600_000, // 1 hour
    ...overrides,
  };
}

describe("DenoKvSessionStore", () => {
  let kv: Deno.Kv;
  let store: DenoKvSessionStore;

  beforeEach(async () => {
    kv = await Deno.openKv(":memory:");
    store = new DenoKvSessionStore(kv);
  });

  afterEach(() => {
    kv.close();
  });

  describe("get()", () => {
    it("should return null for non-existent session", async () => {
      const result = await store.get("nonexistent");
      assertEquals(result, null);
    });

    it("should return session after set", async () => {
      const session = makeSession();
      await store.set(session.id, session);
      const result = await store.get(session.id);
      assertExists(result);
      assertEquals(result!.id, session.id);
      assertEquals(result!.username, "admin");
    });
  });

  describe("set()", () => {
    it("should store session with TTL", async () => {
      const session = makeSession({ expiresAt: Date.now() + 1000 });
      await store.set(session.id, session);
      const result = await store.get(session.id);
      assertExists(result);
    });

    it("should return null for expired session (defense-in-depth)", async () => {
      // expireIn would be <= 0, so no KV TTL is set
      const session = makeSession({ expiresAt: Date.now() - 1000 });
      await store.set(session.id, session);
      // Double-check in get() catches expired session and deletes it
      const result = await store.get(session.id);
      assertEquals(result, null);
    });
  });

  describe("delete()", () => {
    it("should delete an existing session", async () => {
      const session = makeSession();
      await store.set(session.id, session);
      assertEquals((await store.get(session.id))?.id, session.id);

      await store.delete(session.id);
      assertEquals(await store.get(session.id), null);
    });

    it("should not throw when deleting non-existent session", async () => {
      await store.delete("nonexistent");
      assertEquals(await store.get("nonexistent"), null);
    });
  });

  describe("deleteByUserId()", () => {
    it("should delete all sessions for a user", async () => {
      const s1 = makeSession({ id: "sess-1", userId: "user-1" });
      const s2 = makeSession({ id: "sess-2", userId: "user-1" });
      const s3 = makeSession({ id: "sess-3", userId: "user-2" });

      await store.set(s1.id, s1);
      await store.set(s2.id, s2);
      await store.set(s3.id, s3);

      await store.deleteByUserId("user-1");

      assertEquals(await store.get("sess-1"), null);
      assertEquals(await store.get("sess-2"), null);
      // user-2 session should remain
      assertExists(await store.get("sess-3"));
    });

    it("should not throw when user has no sessions", async () => {
      await store.deleteByUserId("no-sessions-user");
    });
  });

  describe("user index", () => {
    it("should clean up user index on delete", async () => {
      const session = makeSession();
      await store.set(session.id, session);
      await store.delete(session.id);

      // After deleteByUserId, nothing should be found
      await store.deleteByUserId("user-1");
      assertEquals(await store.get(session.id), null);
    });
  });
});
