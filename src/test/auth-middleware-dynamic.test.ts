import { afterEach, beforeEach, describe, it } from "@std/testing/bdd";
import { assertEquals } from "@std/assert";
import { authMiddleware } from "../auth/authMiddleware.ts";
import { InMemorySessionStore } from "../auth/sessionStore.ts";
import type { Session } from "../auth/types.ts";

/** Wrap a sync Response-returning callback so it satisfies () => Promise<Response>. */
function promiseNext(
  fn: () => Response,
): () => Promise<Response> {
  return () => Promise.resolve(fn());
}

describe("authMiddleware — dynamic KV permissions", () => {
  let kv: Deno.Kv;
  const sessionStore = new InMemorySessionStore();

  async function seedSession(overrides?: Partial<Session>): Promise<Session> {
    const session: Session = {
      id: "test-sess",
      userId: "user-1",
      username: "admin",
      role: "admin",
      csrfToken: "csrf-token",
      createdAt: Date.now(),
      expiresAt: Date.now() + 3600_000,
      ...overrides,
    };
    await sessionStore.set(session.id, session);
    return session;
  }

  beforeEach(async () => {
    kv = await Deno.openKv(":memory:");
  });

  afterEach(async () => {
    kv.close();
    await sessionStore.deleteByUserId("user-1");
    await sessionStore.deleteByUserId("custom-user");
  });

  it("should use KV permissions when available", async () => {
    // Set KV permission: custom-role has read on posts
    await kv.set(["permissions", "custom-role", "posts"], ["read"]);

    const session = await seedSession({
      id: "kv-sess",
      userId: "custom-user",
      role: "custom-role",
    });
    const auth = authMiddleware(sessionStore, undefined, kv);
    const req = new Request("http://localhost/admin/plugins/post-plugin", {
      method: "GET",
      headers: { cookie: `__tennet_sid=${session.id}` },
    });
    let called = false;
    const next = promiseNext(() => {
      called = true;
      return new Response("OK", { status: 200 });
    });
    const res = await auth(req, next);
    assertEquals(called, true);
    assertEquals(res.status, 200);
  });

  it("should deny when KV permissions don't include the action", async () => {
    // Set KV permission: custom-role has only read on posts
    await kv.set(["permissions", "custom-role", "posts"], ["read"]);

    const session = await seedSession({
      id: "kv-deny-sess",
      userId: "custom-user",
      role: "custom-role",
    });
    const auth = authMiddleware(sessionStore, undefined, kv);
    const req = new Request("http://localhost/admin/plugins/post-plugin", {
      method: "POST",
      headers: { cookie: `__tennet_sid=${session.id}` },
    });
    const next = promiseNext(() => new Response("OK", { status: 200 }));
    const res = await auth(req, next);
    assertEquals(res.status, 403);
  });

  it("should fallback to hardcoded when KV has no data", async () => {
    // admin has all permissions on posts in ROLE_PERMISSIONS
    const session = await seedSession({
      id: "fallback-sess",
      role: "admin",
    });
    const auth = authMiddleware(sessionStore, undefined, kv);
    const req = new Request("http://localhost/admin/plugins/post-plugin", {
      method: "POST",
      headers: { cookie: `__tennet_sid=${session.id}` },
    });
    let called = false;
    const next = promiseNext(() => {
      called = true;
      return new Response("OK", { status: 200 });
    });
    const res = await auth(req, next);
    assertEquals(called, true);
    assertEquals(res.status, 200);
  });

  it("should work without KV (null) — backward compatible", async () => {
    const session = await seedSession({
      id: "no-kv-sess",
      role: "admin",
    });
    const auth = authMiddleware(sessionStore, undefined, null);
    const req = new Request("http://localhost/admin/plugins/post-plugin", {
      method: "GET",
      headers: { cookie: `__tennet_sid=${session.id}` },
    });
    let called = false;
    const next = promiseNext(() => {
      called = true;
      return new Response("OK", { status: 200 });
    });
    const res = await auth(req, next);
    assertEquals(called, true);
    assertEquals(res.status, 200);
  });

  it("should support custom role strings", async () => {
    // Set KV: content-manager can create pages
    await kv.set(["permissions", "content-manager", "pages"], [
      "read",
      "create",
    ]);

    const session = await seedSession({
      id: "custom-role-sess",
      userId: "custom-user",
      role: "content-manager",
    });
    const auth = authMiddleware(sessionStore, undefined, kv);
    const req = new Request("http://localhost/admin/plugins/page-plugin", {
      method: "POST",
      headers: { cookie: `__tennet_sid=${session.id}` },
    });
    let called = false;
    const next = promiseNext(() => {
      called = true;
      return new Response("OK", { status: 200 });
    });
    const res = await auth(req, next);
    assertEquals(called, true);
    assertEquals(res.status, 200);
  });

  it("should use dynamic plugin slug as resource for unknown plugins", async () => {
    // Set KV: admin can read role-plugin
    await kv.set(["permissions", "admin", "role-plugin"], ["read"]);

    const session = await seedSession({
      id: "dynamic-slug-sess",
      role: "admin",
    });
    const auth = authMiddleware(sessionStore, undefined, kv);
    const req = new Request("http://localhost/admin/plugins/role-plugin", {
      method: "GET",
      headers: { cookie: `__tennet_sid=${session.id}` },
    });
    let called = false;
    const next = promiseNext(() => {
      called = true;
      return new Response("OK", { status: 200 });
    });
    const res = await auth(req, next);
    assertEquals(called, true);
    assertEquals(res.status, 200);
  });

  it("should deny custom role with no KV and no hardcoded entry", async () => {
    const session = await seedSession({
      id: "unknown-role-sess",
      userId: "custom-user",
      role: "completely-unknown",
    });
    // No KV data, no hardcoded entry for "completely-unknown"
    const auth = authMiddleware(sessionStore, undefined, kv);
    const req = new Request("http://localhost/admin/plugins/post-plugin", {
      method: "GET",
      headers: { cookie: `__tennet_sid=${session.id}` },
    });
    const next = promiseNext(() => new Response("OK", { status: 200 }));
    const res = await auth(req, next);
    assertEquals(res.status, 403);
  });
});
