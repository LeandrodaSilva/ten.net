import { describe, it } from "@std/testing/bdd";
import { assertEquals } from "@std/assert";
import {
  buildPermissionKey,
  parsePermissions,
  serializePermissions,
} from "../models/Permission.ts";
import type { PermissionAction } from "../models/Permission.ts";

describe("parsePermissions", () => {
  it("should parse valid JSON array of permissions", () => {
    const result = parsePermissions('["read","create","update","delete"]');
    assertEquals(result, ["read", "create", "update", "delete"]);
  });

  it("should parse array with single permission", () => {
    const result = parsePermissions('["read"]');
    assertEquals(result, ["read"]);
  });

  it("should parse empty array", () => {
    const result = parsePermissions("[]");
    assertEquals(result, []);
  });

  it("should filter out invalid permission values", () => {
    const result = parsePermissions('["read","invalid","create","archive"]');
    assertEquals(result, ["read", "create"]);
  });

  it("should filter out non-string values", () => {
    const result = parsePermissions('[123, "read", null, "update"]');
    assertEquals(result, ["read", "update"]);
  });

  it("should return empty array for invalid JSON", () => {
    const result = parsePermissions("not-json");
    assertEquals(result, []);
  });

  it("should return empty array for non-array JSON", () => {
    const result = parsePermissions('{"key":"value"}');
    assertEquals(result, []);
  });

  it("should return empty array for empty string", () => {
    const result = parsePermissions("");
    assertEquals(result, []);
  });
});

describe("serializePermissions", () => {
  it("should serialize array of permissions to JSON", () => {
    const result = serializePermissions(["read", "create"]);
    assertEquals(result, '["read","create"]');
  });

  it("should serialize empty array", () => {
    const result = serializePermissions([]);
    assertEquals(result, "[]");
  });

  it("should serialize all four permissions", () => {
    const perms: PermissionAction[] = [
      "read",
      "create",
      "update",
      "delete",
    ];
    const result = serializePermissions(perms);
    assertEquals(result, '["read","create","update","delete"]');
  });
});

describe("buildPermissionKey", () => {
  it("should build correct KV key for role+resource", () => {
    const key = buildPermissionKey("admin", "posts");
    assertEquals(key, ["permissions", "admin", "posts"]);
  });

  it("should build correct KV key for custom role", () => {
    const key = buildPermissionKey("content-editor", "page-plugin");
    assertEquals(key, ["permissions", "content-editor", "page-plugin"]);
  });

  it("should build correct KV key for dashboard", () => {
    const key = buildPermissionKey("viewer", "dashboard");
    assertEquals(key, ["permissions", "viewer", "dashboard"]);
  });
});

describe("roundtrip: serialize then parse", () => {
  it("should produce identical array after roundtrip", () => {
    const original: PermissionAction[] = ["read", "create", "update"];
    const serialized = serializePermissions(original);
    const parsed = parsePermissions(serialized);
    assertEquals(parsed, original);
  });
});
