import { afterEach, describe, it } from "@std/testing/bdd";
import { assertEquals } from "@std/assert";
import {
  authMiddleware,
  parseCookie,
  requestSession,
} from "../auth/authMiddleware.ts";
import { InMemorySessionStore } from "../auth/sessionStore.ts";
import { csrfMiddleware } from "../auth/csrfMiddleware.ts";
import { securityHeadersMiddleware } from "../auth/securityHeaders.ts";
import type { Session } from "../auth/types.ts";

/** Shared session store for auth middleware tests. */
const sessionStore = new InMemorySessionStore();

/** Wrap a sync Response-returning callback so it satisfies () => Promise<Response>. */
function promiseNext(
  fn: () => Response,
): () => Promise<Response> {
  return () => Promise.resolve(fn());
}

// Helper: create a fresh session in the store
async function seedSession(overrides?: Partial<Session>): Promise<Session> {
  const session: Session = {
    id: "test-sess-id",
    userId: "user-1",
    username: "admin",
    role: "admin",
    csrfToken: "csrf-test-token",
    createdAt: Date.now(),
    expiresAt: Date.now() + 3600_000,
    ...overrides,
  };
  await sessionStore.set(session.id, session);
  return session;
}

// Cleanup sessions after each test to avoid cross-test pollution
afterEach(async () => {
  await sessionStore.deleteByUserId("user-1");
  await sessionStore.deleteByUserId("user-2");
  await sessionStore.deleteByUserId("viewer-user");
  await sessionStore.deleteByUserId("editor-user");
});

// --- parseCookie ---
describe("parseCookie", () => {
  it("should parse a single cookie", () => {
    assertEquals(parseCookie("session=abc123", "session"), "abc123");
  });

  it("should parse a cookie among multiple cookies", () => {
    assertEquals(
      parseCookie("foo=bar; session=abc; baz=qux", "session"),
      "abc",
    );
  });

  it("should return undefined when cookie is not found", () => {
    assertEquals(parseCookie("foo=bar; baz=qux", "session"), undefined);
  });

  it("should return undefined for empty header", () => {
    assertEquals(parseCookie("", "session"), undefined);
  });
});

// --- Auth Middleware ---
describe("authMiddleware — bypass", () => {
  const auth = authMiddleware(sessionStore);

  it("should pass through non-admin routes without auth", async () => {
    const req = new Request("http://localhost/about");
    let called = false;
    const next = promiseNext(() => {
      called = true;
      return new Response("OK", { status: 200 });
    });
    const res = await auth(req, next);
    assertEquals(called, true);
    assertEquals(res.status, 200);
  });

  it("should pass through /admin/login without auth", async () => {
    const req = new Request("http://localhost/admin/login");
    let called = false;
    const next = promiseNext(() => {
      called = true;
      return new Response("Login page", { status: 200 });
    });
    const res = await auth(req, next);
    assertEquals(called, true);
    assertEquals(res.status, 200);
  });

  it("should pass through /admin/favicon.ico without auth", async () => {
    const req = new Request("http://localhost/admin/favicon.ico");
    let called = false;
    const next = promiseNext(() => {
      called = true;
      return new Response("ico", { status: 200 });
    });
    const res = await auth(req, next);
    assertEquals(called, true);
    assertEquals(res.status, 200);
  });
});

describe("authMiddleware — redirect to login", () => {
  const auth = authMiddleware(sessionStore);
  const next = promiseNext(() => new Response("Admin", { status: 200 }));

  it("should redirect /admin to /admin/login when no cookie", async () => {
    const req = new Request("http://localhost/admin");
    const res = await auth(req, next);
    assertEquals(res.status, 302);
    assertEquals(res.headers.get("Location"), "/admin/login");
  });

  it("should redirect when session cookie present but session invalid", async () => {
    const req = new Request("http://localhost/admin", {
      headers: { cookie: "__tennet_sid=invalid-session-id" },
    });
    const res = await auth(req, next);
    assertEquals(res.status, 302);
    assertEquals(res.headers.get("Location"), "/admin/login");
  });
});

