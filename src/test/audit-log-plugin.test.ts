import { describe, it } from "@std/testing/bdd";
import { assertEquals, assertExists } from "@std/assert";
import {
  AUDIT_LOG_TTL,
  AuditLogPlugin,
} from "../../packages/admin/src/plugins/auditLogPlugin.ts";

describe("AuditLogPlugin", () => {
  it("should have correct name", () => {
    const plugin = new AuditLogPlugin();
    assertEquals(plugin.name, "AuditLogPlugin");
  });

  it("should have correct description", () => {
    const plugin = new AuditLogPlugin();
    assertEquals(
      plugin.description,
      "Track all admin actions for auditing.",
    );
  });

  it("should have correct slug", () => {
    const plugin = new AuditLogPlugin();
    assertEquals(plugin.slug, "audit-log-plugin");
  });

  it("should have correct model fields", () => {
    const plugin = new AuditLogPlugin();
    assertEquals(plugin.model.action, "string");
    assertEquals(plugin.model.resource, "string");
    assertEquals(plugin.model.resource_id, "string");
    assertEquals(plugin.model.user_id, "string");
    assertEquals(plugin.model.username, "string");
    assertEquals(plugin.model.details, "string");
    assertEquals(plugin.model.timestamp, "string");
  });

  it("should be marked as readonly", () => {
    const plugin = new AuditLogPlugin();
    assertEquals(plugin.readonly, true);
  });

  it("should have AUDIT_LOG_TTL equal to 90 days in ms", () => {
    assertEquals(AUDIT_LOG_TTL, 90 * 24 * 60 * 60 * 1000);
  });
});

