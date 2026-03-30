/**
 * Coverage tests for storage/schema.ts — migration v2 and v3 execution paths
 */
import { afterEach, beforeEach, describe, it } from "@std/testing/bdd";
import { assertEquals } from "@std/assert";
import { CURRENT_SCHEMA_VERSION, runMigrations } from "../storage/schema.ts";

describe("Schema migrations — v2 page migration", () => {
  let kv: Deno.Kv;

  beforeEach(async () => {
    kv = await Deno.openKv(":memory:");
  });

  afterEach(() => {
    kv.close();
  });

  it("should migrate old {name, html} page items to new schema", async () => {
    // Set schema version to 1 so v2 migration runs
    await kv.set(["_meta", "schema_version"], 1);

    // Insert an old-format page item
    const oldItem = {
      id: "page-1",
      name: "My Test Page",
      html: "<h1>Hello</h1>",
    };
    await kv.set(["plugins", "page-plugin", "items", "page-1"], oldItem);

    const version = await runMigrations(kv);
    assertEquals(version, CURRENT_SCHEMA_VERSION);

    // Verify migrated item
    const entry = await kv.get<Record<string, unknown>>([
      "plugins",
      "page-plugin",
      "items",
      "page-1",
    ]);
    const migrated = entry.value!;
    assertEquals(migrated.slug, "my-test-page");
    assertEquals(migrated.title, "My Test Page");
    assertEquals(migrated.body, "<h1>Hello</h1>");
    assertEquals(migrated.status, "draft");
    assertEquals(migrated.seo_title, "");
    assertEquals(migrated.seo_description, "");
    // Old fields should be removed
    assertEquals("name" in migrated, false);
    assertEquals("html" in migrated, false);
  });

  it("should skip items that already have new schema fields", async () => {
    await kv.set(["_meta", "schema_version"], 1);

    const newItem = {
      id: "page-2",
      slug: "existing-page",
      title: "Existing",
      body: "<p>body</p>",
      status: "published",
    };
    await kv.set(["plugins", "page-plugin", "items", "page-2"], newItem);

    await runMigrations(kv);

    const entry = await kv.get<Record<string, unknown>>([
      "plugins",
      "page-plugin",
      "items",
      "page-2",
    ]);
    // Should remain unchanged
    assertEquals(entry.value!.slug, "existing-page");
    assertEquals(entry.value!.title, "Existing");
  });

  it("should handle items with null/undefined values in v2 migration", async () => {
    await kv.set(["_meta", "schema_version"], 1);

    // Insert item with no name or html
    const oldItem = { id: "page-3" };
    await kv.set(["plugins", "page-plugin", "items", "page-3"], oldItem);

    await runMigrations(kv);

    const entry = await kv.get<Record<string, unknown>>([
      "plugins",
      "page-plugin",
      "items",
      "page-3",
    ]);
    const migrated = entry.value!;
    assertEquals(migrated.title, "");
    assertEquals(migrated.body, "");
    // slug from empty name falls back to id
    assertEquals(migrated.slug, "page-3");
  });
});

describe("Schema migrations — v3 widgets_enabled migration", () => {
  let kv: Deno.Kv;

  beforeEach(async () => {
    kv = await Deno.openKv(":memory:");
  });

  afterEach(() => {
    kv.close();
  });

  it("should add widgets_enabled to items that lack it", async () => {
    await kv.set(["_meta", "schema_version"], 2);

    const item = {
      id: "page-1",
      slug: "test",
      title: "Test",
      body: "<p>Hello</p>",
      status: "published",
    };
    await kv.set(["plugins", "page-plugin", "items", "page-1"], item);

    await runMigrations(kv);

    const entry = await kv.get<Record<string, unknown>>([
      "plugins",
      "page-plugin",
      "items",
      "page-1",
    ]);
    assertEquals(entry.value!.widgets_enabled, false);
  });

  it("should skip items that already have widgets_enabled", async () => {
    await kv.set(["_meta", "schema_version"], 2);

    const item = {
      id: "page-2",
      slug: "test2",
      title: "Test2",
      body: "",
      status: "draft",
      widgets_enabled: true,
    };
    await kv.set(["plugins", "page-plugin", "items", "page-2"], item);

    await runMigrations(kv);

    const entry = await kv.get<Record<string, unknown>>([
      "plugins",
      "page-plugin",
      "items",
      "page-2",
    ]);
    // Should remain true, not overwritten to false
    assertEquals(entry.value!.widgets_enabled, true);
  });

  it("should handle non-object items gracefully in v3 migration", async () => {
    await kv.set(["_meta", "schema_version"], 2);

    // Store a non-object (edge case)
    await kv.set(["plugins", "page-plugin", "items", "bad"], null);

    // Should not throw
    const version = await runMigrations(kv);
    assertEquals(version, CURRENT_SCHEMA_VERSION);
  });
});
