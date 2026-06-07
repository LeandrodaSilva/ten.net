import { describe, it } from "@std/testing/bdd";
import { assertEquals } from "@std/assert";
import {
  buildPermissionKey,
  parsePermissions,
  type PermissionAction,
  serializePermissions,
} from "../src/models/Permission.ts";

describe("Permission helpers", () => {
  describe("parsePermissions", () => {
    it("parses a valid JSON array of actions", () => {
      assertEquals(parsePermissions('["read","create"]'), ["read", "create"]);
    });

    it("filters out unknown actions", () => {
      assertEquals(
        parsePermissions('["read","bogus","delete",42]'),
        ["read", "delete"],
      );
    });

    it("returns [] for a non-array JSON value", () => {
      assertEquals(parsePermissions('{"a":1}'), []);
      assertEquals(parsePermissions('"read"'), []);
    });

    it("returns [] for invalid JSON", () => {
      assertEquals(parsePermissions("not json"), []);
      assertEquals(parsePermissions(""), []);
    });
  });

  describe("serializePermissions", () => {
    it("serializes an array of actions to JSON", () => {
      const perms: PermissionAction[] = ["read", "update"];
      assertEquals(serializePermissions(perms), '["read","update"]');
    });

    it("round-trips with parsePermissions", () => {
      const perms: PermissionAction[] = ["read", "create", "update", "delete"];
      assertEquals(parsePermissions(serializePermissions(perms)), perms);
    });
  });

  describe("buildPermissionKey", () => {
    it("builds the KV key tuple", () => {
      assertEquals(buildPermissionKey("admin", "posts"), [
        "permissions",
        "admin",
        "posts",
      ]);
    });
  });
});