describe("AuditLogPlugin.validate()", () => {
  describe("action validation", () => {
    it("should accept 'create' action", () => {
      const plugin = new AuditLogPlugin();
      const result = plugin.validate({
        action: "create",
        resource: "post-plugin",
        resource_id: "abc",
        user_id: "u1",
        username: "admin",
        details: "",
        timestamp: "2026-01-01T00:00:00.000Z",
      });
      assertEquals(result.errors.action, undefined);
    });

    it("should accept 'update' action", () => {
      const plugin = new AuditLogPlugin();
      const result = plugin.validate({
        action: "update",
        resource: "post-plugin",
        resource_id: "abc",
        user_id: "u1",
        username: "admin",
        details: "",
        timestamp: "2026-01-01T00:00:00.000Z",
      });
      assertEquals(result.errors.action, undefined);
    });

    it("should accept 'delete' action", () => {
      const plugin = new AuditLogPlugin();
      const result = plugin.validate({
        action: "delete",
        resource: "post-plugin",
        resource_id: "abc",
        user_id: "u1",
        username: "admin",
        details: "",
        timestamp: "2026-01-01T00:00:00.000Z",
      });
      assertEquals(result.errors.action, undefined);
    });

    it("should reject invalid action", () => {
      const plugin = new AuditLogPlugin();
      const result = plugin.validate({
        action: "archive",
        resource: "post-plugin",
        resource_id: "abc",
        user_id: "u1",
        username: "admin",
        details: "",
        timestamp: "2026-01-01T00:00:00.000Z",
      });
      assertEquals(result.valid, false);
      assertEquals(
        result.errors.action,
        "action must be create, update, or delete",
      );
    });

    it("should reject empty action", () => {
      const plugin = new AuditLogPlugin();
      const result = plugin.validate({
        action: "",
        resource: "post-plugin",
        resource_id: "abc",
        user_id: "u1",
        username: "admin",
        details: "",
        timestamp: "2026-01-01T00:00:00.000Z",
      });
      assertEquals(result.valid, false);
      assertEquals(result.errors.action !== undefined, true);
    });
  });

  describe("required fields", () => {
    it("should require resource", () => {
      const plugin = new AuditLogPlugin();
      const result = plugin.validate({
        action: "create",
        resource: "",
        resource_id: "abc",
        user_id: "u1",
        username: "admin",
        details: "",
        timestamp: "2026-01-01T00:00:00.000Z",
      });
      assertEquals(result.valid, false);
      assertEquals(result.errors.resource !== undefined, true);
    });

    it("should require resource_id", () => {
      const plugin = new AuditLogPlugin();
      const result = plugin.validate({
        action: "create",
        resource: "post-plugin",
        resource_id: "",
        user_id: "u1",
        username: "admin",
        details: "",
        timestamp: "2026-01-01T00:00:00.000Z",
      });
      assertEquals(result.valid, false);
      assertEquals(result.errors.resource_id !== undefined, true);
    });

    it("should require user_id", () => {
      const plugin = new AuditLogPlugin();
      const result = plugin.validate({
        action: "create",
        resource: "post-plugin",
        resource_id: "abc",
        user_id: "",
        username: "admin",
        details: "",
        timestamp: "2026-01-01T00:00:00.000Z",
      });
      assertEquals(result.valid, false);
      assertEquals(result.errors.user_id !== undefined, true);
    });

    it("should require username", () => {
      const plugin = new AuditLogPlugin();
      const result = plugin.validate({
        action: "create",
        resource: "post-plugin",
        resource_id: "abc",
        user_id: "u1",
        username: "",
        details: "",
        timestamp: "2026-01-01T00:00:00.000Z",
      });
      assertEquals(result.valid, false);
      assertEquals(result.errors.username !== undefined, true);
    });

    it("should require timestamp", () => {
      const plugin = new AuditLogPlugin();
      const result = plugin.validate({
        action: "create",
        resource: "post-plugin",
        resource_id: "abc",
        user_id: "u1",
        username: "admin",
        details: "",
        timestamp: "",
      });
      assertEquals(result.valid, false);
      assertEquals(result.errors.timestamp !== undefined, true);
    });
  });

  describe("optional fields", () => {
    it("should accept empty details", () => {
      const plugin = new AuditLogPlugin();
      const result = plugin.validate({
        action: "create",
        resource: "post-plugin",
        resource_id: "abc",
        user_id: "u1",
        username: "admin",
        details: "",
        timestamp: "2026-01-01T00:00:00.000Z",
      });
      assertEquals(result.errors.details, undefined);
    });

    it("should accept details with content", () => {
      const plugin = new AuditLogPlugin();
      const result = plugin.validate({
        action: "create",
        resource: "post-plugin",
        resource_id: "abc",
        user_id: "u1",
        username: "admin",
        details: '{"title":"My Post"}',
        timestamp: "2026-01-01T00:00:00.000Z",
      });
      assertEquals(result.errors.details, undefined);
    });
  });

  describe("complete valid entry", () => {
    it("should validate a fully populated audit entry", () => {
      const plugin = new AuditLogPlugin();
      const result = plugin.validate({
        action: "update",
        resource: "post-plugin",
        resource_id: "post-123",
        user_id: "user-1",
        username: "admin",
        details: '{"title":"Updated Title"}',
        timestamp: "2026-01-01T12:00:00.000Z",
      });
      assertEquals(result.valid, true);
      assertEquals(Object.keys(result.errors).length, 0);
    });
  });
});

describe("AuditLogPlugin.log()", () => {
  it("should return data with automatic timestamp", () => {
    const plugin = new AuditLogPlugin();
    const before = new Date().toISOString();
    const entry = plugin.log({
      action: "create",
      resource: "post-plugin",
      resource_id: "post-1",
      user_id: "user-1",
      username: "admin",
    });
    const after = new Date().toISOString();

    assertEquals(entry.action, "create");
    assertEquals(entry.resource, "post-plugin");
    assertEquals(entry.resource_id, "post-1");
    assertEquals(entry.user_id, "user-1");
    assertEquals(entry.username, "admin");
    assertEquals(entry.details, "");

    // Timestamp should be a valid ISO date between before and after
    assertExists(entry.timestamp);
    assertEquals(entry.timestamp >= before, true);
    assertEquals(entry.timestamp <= after, true);
  });

  it("should include details when provided", () => {
    const plugin = new AuditLogPlugin();
    const entry = plugin.log({
      action: "update",
      resource: "page-plugin",
      resource_id: "page-1",
      user_id: "user-2",
      username: "editor",
      details: '{"field":"title"}',
    });

    assertEquals(entry.details, '{"field":"title"}');
  });

  it("should default details to empty string", () => {
    const plugin = new AuditLogPlugin();
    const entry = plugin.log({
      action: "delete",
      resource: "category-plugin",
      resource_id: "cat-1",
      user_id: "user-1",
      username: "admin",
    });

    assertEquals(entry.details, "");
  });
});
