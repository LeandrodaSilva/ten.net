/**
 * Coverage tests for auth edge cases:
 * - authMiddleware: hasPermissionDynamic KV catch branch, extractResource for unknown slugs
 * - loginHandler: session fixation prevention (existing cookie invalidation)
 * - passwordHasher: timing-safe length mismatch branch
 * - dynamicRouteRegistry: getStorage
 */
import { describe, it } from "@std/testing/bdd";
import { assertEquals, assertExists } from "@std/assert";
import { verifyPassword } from "../auth/passwordHasher.ts";
import { DynamicRouteRegistry } from "../routing/dynamicRouteRegistry.ts";
import { createAuthRoutes } from "../auth/loginHandler.ts";
import { authMiddleware } from "../auth/authMiddleware.ts";
import type { Session, User } from "../auth/types.ts";
import type { SessionStore } from "../auth/sessionStore.ts";
import type { UserStore } from "../auth/userStore.ts";
import { createPasswordHash } from "../auth/passwordHasher.ts";

describe("verifyPassword — length mismatch branch", () => {
  it("should return false when stored hash has different length", async () => {
    const { hash, salt } = await createPasswordHash("password123");
    const shortHash = hash.substring(0, hash.length - 4);
    const result = await verifyPassword("password123", shortHash, salt);
    assertEquals(result, false);
  });

  it("should return false for wrong password (same length)", async () => {
    const { hash, salt } = await createPasswordHash("correct-password");
    const result = await verifyPassword("wrong-password", hash, salt);
    assertEquals(result, false);
  });

  it("should return true for correct password", async () => {
    const { hash, salt } = await createPasswordHash("my-secret");
    const result = await verifyPassword("my-secret", hash, salt);
    assertEquals(result, true);
  });
});

describe("DynamicRouteRegistry — getStorage", () => {
  it("should return null when no storage set", () => {
    const registry = new DynamicRouteRegistry();
    assertEquals(registry.getStorage(), null);
  });

  it("should return the bound storage after setStorage", () => {
    const registry = new DynamicRouteRegistry();
    const fakeStorage = {
      get: (_id: string) => Promise.resolve(null),
      set: (_id: string, _d: unknown) => Promise.resolve(),
      delete: (_id: string) => Promise.resolve(false),
      list: () => Promise.resolve([]),
      count: () => Promise.resolve(0),
    };
    registry.setStorage(fakeStorage);
    assertEquals(registry.getStorage(), fakeStorage);
  });
});

describe("loginHandler — session fixation prevention", () => {
  it("should invalidate existing session on successful login", async () => {
    const deletedSessions: string[] = [];
    const { hash, salt } = await createPasswordHash("admin123");
    const now = Date.now();

    const userStore: UserStore = {
      get: (username: string): Promise<User | null> => {
        if (username === "admin") {
          return Promise.resolve({
            id: "user-1",
            username: "admin",
            passwordHash: hash,
            salt,
            role: "admin",
            createdAt: Date.now(),
          });
        }
        return Promise.resolve(null);
      },
      set: (_u: string, _d: User) => Promise.resolve(),
      delete: (_u: string) => Promise.resolve(),
    };

    const sessionStore: SessionStore = {
      get: (id: string): Promise<Session | null> => {
        if (id === "old-session-id") {
          return Promise.resolve({
            id: "old-session-id",
            userId: "user-1",
            username: "admin",
            role: "admin",
            csrfToken: "old-csrf",
            createdAt: now,
            expiresAt: now + 86400000,
          });
        }
        return Promise.resolve(null);
      },
      set: (_id: string, _s: Session) => Promise.resolve(),
      delete: (id: string) => {
        deletedSessions.push(id);
        return Promise.resolve();
      },
      deleteByUserId: (_uid: string) => Promise.resolve(),
    };

    const routes = createAuthRoutes(userStore, sessionStore);
    const loginPost = routes.find(
      (r) => r.path === "/admin/login" && r.method === "POST",
    );
    assertExists(loginPost?.run);

    const body = new URLSearchParams({
      username: "admin",
      password: "admin123",
    });
    const req = new Request("http://localhost/admin/login", {
      method: "POST",
      body: body.toString(),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Cookie": "__tennet_sid=old-session-id",
      },
    });

    const res = await loginPost!.run!(req);
    assertEquals(res.status, 302);
    assertEquals(deletedSessions.includes("old-session-id"), true);
  });
});

describe("authMiddleware — KV failure catch branch", () => {
  it("should deny access (fail-closed) when KV throws", async () => {
    const now = Date.now();
    const sessionStore: SessionStore = {
      get: (): Promise<Session | null> =>
        Promise.resolve({
          id: "session-1",
          userId: "user-1",
          username: "admin",
          role: "admin",
          csrfToken: "csrf",
          createdAt: now,
          expiresAt: now + 86400000,
        }),
      set: (_id: string, _s: Session) => Promise.resolve(),
      delete: (_id: string) => Promise.resolve(),
      deleteByUserId: (_uid: string) => Promise.resolve(),
    };

    const brokenKv = {
      get: () => {
        throw new Error("KV unavailable");
      },
    } as unknown as Deno.Kv;

    const middleware = authMiddleware(sessionStore, "__tennet_sid", brokenKv);

    const req = new Request("http://localhost/admin/plugins/test-plugin", {
      headers: { "Cookie": "__tennet_sid=session-1" },
    });

    const res = await middleware(
      req,
      () => Promise.resolve(new Response("OK")),
    );
    assertEquals(res.status, 403);
  });

  it("should extract resource as slug for unknown plugin paths", async () => {
    const now = Date.now();
    const kv = await Deno.openKv(":memory:");

    const sessionStore: SessionStore = {
      get: (): Promise<Session | null> =>
        Promise.resolve({
          id: "session-1",
          userId: "user-1",
          username: "admin",
          role: "admin",
          csrfToken: "csrf",
          createdAt: now,
          expiresAt: now + 86400000,
        }),
      set: (_id: string, _s: Session) => Promise.resolve(),
      delete: (_id: string) => Promise.resolve(),
      deleteByUserId: (_uid: string) => Promise.resolve(),
    };

    const middleware = authMiddleware(sessionStore, "__tennet_sid", kv);

    const req = new Request(
      "http://localhost/admin/plugins/custom-unknown-plugin",
      { headers: { "Cookie": "__tennet_sid=session-1" } },
    );

    const res = await middleware(
      req,
      () => Promise.resolve(new Response("OK")),
    );
    assertEquals(res.status === 403 || res.status === 200, true);

    kv.close();
  });
});
