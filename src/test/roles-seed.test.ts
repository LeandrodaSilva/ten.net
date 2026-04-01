import { describe, it } from "@std/testing/bdd";
import { assertEquals, assertExists } from "@std/assert";
import { AdminPlugin } from "../../packages/admin/src/plugins/adminPlugin.tsx";
import { RolesPlugin } from "../../packages/admin/src/plugins/rolesPlugin.ts";
import { AuditLogPlugin } from "../../packages/admin/src/plugins/auditLogPlugin.ts";
import { CategoriesPlugin } from "../../packages/admin/src/plugins/categoriesPlugin.ts";

describe("Built-in roles seed", () => {
  it("should seed 3 built-in roles on first init", async () => {
    const admin = new AdminPlugin({
      storage: "memory",
      plugins: [RolesPlugin, AuditLogPlugin, CategoriesPlugin],
    });
    await admin.init();

    const rolesPlugin = admin.plugins.find(
      (p) => p.name === "RolePlugin",
    );
    assertExists(rolesPlugin);

    const roles = await rolesPlugin!.storage.list({ page: 1, limit: 100 });
    assertEquals(roles.length, 3);

    const slugs = roles.map((r) => r.slug);
    assertEquals(slugs.includes("admin"), true);
    assertEquals(slugs.includes("editor"), true);
    assertEquals(slugs.includes("viewer"), true);
  });

  it("should mark all seeded roles as is_system=true", async () => {
    const admin = new AdminPlugin({
      storage: "memory",
      plugins: [RolesPlugin, AuditLogPlugin],
    });
    await admin.init();

    const rolesPlugin = admin.plugins.find(
      (p) => p.name === "RolePlugin",
    );
    const roles = await rolesPlugin!.storage.list({ page: 1, limit: 100 });

    for (const role of roles) {
      assertEquals(role.is_system, "true");
    }
  });

  it("should not re-seed roles on second init", async () => {
    const admin = new AdminPlugin({
      storage: "memory",
      plugins: [RolesPlugin, AuditLogPlugin],
    });
    await admin.init();

    const rolesPlugin = admin.plugins.find(
      (p) => p.name === "RolePlugin",
    );
    const firstCount = await rolesPlugin!.storage.count({});

    // Second init should not duplicate
    await admin.init();
    const secondCount = await rolesPlugin!.storage.count({});

    assertEquals(firstCount, secondCount);
  });

  it("should set correct names for built-in roles", async () => {
    const admin = new AdminPlugin({
      storage: "memory",
      plugins: [RolesPlugin, AuditLogPlugin],
    });
    await admin.init();

    const rolesPlugin = admin.plugins.find(
      (p) => p.name === "RolePlugin",
    );
    const roles = await rolesPlugin!.storage.list({ page: 1, limit: 100 });

    const adminRole = roles.find((r) => r.slug === "admin");
    assertEquals(adminRole?.name, "Admin");

    const editorRole = roles.find((r) => r.slug === "editor");
    assertEquals(editorRole?.name, "Editor");

    const viewerRole = roles.find((r) => r.slug === "viewer");
    assertEquals(viewerRole?.name, "Viewer");
  });

  it("should set descriptions for built-in roles", async () => {
    const admin = new AdminPlugin({
      storage: "memory",
      plugins: [RolesPlugin, AuditLogPlugin],
    });
    await admin.init();

    const rolesPlugin = admin.plugins.find(
      (p) => p.name === "RolePlugin",
    );
    const roles = await rolesPlugin!.storage.list({ page: 1, limit: 100 });

    const adminRole = roles.find((r) => r.slug === "admin");
    assertEquals(adminRole?.description, "Full access to all resources");

    const editorRole = roles.find((r) => r.slug === "editor");
    assertEquals(editorRole?.description, "Create and edit content");

    const viewerRole = roles.find((r) => r.slug === "viewer");
    assertEquals(viewerRole?.description, "Read-only access");
  });

  it("should not seed when RolesPlugin is not registered", async () => {
    const admin = new AdminPlugin({
      storage: "memory",
      plugins: [CategoriesPlugin, AuditLogPlugin],
    });
    await admin.init();
    // No error thrown — just no roles seeded
    assertEquals(admin.plugins.length, 2);
  });
});