describe("authMiddleware — valid session passes through", () => {
  const auth = authMiddleware(sessionStore);

  it("should allow /admin with valid session", async () => {
    const session = await seedSession({
      id: "valid-sess",
      role: "admin",
    });
    const req = new Request("http://localhost/admin", {
      headers: { cookie: `__tennet_sid=${session.id}` },
    });
    let called = false;
    const next = promiseNext(() => {
      called = true;
      return new Response("Admin", { status: 200 });
    });
    const res = await auth(req, next);
    assertEquals(called, true);
    assertEquals(res.status, 200);
    await sessionStore.delete("valid-sess");
  });

  it("should attach session to request via requestSession WeakMap", async () => {
    const session = await seedSession({
      id: "attach-sess",
      role: "admin",
    });
    const req = new Request("http://localhost/admin", {
      headers: { cookie: `__tennet_sid=${session.id}` },
    });
    const next = promiseNext(() => new Response("OK", { status: 200 }));
    await authMiddleware(sessionStore)(req, next);
    const attached = requestSession.get(req);
    assertEquals(attached?.id, "attach-sess");
    await sessionStore.delete("attach-sess");
  });
});

describe("authMiddleware — RBAC", () => {
  it("should return 403 when viewer tries to POST (create permission)", async () => {
    const session = await seedSession({
      id: "viewer-sess",
      userId: "viewer-user",
      role: "viewer",
    });
    const auth = authMiddleware(sessionStore);
    const req = new Request("http://localhost/admin/plugins/post-plugin", {
      method: "POST",
      headers: { cookie: `__tennet_sid=${session.id}` },
    });
    const next = promiseNext(() => new Response("OK", { status: 200 }));
    const res = await auth(req, next);
    assertEquals(res.status, 403);
    await sessionStore.delete("viewer-sess");
  });

  it("should return 403 when editor accesses /admin/plugins/user-plugin", async () => {
    const session = await seedSession({
      id: "editor-sess",
      userId: "editor-user",
      role: "editor",
    });
    const auth = authMiddleware(sessionStore);
    const req = new Request(
      "http://localhost/admin/plugins/user-plugin",
      {
        method: "GET",
        headers: { cookie: `__tennet_sid=${session.id}` },
      },
    );
    const next = promiseNext(() => new Response("OK", { status: 200 }));
    const res = await auth(req, next);
    assertEquals(res.status, 403);
    await sessionStore.delete("editor-sess");
  });

  it("should allow admin to GET /admin/plugins/user-plugin", async () => {
    const session = await seedSession({
      id: "admin-user-sess",
      userId: "user-2",
      role: "admin",
    });
    const auth = authMiddleware(sessionStore);
    const req = new Request(
      "http://localhost/admin/plugins/user-plugin",
      {
        method: "GET",
        headers: { cookie: `__tennet_sid=${session.id}` },
      },
    );
    let called = false;
    const next = promiseNext(() => {
      called = true;
      return new Response("OK", { status: 200 });
    });
    const res = await auth(req, next);
    assertEquals(called, true);
    assertEquals(res.status, 200);
    await sessionStore.delete("admin-user-sess");
  });

  it("should allow viewer to GET /admin (dashboard read)", async () => {
    const session = await seedSession({
      id: "viewer-dashboard",
      userId: "viewer-user",
      role: "viewer",
    });
    const auth = authMiddleware(sessionStore);
    const req = new Request("http://localhost/admin", {
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
    await sessionStore.delete("viewer-dashboard");
  });
});

// --- CSRF Middleware ---
describe("csrfMiddleware", () => {
  it("should pass GET requests through without CSRF check", async () => {
    const req = new Request("http://localhost/admin/plugins/post-plugin", {
      method: "GET",
    });
    let called = false;
    const next = promiseNext(() => {
      called = true;
      return new Response("OK", { status: 200 });
    });
    const res = await csrfMiddleware(req, next);
    assertEquals(called, true);
    assertEquals(res.status, 200);
  });

  it("should pass HEAD requests through without CSRF check", async () => {
    const req = new Request("http://localhost/admin/plugins/post-plugin", {
      method: "HEAD",
    });
    let called = false;
    const next = promiseNext(() => {
      called = true;
      return new Response("", { status: 200 });
    });
    const res = await csrfMiddleware(req, next);
    assertEquals(called, true);
    assertEquals(res.status, 200);
  });

  it("should pass OPTIONS requests through without CSRF check", async () => {
    const req = new Request("http://localhost/admin/plugins/post-plugin", {
      method: "OPTIONS",
    });
    let called = false;
    const next = promiseNext(() => {
      called = true;
      return new Response("", { status: 200 });
    });
    const res = await csrfMiddleware(req, next);
    assertEquals(called, true);
    assertEquals(res.status, 200);
  });

  it("should pass POST to non-admin route through without CSRF check", async () => {
    const req = new Request("http://localhost/contact", {
      method: "POST",
    });
    let called = false;
    const next = promiseNext(() => {
      called = true;
      return new Response("OK", { status: 200 });
    });
    const res = await csrfMiddleware(req, next);
    assertEquals(called, true);
    assertEquals(res.status, 200);
  });

  it("should pass POST to /admin/login through without CSRF check", async () => {
    const req = new Request("http://localhost/admin/login", {
      method: "POST",
    });
    let called = false;
    const next = promiseNext(() => {
      called = true;
      return new Response("OK", { status: 200 });
    });
    const res = await csrfMiddleware(req, next);
    assertEquals(called, true);
    assertEquals(res.status, 200);
  });

  it("should return 401 when no session is attached to POST /admin", async () => {
    const req = new Request("http://localhost/admin/plugins/post-plugin", {
      method: "POST",
      body: new URLSearchParams({ title: "test" }),
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    const next = promiseNext(() => new Response("OK", { status: 200 }));
    const res = await csrfMiddleware(req, next);
    assertEquals(res.status, 401);
  });

  it("should return 403 when _csrf token is missing from form", async () => {
    const session: Session = {
      id: "csrf-sess",
      userId: "u1",
      username: "admin",
      role: "admin",
      csrfToken: "expected-token",
      createdAt: Date.now(),
      expiresAt: Date.now() + 3600_000,
    };
    const req = new Request("http://localhost/admin/plugins/post-plugin", {
      method: "POST",
      body: new URLSearchParams({ title: "test" }),
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    requestSession.set(req, session);
    const next = promiseNext(() => new Response("OK", { status: 200 }));
    const res = await csrfMiddleware(req, next);
    assertEquals(res.status, 403);
  });

  it("should return 403 when _csrf token is wrong", async () => {
    const session: Session = {
      id: "csrf-sess-2",
      userId: "u1",
      username: "admin",
      role: "admin",
      csrfToken: "correct-token",
      createdAt: Date.now(),
      expiresAt: Date.now() + 3600_000,
    };
    const req = new Request("http://localhost/admin/plugins/post-plugin", {
      method: "POST",
      body: new URLSearchParams({ _csrf: "wrong-token", title: "test" }),
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    requestSession.set(req, session);
    const next = promiseNext(() => new Response("OK", { status: 200 }));
    const res = await csrfMiddleware(req, next);
    assertEquals(res.status, 403);
  });

  it("should return 403 when body cannot be parsed as form data", async () => {
    const session: Session = {
      id: "csrf-sess-json",
      userId: "u1",
      username: "admin",
      role: "admin",
      csrfToken: "valid-csrf-token",
      createdAt: Date.now(),
      expiresAt: Date.now() + 3600_000,
    };
    // Send JSON body which cannot be parsed as form data
    const req = new Request("http://localhost/admin/plugins/post-plugin", {
      method: "POST",
      body: JSON.stringify({ title: "test" }),
      headers: { "Content-Type": "application/json" },
    });
    requestSession.set(req, session);
    const next = promiseNext(() => new Response("OK", { status: 200 }));
    const res = await csrfMiddleware(req, next);
    assertEquals(res.status, 403);
  });

  it("should pass through when _csrf token is correct", async () => {
    const session: Session = {
      id: "csrf-sess-ok",
      userId: "u1",
      username: "admin",
      role: "admin",
      csrfToken: "valid-csrf-token",
      createdAt: Date.now(),
      expiresAt: Date.now() + 3600_000,
    };
    const req = new Request("http://localhost/admin/plugins/post-plugin", {
      method: "POST",
      body: new URLSearchParams({
        _csrf: "valid-csrf-token",
        title: "test",
      }),
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    requestSession.set(req, session);
    let called = false;
    const next = promiseNext(() => {
      called = true;
      return new Response("OK", { status: 200 });
    });
    const res = await csrfMiddleware(req, next);
    assertEquals(called, true);
    assertEquals(res.status, 200);
  });
});

describe("authMiddleware — method to permission mapping", () => {
  it("should treat PUT as update permission (403 for viewer)", async () => {
    const session = await seedSession({
      id: "viewer-put",
      userId: "viewer-user",
      role: "viewer",
    });
    const auth = authMiddleware(sessionStore);
    const req = new Request("http://localhost/admin/plugins/post-plugin", {
      method: "PUT",
      headers: { cookie: `__tennet_sid=${session.id}` },
    });
    const next = promiseNext(() => new Response("OK", { status: 200 }));
    const res = await auth(req, next);
    assertEquals(res.status, 403);
    await sessionStore.delete("viewer-put");
  });

  it("should treat DELETE as delete permission (403 for viewer)", async () => {
    const session = await seedSession({
      id: "viewer-delete",
      userId: "viewer-user",
      role: "viewer",
    });
    const auth = authMiddleware(sessionStore);
    const req = new Request("http://localhost/admin/plugins/post-plugin", {
      method: "DELETE",
      headers: { cookie: `__tennet_sid=${session.id}` },
    });
    const next = promiseNext(() => new Response("OK", { status: 200 }));
    const res = await auth(req, next);
    assertEquals(res.status, 403);
    await sessionStore.delete("viewer-delete");
  });

  it("should treat PATCH as update permission (403 for viewer)", async () => {
    const session = await seedSession({
      id: "viewer-patch",
      userId: "viewer-user",
      role: "viewer",
    });
    const auth = authMiddleware(sessionStore);
    const req = new Request("http://localhost/admin/plugins/post-plugin", {
      method: "PATCH",
      headers: { cookie: `__tennet_sid=${session.id}` },
    });
    const next = promiseNext(() => new Response("OK", { status: 200 }));
    const res = await auth(req, next);
    assertEquals(res.status, 403);
    await sessionStore.delete("viewer-patch");
  });

  it("should extract dashboard resource for /admin/ (trailing slash)", async () => {
    const session = await seedSession({
      id: "admin-slash",
      userId: "user-2",
      role: "admin",
    });
    const auth = authMiddleware(sessionStore);
    const req = new Request("http://localhost/admin/", {
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
    await sessionStore.delete("admin-slash");
  });

  it("should use plugin slug as resource for unknown plugin slugs", async () => {
    const session = await seedSession({
      id: "admin-unknown-slug",
      userId: "user-2",
      role: "admin",
    });
    const auth = authMiddleware(sessionStore);
    const req = new Request(
      "http://localhost/admin/plugins/unknown-plugin",
      {
        headers: { cookie: `__tennet_sid=${session.id}` },
      },
    );
    const next = promiseNext(() => new Response("OK", { status: 200 }));
    const res = await auth(req, next);
    // Unknown plugin slug is used as resource; admin has no hardcoded permission for it
    assertEquals(res.status, 403);
    await sessionStore.delete("admin-unknown-slug");
  });

  it("should allow editor to access pages plugin", async () => {
    const session = await seedSession({
      id: "editor-pages",
      userId: "editor-user",
      role: "editor",
    });
    const auth = authMiddleware(sessionStore);
    const req = new Request(
      "http://localhost/admin/plugins/page-plugin",
      {
        method: "GET",
        headers: { cookie: `__tennet_sid=${session.id}` },
      },
    );
    let called = false;
    const next = promiseNext(() => {
      called = true;
      return new Response("OK", { status: 200 });
    });
    const res = await auth(req, next);
    assertEquals(called, true);
    assertEquals(res.status, 200);
    await sessionStore.delete("editor-pages");
  });

  it("should return 403 when editor tries to access settings-plugin", async () => {
    const session = await seedSession({
      id: "editor-settings",
      userId: "editor-user",
      role: "editor",
    });
    const auth = authMiddleware(sessionStore);
    const req = new Request(
      "http://localhost/admin/plugins/settings-plugin",
      {
        method: "GET",
        headers: { cookie: `__tennet_sid=${session.id}` },
      },
    );
    const next = promiseNext(() => new Response("OK", { status: 200 }));
    const res = await auth(req, next);
    assertEquals(res.status, 403);
    await sessionStore.delete("editor-settings");
  });
});

// --- Security Headers Middleware ---
describe("securityHeadersMiddleware", () => {
  it("should add X-Content-Type-Options: nosniff to all responses", async () => {
    const req = new Request("http://localhost/about");
    const next = promiseNext(() => new Response("OK", { status: 200 }));
    const res = await securityHeadersMiddleware(req, next);
    assertEquals(res.headers.get("X-Content-Type-Options"), "nosniff");
  });

  it("should add X-Frame-Options: DENY to admin responses", async () => {
    const req = new Request("http://localhost/admin");
    const next = promiseNext(() => new Response("OK", { status: 200 }));
    const res = await securityHeadersMiddleware(req, next);
    assertEquals(res.headers.get("X-Frame-Options"), "DENY");
  });

  it("should add Referrer-Policy to admin responses", async () => {
    const req = new Request("http://localhost/admin/plugins/posts");
    const next = promiseNext(() => new Response("OK", { status: 200 }));
    const res = await securityHeadersMiddleware(req, next);
    assertEquals(
      res.headers.get("Referrer-Policy"),
      "strict-origin-when-cross-origin",
    );
  });

  it("should NOT add X-Frame-Options to non-admin responses", async () => {
    const req = new Request("http://localhost/about");
    const next = promiseNext(() => new Response("OK", { status: 200 }));
    const res = await securityHeadersMiddleware(req, next);
    assertEquals(res.headers.get("X-Frame-Options"), null);
  });

  it("should NOT add Referrer-Policy to non-admin responses", async () => {
    const req = new Request("http://localhost/contact");
    const next = promiseNext(() => new Response("OK", { status: 200 }));
    const res = await securityHeadersMiddleware(req, next);
    assertEquals(res.headers.get("Referrer-Policy"), null);
  });

  it("should preserve original response status", async () => {
    const req = new Request("http://localhost/admin");
    const next = promiseNext(() => new Response("Not Found", { status: 404 }));
    const res = await securityHeadersMiddleware(req, next);
    assertEquals(res.status, 404);
  });

  it("should preserve original response body", async () => {
    const req = new Request("http://localhost/admin");
    const next = promiseNext(() =>
      new Response("Body content", { status: 200 })
    );
    const res = await securityHeadersMiddleware(req, next);
    const body = await res.text();
    assertEquals(body, "Body content");
  });
});
