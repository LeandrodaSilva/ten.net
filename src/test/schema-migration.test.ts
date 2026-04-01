import { afterEach, beforeEach, describe, it } from "@std/testing/bdd";
import { assertEquals } from "@std/assert";
import {
  CURRENT_SCHEMA_VERSION,
  getSchemaVersion,
  runMigrations,
} from "../../packages/admin/src/storage/schema.ts";

describe("Schema migrations", () => {
  let kv: Deno.Kv;

  beforeEach(async () => {
    kv = await Deno.openKv(":memory:");
  });

  afterEach(() => {
    kv.close();
  });

  it("should return version 0 for fresh KV", async () => {
    const version = await getSchemaVersion(kv);
    assertEquals(version, 0);
  });

  it("should run migrations and set version to CURRENT_SCHEMA_VERSION", async () => {
    const result = await runMigrations(kv);
    assertEquals(result, CURRENT_SCHEMA_VERSION);

    const version = await getSchemaVersion(kv);
    assertEquals(version, CURRENT_SCHEMA_VERSION);
  });

  it("should be idempotent — running twice returns same version", async () => {
    const first = await runMigrations(kv);
    const second = await runMigrations(kv);
    assertEquals(first, second);
    assertEquals(second, CURRENT_SCHEMA_VERSION);
  });

  it("should skip already-applied migrations", async () => {
    await runMigrations(kv);
    const versionBefore = await getSchemaVersion(kv);

    // Run again — should be a no-op
    const result = await runMigrations(kv);
    assertEquals(result, versionBefore);
  });

  it("CURRENT_SCHEMA_VERSION should be at least 1", () => {
    assertEquals(CURRENT_SCHEMA_VERSION >= 1, true);
  });
});
