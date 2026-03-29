import { describe, it } from "@std/testing/bdd";
import { assertEquals } from "@std/assert";
import { UsersPlugin } from "../plugins/usersPlugin.ts";
import { InMemoryStorage } from "../models/Storage.ts";
import type { StorageItem } from "../models/Storage.ts";

/** InMemoryStorage with listByIndex support for uniqueness tests. */
class IndexedInMemoryStorage extends InMemoryStorage {
  async listByIndex(field: string, value: string): Promise<StorageItem[]> {
    const all = await this.list({ page: 1, limit: 1000 });
    return all.filter((item) => String(item[field] ?? "") === value);
  }
}

/** Helper: create valid user data with overrides. */
function userData(
  overrides?: Record<string, unknown>,
): Record<string, unknown> {
  return {
    email: "user@example.com",
    display_name: "Test User",
    role_id: "role-1",
    status: "active",
    ...overrides,
  };
}

describe("UsersPlugin", () => {
  it("should have correct name", () => {
    const plugin = new UsersPlugin();
    assertEquals(plugin.name, "UserPlugin");
  });

  it("should have correct model with role_id (not role)", () => {
    const plugin = new UsersPlugin();
    assertEquals(plugin.model.email, "string");
    assertEquals(plugin.model.display_name, "string");
    assertEquals(plugin.model.role_id, "string");
    assertEquals(plugin.model.status, "string");
    assertEquals(plugin.model.role, undefined);
  });
});

describe("UsersPlugin.validate()", () => {
  describe("email validation", () => {
    it("should accept valid email", () => {
      const plugin = new UsersPlugin();
      const result = plugin.validate(userData({ email: "admin@test.com" }));
      assertEquals(result.errors.email, undefined);
    });

    it("should require email", () => {
      const plugin = new UsersPlugin();
      const result = plugin.validate(userData({ email: "" }));
      assertEquals(result.valid, false);
      assertEquals(result.errors.email !== undefined, true);
    });

    it("should reject invalid email format", () => {
      const plugin = new UsersPlugin();
      const result = plugin.validate(userData({ email: "not-an-email" }));
      assertEquals(result.valid, false);
      assertEquals(
        result.errors.email,
        "email must be a valid email address",
      );
    });

    it("should reject email without domain", () => {
      const plugin = new UsersPlugin();
      const result = plugin.validate(userData({ email: "user@" }));
      assertEquals(result.valid, false);
    });

    it("should reject email without @", () => {
      const plugin = new UsersPlugin();
      const result = plugin.validate(userData({ email: "userexample.com" }));
      assertEquals(result.valid, false);
    });
  });

  describe("display_name validation", () => {
    it("should require display_name", () => {
      const plugin = new UsersPlugin();
      const result = plugin.validate(userData({ display_name: "" }));
      assertEquals(result.valid, false);
      assertEquals(result.errors.display_name !== undefined, true);
    });

    it("should accept valid display_name", () => {
      const plugin = new UsersPlugin();
      const result = plugin.validate(
        userData({ display_name: "John Doe" }),
      );
      assertEquals(result.errors.display_name, undefined);
    });
  });

  describe("role_id validation", () => {
    it("should require role_id", () => {
      const plugin = new UsersPlugin();
      const result = plugin.validate(userData({ role_id: "" }));
      assertEquals(result.valid, false);
      assertEquals(result.errors.role_id !== undefined, true);
    });

    it("should accept valid role_id", () => {
      const plugin = new UsersPlugin();
      const result = plugin.validate(userData({ role_id: "role-123" }));
      assertEquals(result.errors.role_id, undefined);
    });
  });

  describe("status validation", () => {
    it("should accept 'active' status", () => {
      const plugin = new UsersPlugin();
      const result = plugin.validate(userData({ status: "active" }));
      assertEquals(result.errors.status, undefined);
    });

    it("should accept 'inactive' status", () => {
      const plugin = new UsersPlugin();
      const result = plugin.validate(userData({ status: "inactive" }));
      assertEquals(result.errors.status, undefined);
    });

    it("should reject invalid status", () => {
      const plugin = new UsersPlugin();
      const result = plugin.validate(userData({ status: "banned" }));
      assertEquals(result.valid, false);
      assertEquals(
        result.errors.status,
        "status must be active or inactive",
      );
    });

    it("should default status to 'active' when empty", () => {
      const plugin = new UsersPlugin();
      const data = userData({ status: "" });
      plugin.validate(data);
      assertEquals(data.status, "active");
    });

    it("should default status to 'active' when undefined", () => {
      const plugin = new UsersPlugin();
      const data = userData({ status: undefined });
      plugin.validate(data);
      assertEquals(data.status, "active");
    });
  });

  describe("complete valid form", () => {
    it("should validate a fully populated user", () => {
      const plugin = new UsersPlugin();
      const result = plugin.validate({
        email: "admin@test.com",
        display_name: "Admin User",
        role_id: "role-admin",
        status: "active",
      });
      assertEquals(result.valid, true);
      assertEquals(Object.keys(result.errors).length, 0);
    });
  });
});

describe("UsersPlugin.validateAsync() — email uniqueness", () => {
  it("should pass when email is unique", async () => {
    const plugin = new UsersPlugin();
    const storage = new IndexedInMemoryStorage();
    plugin.storage = storage;

    const result = await plugin.validateAsync(
      userData({ email: "unique@test.com" }),
    );
    assertEquals(result.valid, true);
  });

  it("should reject duplicate email", async () => {
    const plugin = new UsersPlugin();
    const storage = new IndexedInMemoryStorage();
    plugin.storage = storage;

    await storage.set("user-1", {
      id: "user-1",
      email: "taken@test.com",
      display_name: "Existing",
      role_id: "role-1",
      status: "active",
    });

    const result = await plugin.validateAsync(
      userData({ email: "taken@test.com" }),
    );
    assertEquals(result.valid, false);
    assertEquals(
      result.errors.email,
      'email "taken@test.com" is already in use',
    );
  });

  it("should accept duplicate email with excludeId", async () => {
    const plugin = new UsersPlugin();
    const storage = new IndexedInMemoryStorage();
    plugin.storage = storage;

    await storage.set("user-1", {
      id: "user-1",
      email: "me@test.com",
      display_name: "Me",
      role_id: "role-1",
      status: "active",
    });

    const result = await plugin.validateAsync(
      userData({ email: "me@test.com" }),
      "user-1",
    );
    assertEquals(result.valid, true);
  });

  it("should still fail synchronous checks in async", async () => {
    const plugin = new UsersPlugin();
    const storage = new IndexedInMemoryStorage();
    plugin.storage = storage;

    const result = await plugin.validateAsync(
      userData({ email: "not-an-email" }),
    );
    assertEquals(result.valid, false);
    assertEquals(result.errors.email !== undefined, true);
  });
});
