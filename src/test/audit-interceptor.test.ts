import { describe, it } from "@std/testing/bdd";
import { assertEquals, assertExists } from "@std/assert";
import { AdminPlugin } from "../plugins/adminPlugin.tsx";
import { CategoriesPlugin } from "../plugins/categoriesPlugin.ts";
import { AuditLogPlugin } from "../plugins/auditLogPlugin.ts";
import { RolesPlugin } from "../plugins/rolesPlugin.ts";
import { requestSession } from "../auth/authMiddleware.ts";
import type { Session } from "../auth/types.ts";

/** Helper: create a POST form request with session attached. */
function makeFormRequest(
  url: string,
  data: Record<string, string>,
): Request {
  const body = new URLSearchParams(data);
  const req = new Request(url, {
    method: "POST",
    body: body.toString(),
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  // Attach a mock session for audit logging
  const session: Session = {
    id: "audit-sess",
    userId: "user-1",
    username: "admin",
    role: "admin",
    csrfToken: "csrf-token",
    createdAt: Date.now(),
    expiresAt: Date.now() + 3600_000,
  };
  requestSession.set(req, session);
  return req;
}

describe("Audit log interceptor", () => {
  it("should log create action for non-audit plugins", async () => {
    const admin = new AdminPlugin({
      storage: "memory",
      plugins: [CategoriesPlugin, AuditLogPlugin, RolesPlugin],
    });
    const { routes } = await admin.init();
    const auditPlugin = admin.plugins.find(
      (p) => p.name === "AuditLogPlugin",
    );
    assertExists(auditPlugin);

    // Create a category
    const createRoute = routes.find(
      (r) => r.path === "/admin/plugins/category-plugin" && r.method === "POST",
    );
    assertExists(createRoute?.run);

    const req = makeFormRequest(
      "http://localhost/admin/plugins/category-plugin",
      { name: "Science", slug: "science", description: "Science stuff" },
    );
    const res = await createRoute!.run!(req);
    assertEquals(res.status, 302);

    // Check audit log has an entry
    const auditItems = await auditPlugin!.storage.list({
      page: 1,
      limit: 100,
    });
    assertEquals(auditItems.length >= 1, true);

    const auditEntry = auditItems.find(
      (item) => item.action === "create" && item.resource === "category-plugin",
    );
    assertExists(auditEntry);
    assertEquals(auditEntry!.user_id, "user-1");
    assertEquals(auditEntry!.username, "admin");
  });

  it("should log update action", async () => {
    const admin = new AdminPlugin({
      storage: "memory",
      plugins: [CategoriesPlugin, AuditLogPlugin, RolesPlugin],
    });
    await admin.init();
    const catPlugin = admin.plugins.find(
      (p) => p.name === "CategoryPlugin",
    );
    const auditPlugin = admin.plugins.find(
      (p) => p.name === "AuditLogPlugin",
    );
    assertExists(catPlugin);
    assertExists(auditPlugin);

    // Seed a category
    await catPlugin!.storage.set("cat-1", {
      id: "cat-1",
      name: "Tech",
      slug: "tech",
      description: "",
    });

    const { routes } = await admin.init();
    const updateRoutes = routes.filter(
      (r) =>
        r.path === "/admin/plugins/category-plugin/[id]" &&
        r.method === "POST",
    );
    const updateRoute = updateRoutes[0];
    assertExists(updateRoute?.run);

    const req = makeFormRequest(
      "http://localhost/admin/plugins/category-plugin/cat-1",
      { name: "Technology", slug: "technology", description: "Tech stuff" },
    );
    const res = await updateRoute!.run!(req, { params: { id: "cat-1" } });
    assertEquals(res.status, 302);

    // Check audit log
    const auditItems = await auditPlugin!.storage.list({
      page: 1,
      limit: 100,
    });
    const updateEntry = auditItems.find(
      (item) => item.action === "update" && item.resource === "category-plugin",
    );
    assertExists(updateEntry);
  });

  it("should log delete action", async () => {
    const admin = new AdminPlugin({
      storage: "memory",
      plugins: [CategoriesPlugin, AuditLogPlugin, RolesPlugin],
    });
    await admin.init();
    const catPlugin = admin.plugins.find(
      (p) => p.name === "CategoryPlugin",
    );
    const auditPlugin = admin.plugins.find(
      (p) => p.name === "AuditLogPlugin",
    );
    assertExists(catPlugin);
    assertExists(auditPlugin);

    // Seed a category
    await catPlugin!.storage.set("cat-del", {
      id: "cat-del",
      name: "ToDelete",
      slug: "to-delete",
      description: "",
    });

    const { routes } = await admin.init();
    const deleteRoute = routes.find(
      (r) => r.path === "/admin/plugins/category-plugin/[id]/delete",
    );
    assertExists(deleteRoute?.run);

    const req = makeFormRequest(
      "http://localhost/admin/plugins/category-plugin/cat-del/delete",
      {},
    );
    const res = await deleteRoute!.run!(req, { params: { id: "cat-del" } });
    assertEquals(res.status, 302);

    // Check audit log
    const auditItems = await auditPlugin!.storage.list({
      page: 1,
      limit: 100,
    });
    const deleteEntry = auditItems.find(
      (item) => item.action === "delete" && item.resource === "category-plugin",
    );
    assertExists(deleteEntry);
  });

  it("should not create audit log for AuditLogPlugin itself (no recursion)", async () => {
    const admin = new AdminPlugin({
      storage: "memory",
      plugins: [CategoriesPlugin, AuditLogPlugin, RolesPlugin],
    });
    const { routes } = await admin.init();
    const auditPlugin = admin.plugins.find(
      (p) => p.name === "AuditLogPlugin",
    );
    assertExists(auditPlugin);

    // AuditLogPlugin is readonly, so POST should be blocked
    const createRoute = routes.find(
      (r) =>
        r.path === "/admin/plugins/audit-log-plugin" && r.method === "POST",
    );
    assertExists(createRoute?.run);

    const req = makeFormRequest(
      "http://localhost/admin/plugins/audit-log-plugin",
      {
        action: "create",
        resource: "test",
        resource_id: "test-1",
        user_id: "u1",
        username: "admin",
        details: "",
        timestamp: "2026-01-01T00:00:00.000Z",
      },
    );
    const res = await createRoute!.run!(req);
    // Readonly plugin blocks POST with 403
    assertEquals(res.status, 403);
  });

  it("should contain user_id and username from session", async () => {
    const admin = new AdminPlugin({
      storage: "memory",
      plugins: [CategoriesPlugin, AuditLogPlugin, RolesPlugin],
    });
    const { routes } = await admin.init();
    const auditPlugin = admin.plugins.find(
      (p) => p.name === "AuditLogPlugin",
    );

    const createRoute = routes.find(
      (r) => r.path === "/admin/plugins/category-plugin" && r.method === "POST",
    );

    const body = new URLSearchParams({
      name: "Art",
      slug: "art",
      description: "Art content",
    });
    const req = new Request(
      "http://localhost/admin/plugins/category-plugin",
      {
        method: "POST",
        body: body.toString(),
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      },
    );
    const session: Session = {
      id: "audit-sess-2",
      userId: "user-42",
      username: "editor-bob",
      role: "editor",
      csrfToken: "csrf",
      createdAt: Date.now(),
      expiresAt: Date.now() + 3600_000,
    };
    requestSession.set(req, session);

    await createRoute!.run!(req);

    const auditItems = await auditPlugin!.storage.list({
      page: 1,
      limit: 100,
    });
    const entry = auditItems.find(
      (item) => item.user_id === "user-42",
    );
    assertExists(entry);
    assertEquals(entry!.username, "editor-bob");
  });
});
