import { describe, it } from "@std/testing/bdd";
import { assertEquals } from "@std/assert";
import { RolesPlugin } from "../plugins/rolesPlugin.ts";
import { InMemoryStorage } from "../models/Storage.ts";
import type { StorageItem } from "../models/Storage.ts";

/** InMemoryStorage with listByIndex support for slug uniqueness tests. */
class IndexedInMemoryStorage extends InMemoryStorage {
  async listByIndex(field: string, value: string): Promise<StorageItem[]> {
    const all = await this.list({ page: 1, limit: 1000 });
    return all.filter((item) => String(item[field] ?? "") === value);
  }
}

/** Helper: create valid role data with overrides. */
function roleData(
  overrides?: Record<string, unknown>,
): Record<string, unknown> {
  return {
    name: "Editor",
    slug: "editor",
    description: "",
    is_system: "",
    ...overrides,
  };
}

describe("RolesPlugin", () => {
  it("should have correct name", () => {
    const plugin = new RolesPlugin();
    assertEquals(plugin.name, "RolePlugin");
  });

  it("should have correct description", () => {
    const plugin = new RolesPlugin();
    assertEquals(plugin.description, "Manage user roles for access control.");
  });

  it("should have correct slug", () => {
    const plugin = new RolesPlugin();
    assertEquals(plugin.slug, "role-plugin");
  });

  it("should have correct model fields", () => {
    const plugin = new RolesPlugin();
    assertEquals(plugin.model.name, "string");
    assertEquals(plugin.model.slug, "string");
    assertEquals(plugin.model.description, "string");
    assertEquals(plugin.model.is_system, "boolean");
  });
});

describe("RolesPlugin.validate()", () => {
  describe("slug format validation", () => {
    it("should accept lowercase alphanumeric slugs", () => {
      const plugin = new RolesPlugin();
      const result = plugin.validate(roleData({ slug: "content-editor" }));
      assertEquals(result.errors.slug, undefined);
    });

    it("should accept single-word slugs", () => {
      const plugin = new RolesPlugin();
      const result = plugin.validate(roleData({ slug: "admin" }));
      assertEquals(result.errors.slug, undefined);
    });

    it("should reject slugs with uppercase letters", () => {
      const plugin = new RolesPlugin();
      const result = plugin.validate(roleData({ slug: "My-Role" }));
      assertEquals(result.valid, false);
      assertEquals(
        result.errors.slug,
        "slug must be lowercase alphanumeric with hyphens (e.g. my-role)",
      );
    });

    it("should reject slugs with spaces", () => {
      const plugin = new RolesPlugin();
      const result = plugin.validate(roleData({ slug: "my role" }));
      assertEquals(result.valid, false);
      assertEquals(result.errors.slug !== undefined, true);
    });

    it("should reject slugs with special characters", () => {
      const plugin = new RolesPlugin();
      const result = plugin.validate(roleData({ slug: "role@admin!" }));
      assertEquals(result.valid, false);
      assertEquals(result.errors.slug !== undefined, true);
    });

    it("should reject slugs with leading hyphen", () => {
      const plugin = new RolesPlugin();
      const result = plugin.validate(roleData({ slug: "-leading" }));
      assertEquals(result.valid, false);
    });

    it("should reject slugs with trailing hyphen", () => {
      const plugin = new RolesPlugin();
      const result = plugin.validate(roleData({ slug: "trailing-" }));
      assertEquals(result.valid, false);
    });

    it("should reject slugs with consecutive hyphens", () => {
      const plugin = new RolesPlugin();
      const result = plugin.validate(roleData({ slug: "double--hyphen" }));
      assertEquals(result.valid, false);
    });
  });

  describe("name validation", () => {
    it("should require name", () => {
      const plugin = new RolesPlugin();
      const result = plugin.validate(roleData({ name: "" }));
      assertEquals(result.valid, false);
      assertEquals(result.errors.name !== undefined, true);
    });

    it("should accept a valid name", () => {
      const plugin = new RolesPlugin();
      const result = plugin.validate(roleData({ name: "Content Editor" }));
      assertEquals(result.errors.name, undefined);
    });
  });

  describe("optional fields", () => {
    it("should accept empty description", () => {
      const plugin = new RolesPlugin();
      const result = plugin.validate(roleData({ description: "" }));
      assertEquals(result.errors.description, undefined);
    });

    it("should accept description with content", () => {
      const plugin = new RolesPlugin();
      const result = plugin.validate(
        roleData({ description: "Can edit content" }),
      );
      assertEquals(result.errors.description, undefined);
    });
  });

  describe("is_system default", () => {
    it("should default is_system to false when empty", () => {
      const plugin = new RolesPlugin();
      const data = roleData({ is_system: "" });
      plugin.validate(data);
      assertEquals(data.is_system, "false");
    });

    it("should default is_system to false when undefined", () => {
      const plugin = new RolesPlugin();
      const data = roleData({ is_system: undefined });
      plugin.validate(data);
      assertEquals(data.is_system, "false");
    });

    it("should default is_system to false when null", () => {
      const plugin = new RolesPlugin();
      const data = roleData({ is_system: null });
      plugin.validate(data);
      assertEquals(data.is_system, "false");
    });

    it("should accept is_system true", () => {
      const plugin = new RolesPlugin();
      const result = plugin.validate(roleData({ is_system: "true" }));
      assertEquals(result.errors.is_system, undefined);
    });
  });

  describe("isSystemRole()", () => {
    it("should return true for is_system=true string", () => {
      const plugin = new RolesPlugin();
      assertEquals(
        plugin.isSystemRole({ id: "1", is_system: "true" }),
        true,
      );
    });

    it("should return true for is_system=true boolean", () => {
      const plugin = new RolesPlugin();
      assertEquals(
        plugin.isSystemRole({ id: "1", is_system: true }),
        true,
      );
    });

    it("should return false for is_system=false string", () => {
      const plugin = new RolesPlugin();
      assertEquals(
        plugin.isSystemRole({ id: "1", is_system: "false" }),
        false,
      );
    });

    it("should return false for is_system undefined", () => {
      const plugin = new RolesPlugin();
      assertEquals(
        plugin.isSystemRole({ id: "1" }),
        false,
      );
    });
  });

  describe("complete valid form", () => {
    it("should validate a fully populated role", () => {
      const plugin = new RolesPlugin();
      const result = plugin.validate({
        name: "Content Editor",
        slug: "content-editor",
        description: "Can edit content but not settings",
        is_system: "false",
      });
      assertEquals(result.valid, true);
      assertEquals(Object.keys(result.errors).length, 0);
    });

    it("should validate a minimal valid role", () => {
      const plugin = new RolesPlugin();
      const result = plugin.validate({
        name: "Viewer",
        slug: "viewer",
        description: "",
        is_system: "",
      });
      assertEquals(result.valid, true);
    });
  });
});

