import { afterEach, describe, it } from "@std/testing/bdd";
import { assertEquals, assertExists } from "@std/assert";
import { authMiddleware, requestSession } from "../auth/authMiddleware.ts";
import { InMemorySessionStore } from "../auth/sessionStore.ts";
import { AdminPlugin } from "../plugins/adminPlugin.tsx";
import { RolesPlugin } from "../plugins/rolesPlugin.ts";
import { AuditLogPlugin } from "../plugins/auditLogPlugin.ts";
import { CategoriesPlugin } from "../plugins/categoriesPlugin.ts";
import { PermissionsStore } from "../auth/permissionsStore.ts";
import type { Session } from "../auth/types.ts";
import { InMemoryStorage } from "../models/Storage.ts";
import type { StorageItem } from "../models/Storage.ts";

/** Wrap a sync Response-returning callback. */
function promiseNext(
  fn: () => Response,
): () => Promise<Response> {
  return () => Promise.resolve(fn());
}

const sessionStore = new InMemorySessionStore();

async function seedSession(overrides?: Partial<Session>): Promise<Session> {
  const session: Session = {
    id: "sec-test-sess",
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

afterEach(async () => {
  await sessionStore.deleteByUserId("user-1");
  await sessionStore.deleteByUserId("viewer-user");
  await sessionStore.deleteByUserId("editor-user");
  await sessionStore.deleteByUserId("custom-user");
});

// === 1. Auth Bypass ===
describe("SEC: Auth bypass — role-plugin", () => {
  const auth = authMiddleware(sessionStore);
  const next = promiseNext(() => new Response("OK", { status: 200 }));

  it("GET /admin/plugins/role-plugin without session should redirect to login", async () => {
    const req = new Request("http://localhost/admin/plugins/role-plugin");
    const res = await auth(req, next);
    assertEquals(res.status, 302);
    assertEquals(res.headers.get("Location"), "/admin/login");
  });

  it("GET /admin/plugins/audit-log-plugin without session should redirect to login", async () => {
    const req = new Request(
      "http://localhost/admin/plugins/audit-log-plugin",
    );
    const res = await auth(req, next);
    assertEquals(res.status, 302);
    assertEquals(res.headers.get("Location"), "/admin/login");
  });

  it("should redirect when session cookie has invalid sessionId", async () => {
    const req = new Request("http://localhost/admin/plugins/role-plugin", {
      headers: { cookie: "__tennet_sid=invalid-garbage-id" },
    });
    const res = await auth(req, next);
    assertEquals(res.status, 302);
    assertEquals(res.headers.get("Location"), "/admin/login");
  });

  it("should redirect when session is expired", async () => {
    const session = await seedSession({
      id: "expired-sess",
      expiresAt: Date.now() - 10_000,
    });
    const req = new Request("http://localhost/admin/plugins/role-plugin", {
      headers: { cookie: `__tennet_sid=${session.id}` },
    });
    const res = await auth(req, next);
    assertEquals(res.status, 302);
  });
});

// === 2. Privilege Escalation ===
describe("SEC: Privilege escalation", () => {
  it("viewer cannot POST to role-plugin (create role)", async () => {
    const session = await seedSession({
      id: "viewer-priv-esc",
      userId: "viewer-user",
      role: "viewer",
    });
    const auth = authMiddleware(sessionStore);
    const req = new Request("http://localhost/admin/plugins/role-plugin", {
      method: "POST",
      headers: { cookie: `__tennet_sid=${session.id}` },
    });
    const next = promiseNext(() => new Response("OK", { status: 200 }));
    const res = await auth(req, next);
    assertEquals(res.status, 403);
  });

  it("editor cannot POST to user-plugin (create user)", async () => {
    const session = await seedSession({
      id: "editor-priv-esc",
      userId: "editor-user",
      role: "editor",
    });
    const auth = authMiddleware(sessionStore);
    const req = new Request("http://localhost/admin/plugins/user-plugin", {
      method: "POST",
      headers: { cookie: `__tennet_sid=${session.id}` },
    });
    const next = promiseNext(() => new Response("OK", { status: 200 }));
    const res = await auth(req, next);
    assertEquals(res.status, 403);
  });

  it("viewer cannot GET user-plugin (read users)", async () => {
    const session = await seedSession({
      id: "viewer-user-read",
      userId: "viewer-user",
      role: "viewer",
    });
    const auth = authMiddleware(sessionStore);
    const req = new Request("http://localhost/admin/plugins/user-plugin", {
      method: "GET",
      headers: { cookie: `__tennet_sid=${session.id}` },
    });
    const next = promiseNext(() => new Response("OK", { status: 200 }));
    const res = await auth(req, next);
    assertEquals(res.status, 403);
  });
});

// === 3. Role/Slug Injection ===
describe("SEC: Role slug injection", () => {
  const plugin = new RolesPlugin();

  it("should reject slug with path traversal: ../admin", () => {
    const result = plugin.validate({
      name: "Evil",
      slug: "../admin",
      description: "",
      is_system: "",
    });
    assertEquals(result.valid, false);
    assertEquals(result.errors.slug !== undefined, true);
  });

  it("should reject slug with path separators: role/../../", () => {
    const result = plugin.validate({
      name: "Evil",
      slug: "role/../../",
      description: "",
      is_system: "",
    });
    assertEquals(result.valid, false);
  });

  it("should reject slug with HTML: <script>alert(1)</script>", () => {
    const result = plugin.validate({
      name: "Evil",
      slug: "<script>alert(1)</script>",
      description: "",
      is_system: "",
    });
    assertEquals(result.valid, false);
  });

  it("should reject slug with null bytes", () => {
    const result = plugin.validate({
      name: "Evil",
      slug: "role\x00null",
      description: "",
      is_system: "",
    });
    assertEquals(result.valid, false);
  });

  it("should reject empty slug", () => {
    const result = plugin.validate({
      name: "No Slug",
      slug: "",
      description: "",
      is_system: "",
    });
    assertEquals(result.valid, false);
    assertEquals(result.errors.slug !== undefined, true);
  });

  it("should reject whitespace-only slug", () => {
    const result = plugin.validate({
      name: "Spaces",
      slug: "   ",
      description: "",
      is_system: "",
    });
    assertEquals(result.valid, false);
  });

  it("should only accept [a-z0-9-] in slug", () => {
    const valid = ["admin", "content-editor", "role-123"];
    const invalid = [
      "Admin",
      "role@home",
      "role role",
      "role_name",
      "UPPER",
    ];

    for (const slug of valid) {
      const result = plugin.validate({
        name: "Test",
        slug,
        description: "",
        is_system: "",
      });
      assertEquals(result.errors.slug, undefined, `Expected valid: ${slug}`);
    }

    for (const slug of invalid) {
      const result = plugin.validate({
        name: "Test",
        slug,
        description: "",
        is_system: "",
      });
      assertEquals(
        result.errors.slug !== undefined,
        true,
        `Expected invalid: ${slug}`,
      );
    }
  });
});

// === 4. Audit Log Tampering ===
describe("SEC: Audit log tamper protection", () => {
  it("POST to audit-log-plugin (create) should return 403", async () => {
    const admin = new AdminPlugin({
      storage: "memory",
      plugins: [AuditLogPlugin, CategoriesPlugin, RolesPlugin],
    });
    const { routes } = await admin.init();

    const createRoute = routes.find(
      (r) =>
        r.path === "/admin/plugins/audit-log-plugin" && r.method === "POST",
    );
    assertExists(createRoute?.run);

    const body = new URLSearchParams({
      action: "create",
      resource: "fake",
      resource_id: "fake-1",
      user_id: "hacker",
      username: "hacker",
      details: "",
      timestamp: "2026-01-01T00:00:00.000Z",
    });
    const req = new Request(
      "http://localhost/admin/plugins/audit-log-plugin",
      {
        method: "POST",
        body: body.toString(),
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      },
    );
    const res = await createRoute!.run!(req);
    assertEquals(res.status, 403);
  });

  it("POST to audit-log-plugin/{id} (update) should return 403", async () => {
    const admin = new AdminPlugin({
      storage: "memory",
      plugins: [AuditLogPlugin, CategoriesPlugin, RolesPlugin],
    });
    const { routes } = await admin.init();

    const updateRoutes = routes.filter(
      (r) =>
        r.path === "/admin/plugins/audit-log-plugin/[id]" &&
        r.method === "POST",
    );
    assertExists(updateRoutes[0]?.run);

    const body = new URLSearchParams({ action: "update" });
    const req = new Request(
      "http://localhost/admin/plugins/audit-log-plugin/some-id",
      {
        method: "POST",
        body: body.toString(),
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      },
    );
    const res = await updateRoutes[0]!.run!(req, {
      params: { id: "some-id" },
    });
    assertEquals(res.status, 403);
  });

  it("POST to audit-log-plugin/{id}/delete should return 403", async () => {
    const admin = new AdminPlugin({
      storage: "memory",
      plugins: [AuditLogPlugin, CategoriesPlugin, RolesPlugin],
    });
    const { routes } = await admin.init();

    const deleteRoute = routes.find(
      (r) => r.path === "/admin/plugins/audit-log-plugin/[id]/delete",
    );
    assertExists(deleteRoute?.run);

    const req = new Request(
      "http://localhost/admin/plugins/audit-log-plugin/some-id/delete",
      { method: "POST" },
    );
    const res = await deleteRoute!.run!(req, {
      params: { id: "some-id" },
    });
    assertEquals(res.status, 403);
  });
});

// === 6. Deny-by-Default ===
describe("SEC: Deny-by-default for dynamic permissions", () => {
  it("custom role with no KV entry and no hardcoded fallback gets 403", async () => {
    const kv = await Deno.openKv(":memory:");
    try {
      const session = await seedSession({
        id: "deny-default-sess",
        userId: "custom-user",
        role: "completely-unknown-role",
      });
      const auth = authMiddleware(sessionStore, undefined, kv);
      const req = new Request(
        "http://localhost/admin/plugins/post-plugin",
        {
          method: "GET",
          headers: { cookie: `__tennet_sid=${session.id}` },
        },
      );
      const next = promiseNext(() => new Response("OK", { status: 200 }));
      const res = await auth(req, next);
      assertEquals(res.status, 403);
    } finally {
      kv.close();
    }
  });

  it("KV returns null → fallback to ROLE_PERMISSIONS works", async () => {
    const kv = await Deno.openKv(":memory:");
    try {
      // Don't set any KV data — admin's hardcoded perms should work
      const session = await seedSession({
        id: "fallback-default-sess",
        role: "admin",
      });
      const auth = authMiddleware(sessionStore, undefined, kv);
      const req = new Request(
        "http://localhost/admin/plugins/post-plugin",
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
    } finally {
      kv.close();
    }
  });

  it("without KV (null), behavior is identical to hardcoded", async () => {
    const session = await seedSession({
      id: "null-kv-sess",
      role: "viewer",
    });
    // null KV — pure hardcoded
    const auth = authMiddleware(sessionStore, undefined, null);
    const req = new Request(
      "http://localhost/admin/plugins/post-plugin",
      {
        method: "POST",
        headers: { cookie: `__tennet_sid=${session.id}` },
      },
    );
    const next = promiseNext(() => new Response("OK", { status: 200 }));
    const res = await auth(req, next);
    // Viewer has no create permission on posts in hardcoded
    assertEquals(res.status, 403);
  });
});

// === 7. System Roles Protection ===
describe("SEC: System roles deletion protection", () => {
  it("should block deletion of system role via route handler", async () => {
    const admin = new AdminPlugin({
      storage: "memory",
      plugins: [RolesPlugin, AuditLogPlugin, CategoriesPlugin],
    });
    const { routes } = await admin.init();

    // Find the admin role that was seeded
    const rolesPlugin = admin.plugins.find(
      (p) => p.name === "RolePlugin",
    );
    assertExists(rolesPlugin);
    const roles = await rolesPlugin!.storage.list({ page: 1, limit: 100 });
    const adminRole = roles.find((r) => r.slug === "admin");
    assertExists(adminRole);

    const deleteRoute = routes.find(
      (r) => r.path === "/admin/plugins/role-plugin/[id]/delete",
    );
    assertExists(deleteRoute?.run);

    const req = new Request(
      `http://localhost/admin/plugins/role-plugin/${adminRole!.id}/delete`,
      { method: "POST" },
    );
    const res = await deleteRoute!.run!(req, {
      params: { id: adminRole!.id as string },
    });

    // Should redirect with error, not delete
    assertEquals(res.status, 302);
    const location = res.headers.get("Location") ?? "";
    assertEquals(location.includes("error="), true);

    // Role should still exist
    const stillExists = await rolesPlugin!.storage.get(
      adminRole!.id as string,
    );
    assertExists(stillExists);
  });

  it("should allow deletion of custom (non-system) role", async () => {
    const admin = new AdminPlugin({
      storage: "memory",
      plugins: [RolesPlugin, AuditLogPlugin, CategoriesPlugin],
    });
    await admin.init();
    const rolesPlugin = admin.plugins.find(
      (p) => p.name === "RolePlugin",
    );
    assertExists(rolesPlugin);

    // Create a custom role
    await rolesPlugin!.storage.set("custom-role-1", {
      id: "custom-role-1",
      name: "Custom",
      slug: "custom",
      description: "Custom role",
      is_system: "false",
    });

    const { routes } = await admin.init();
    const deleteRoute = routes.find(
      (r) => r.path === "/admin/plugins/role-plugin/[id]/delete",
    );

    const session: Session = {
      id: "admin-sess",
      userId: "user-1",
      username: "admin",
      role: "admin",
      csrfToken: "csrf",
      createdAt: Date.now(),
      expiresAt: Date.now() + 3600_000,
    };
    const req = new Request(
      "http://localhost/admin/plugins/role-plugin/custom-role-1/delete",
      { method: "POST" },
    );
    requestSession.set(req, session);

    const res = await deleteRoute!.run!(req, {
      params: { id: "custom-role-1" },
    });
    assertEquals(res.status, 302);
    const location = res.headers.get("Location") ?? "";
    assertEquals(location.includes("success=deleted"), true);

    // Role should be gone
    const deleted = await rolesPlugin!.storage.get("custom-role-1");
    assertEquals(deleted, null);
  });

  it("slug uniqueness should block creating role with existing system slug", async () => {
    const plugin = new RolesPlugin();

    class IndexedStorage extends InMemoryStorage {
      async listByIndex(
        field: string,
        value: string,
      ): Promise<StorageItem[]> {
        const all = await this.list({ page: 1, limit: 1000 });
        return all.filter((item) => String(item[field] ?? "") === value);
      }
    }

    const storage = new IndexedStorage();
    plugin.storage = storage;

    // Simulate existing system role
    await storage.set("sys-admin", {
      id: "sys-admin",
      name: "Admin",
      slug: "admin",
      description: "System admin",
      is_system: "true",
    });

    const result = await plugin.validateAsync({
      name: "My Admin",
      slug: "admin",
      description: "",
      is_system: "",
    });
    assertEquals(result.valid, false);
    assertEquals(result.errors.slug, 'slug "admin" is already in use');
  });
});

// === 9. Permissions Store Validation ===
describe("SEC: PermissionsStore edge cases", () => {
  it("get() with empty resource should return null, not crash", async () => {
    const kv = await Deno.openKv(":memory:");
    try {
      const store = new PermissionsStore(kv);
      const result = await store.get("admin", "");
      assertEquals(result, null);
    } finally {
      kv.close();
    }
  });

  it("get() with empty role should return null, not crash", async () => {
    const kv = await Deno.openKv(":memory:");
    try {
      const store = new PermissionsStore(kv);
      const result = await store.get("", "posts");
      assertEquals(result, null);
    } finally {
      kv.close();
    }
  });

  it("null KV fallback returns correct admin permissions", async () => {
    const store = new PermissionsStore(null);
    const adminPosts = await store.get("admin", "posts");
    assertEquals(Array.isArray(adminPosts), true);
    assertEquals(adminPosts!.includes("read"), true);
    assertEquals(adminPosts!.includes("create"), true);
    assertEquals(adminPosts!.includes("update"), true);
    assertEquals(adminPosts!.includes("delete"), true);
  });

  it("null KV fallback denies viewer write access to posts", async () => {
    const store = new PermissionsStore(null);
    const viewerPosts = await store.get("viewer", "posts");
    assertEquals(Array.isArray(viewerPosts), true);
    assertEquals(viewerPosts!.includes("read"), true);
    assertEquals(viewerPosts!.includes("create"), false);
    assertEquals(viewerPosts!.includes("update"), false);
    assertEquals(viewerPosts!.includes("delete"), false);
  });
});

// === 10. Backward Compatibility ===
describe("SEC: Backward compatibility", () => {
  it("admin/editor/viewer roles work without any KV customization", async () => {
    const auth = authMiddleware(sessionStore);
    const next = promiseNext(() => new Response("OK", { status: 200 }));

    // Admin can read posts
    const adminSess = await seedSession({
      id: "compat-admin",
      role: "admin",
    });
    const adminReq = new Request(
      "http://localhost/admin/plugins/post-plugin",
      {
        headers: { cookie: `__tennet_sid=${adminSess.id}` },
      },
    );
    const adminRes = await auth(adminReq, next);
    assertEquals(adminRes.status, 200);

    // Editor can read posts
    const editorSess = await seedSession({
      id: "compat-editor",
      userId: "editor-user",
      role: "editor",
    });
    const editorReq = new Request(
      "http://localhost/admin/plugins/post-plugin",
      {
        headers: { cookie: `__tennet_sid=${editorSess.id}` },
      },
    );
    const editorRes = await auth(editorReq, next);
    assertEquals(editorRes.status, 200);

    // Viewer can read posts
    const viewerSess = await seedSession({
      id: "compat-viewer",
      userId: "viewer-user",
      role: "viewer",
    });
    const viewerReq = new Request(
      "http://localhost/admin/plugins/post-plugin",
      {
        headers: { cookie: `__tennet_sid=${viewerSess.id}` },
      },
    );
    const viewerRes = await auth(viewerReq, next);
    assertEquals(viewerRes.status, 200);
  });

  it("editor cannot access settings-plugin (hardcoded deny)", async () => {
    const session = await seedSession({
      id: "compat-editor-settings",
      userId: "editor-user",
      role: "editor",
    });
    const auth = authMiddleware(sessionStore);
    const req = new Request(
      "http://localhost/admin/plugins/settings-plugin",
      {
        headers: { cookie: `__tennet_sid=${session.id}` },
      },
    );
    const next = promiseNext(() => new Response("OK", { status: 200 }));
    const res = await auth(req, next);
    assertEquals(res.status, 403);
  });

  it("viewer cannot create posts (hardcoded deny)", async () => {
    const session = await seedSession({
      id: "compat-viewer-create",
      userId: "viewer-user",
      role: "viewer",
    });
    const auth = authMiddleware(sessionStore);
    const req = new Request(
      "http://localhost/admin/plugins/post-plugin",
      {
        method: "POST",
        headers: { cookie: `__tennet_sid=${session.id}` },
      },
    );
    const next = promiseNext(() => new Response("OK", { status: 200 }));
    const res = await auth(req, next);
    assertEquals(res.status, 403);
  });
});
