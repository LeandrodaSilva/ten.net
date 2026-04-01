import { afterEach, beforeEach, describe, it } from "@std/testing/bdd";
import { assertEquals } from "@std/assert";
import { PermissionsStore } from "../../packages/admin/src/auth/permissionsStore.ts";
import type { PermissionAction } from "../../packages/core/src/models/Permission.ts";

describe("PermissionsStore with KV", () => {
  let kv: Deno.Kv;
  let store: PermissionsStore;

  beforeEach(async () => {
    kv = await Deno.openKv(":memory:");
    store = new PermissionsStore(kv);
  });

  afterEach(() => {
    kv.close();
  });

  describe("get()", () => {
    it("should return null when no custom permissions set", async () => {
      const result = await store.get("admin", "posts");
      assertEquals(result, null);
    });

    it("should return permissions after set", async () => {
      await store.set("admin", "posts", ["read", "create", "update", "delete"]);
      const result = await store.get("admin", "posts");
      assertEquals(result, ["read", "create", "update", "delete"]);
    });

    it("should return different permissions for different roles", async () => {
      await store.set("admin", "posts", [
        "read",
        "create",
        "update",
        "delete",
      ]);
      await store.set("viewer", "posts", ["read"]);
      assertEquals(await store.get("admin", "posts"), [
        "read",
        "create",
        "update",
        "delete",
      ]);
      assertEquals(await store.get("viewer", "posts"), ["read"]);
    });

    it("should return different permissions for different resources", async () => {
      await store.set("editor", "posts", ["read", "create"]);
      await store.set("editor", "pages", ["read"]);
      assertEquals(await store.get("editor", "posts"), ["read", "create"]);
      assertEquals(await store.get("editor", "pages"), ["read"]);
    });
  });

  describe("set()", () => {
    it("should save permissions to KV", async () => {
      await store.set("editor", "posts", ["read", "create"]);
      const result = await store.get("editor", "posts");
      assertEquals(result, ["read", "create"]);
    });

    it("should overwrite existing permissions", async () => {
      await store.set("editor", "posts", ["read"]);
      await store.set("editor", "posts", ["read", "create", "update"]);
      const result = await store.get("editor", "posts");
      assertEquals(result, ["read", "create", "update"]);
    });
  });

  describe("getAll()", () => {
    it("should return all permissions for a role", async () => {
      await store.set("editor", "posts", ["read", "create"]);
      await store.set("editor", "pages", ["read"]);
      await store.set("editor", "dashboard", ["read"]);

      const all = await store.getAll("editor");
      assertEquals(all["posts"], ["read", "create"]);
      assertEquals(all["pages"], ["read"]);
      assertEquals(all["dashboard"], ["read"]);
    });

    it("should return empty object when no permissions", async () => {
      const all = await store.getAll("nonexistent");
      assertEquals(Object.keys(all).length, 0);
    });
  });

  describe("getAllForMatrix()", () => {
    it("should return matrix data structure", async () => {
      await store.set("admin", "posts", [
        "read",
        "create",
        "update",
        "delete",
      ]);
      await store.set("viewer", "posts", ["read"]);

      const matrix = await store.getAllForMatrix(
        ["admin", "viewer"],
        ["posts", "pages"],
      );

      assertEquals(matrix.roles, ["admin", "viewer"]);
      assertEquals(matrix.resources, ["posts", "pages"]);
      assertEquals(matrix.permissions["admin"]["posts"], [
        "read",
        "create",
        "update",
        "delete",
      ]);
      assertEquals(matrix.permissions["viewer"]["posts"], ["read"]);
      assertEquals(matrix.permissions["admin"]["pages"], []);
      assertEquals(matrix.permissions["viewer"]["pages"], []);
    });
  });

  describe("delete()", () => {
    it("should remove all permissions for a role", async () => {
      await store.set("editor", "posts", ["read", "create"]);
      await store.set("editor", "pages", ["read"]);
      await store.delete("editor");

      assertEquals(await store.get("editor", "posts"), null);
      assertEquals(await store.get("editor", "pages"), null);
    });

    it("should not affect other roles", async () => {
      await store.set("editor", "posts", ["read"]);
      await store.set("admin", "posts", [
        "read",
        "create",
        "update",
        "delete",
      ]);
      await store.delete("editor");

      assertEquals(await store.get("admin", "posts"), [
        "read",
        "create",
        "update",
        "delete",
      ]);
    });
  });
});

describe("PermissionsStore fallback (null KV)", () => {
  it("should return hardcoded permissions from ROLE_PERMISSIONS", async () => {
    const store = new PermissionsStore(null);
    const result = await store.get("admin", "dashboard");
    assertEquals(result, ["read"]);
  });

  it("should return null for unknown role", async () => {
    const store = new PermissionsStore(null);
    const result = await store.get("nonexistent", "dashboard");
    assertEquals(result, null);
  });

  it("should return null for unknown resource", async () => {
    const store = new PermissionsStore(null);
    const result = await store.get("admin", "nonexistent");
    assertEquals(result, null);
  });

  it("should return all hardcoded permissions via getAll", async () => {
    const store = new PermissionsStore(null);
    const all = await store.getAll("admin");
    assertEquals(Array.isArray(all["dashboard"]), true);
    assertEquals(all["dashboard"].includes("read"), true);
    assertEquals(Array.isArray(all["posts"]), true);
  });

  it("should set be a no-op with null KV", async () => {
    const store = new PermissionsStore(null);
    await store.set("admin", "posts", ["read"]);
    // Fallback still returns hardcoded
    const result = await store.get("admin", "posts");
    assertEquals(
      (result as PermissionAction[]).includes("create"),
      true,
    );
  });

  it("should delete be a no-op with null KV", async () => {
    const store = new PermissionsStore(null);
    await store.delete("admin");
    const result = await store.get("admin", "dashboard");
    assertEquals(result, ["read"]);
  });
});