describe("RolesPlugin.validateAsync() — slug uniqueness", () => {
  it("should pass when slug is unique", async () => {
    const plugin = new RolesPlugin();
    const storage = new IndexedInMemoryStorage();
    plugin.storage = storage;

    const result = await plugin.validateAsync(
      roleData({ slug: "unique-role" }),
    );
    assertEquals(result.valid, true);
  });

  it("should reject duplicate slug", async () => {
    const plugin = new RolesPlugin();
    const storage = new IndexedInMemoryStorage();
    plugin.storage = storage;

    await storage.set("existing-1", {
      id: "existing-1",
      slug: "taken-slug",
      name: "Existing",
      description: "",
      is_system: "false",
    });

    const result = await plugin.validateAsync(
      roleData({ slug: "taken-slug" }),
    );
    assertEquals(result.valid, false);
    assertEquals(result.errors.slug, 'slug "taken-slug" is already in use');
  });

  it("should accept duplicate slug with excludeId", async () => {
    const plugin = new RolesPlugin();
    const storage = new IndexedInMemoryStorage();
    plugin.storage = storage;

    await storage.set("role-1", {
      id: "role-1",
      slug: "my-role",
      name: "My Role",
      description: "",
      is_system: "false",
    });

    const result = await plugin.validateAsync(
      roleData({ slug: "my-role" }),
      "role-1",
    );
    assertEquals(result.valid, true);
  });

  it("should still fail synchronous checks in async", async () => {
    const plugin = new RolesPlugin();
    const storage = new IndexedInMemoryStorage();
    plugin.storage = storage;

    const result = await plugin.validateAsync(
      roleData({ slug: "Invalid Slug!" }),
    );
    assertEquals(result.valid, false);
    assertEquals(result.errors.slug !== undefined, true);
  });
});
