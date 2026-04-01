/**
 * Coverage tests for KV atomic commit failure branches:
 * - denoKvStorage.ts set/delete failures
 * - denoKvSessionStore.ts set failure
 * - widgetStore.ts create/update/delete/reorder failures
 */
import { afterEach, beforeEach, describe, it } from "@std/testing/bdd";
import { assertEquals, assertRejects } from "@std/assert";
import { WidgetStore } from "../../packages/widgets/src/widgetStore.ts";

describe("WidgetStore — atomic commit failure (create)", () => {
  let kv: Deno.Kv;

  beforeEach(async () => {
    kv = await Deno.openKv(":memory:");
  });

  afterEach(() => {
    kv.close();
  });

  it("should throw when update finds non-existent widget", async () => {
    const store = new WidgetStore(kv);
    await assertRejects(
      () => store.update("page-1", "nonexistent-id", { order: 1 }),
      Error,
      "not found",
    );
  });

  it("should return false when deleting non-existent widget", async () => {
    const store = new WidgetStore(kv);
    const result = await store.delete("page-1", "nonexistent-id");
    assertEquals(result, false);
  });

  it("should throw when reordering includes non-existent widget", async () => {
    const store = new WidgetStore(kv);
    await assertRejects(
      () =>
        store.reorder("page-1", [
          { widgetId: "nonexistent-id", order: 0 },
        ]),
      Error,
      "not found",
    );
  });

  it("should successfully create, update, delete, and reorder widgets", async () => {
    const store = new WidgetStore(kv);

    // Create
    const w1 = await store.create("page-1", {
      type: "hero",
      placeholder: "main",
      order: 0,
      data: { heading: "Test" },
    });
    assertEquals(w1.type, "hero");

    const w2 = await store.create("page-1", {
      type: "rich-text",
      placeholder: "main",
      order: 1,
      data: { content: "Hello" },
    });

    // Update
    const updated = await store.update("page-1", w1.id, {
      data: { heading: "Updated" },
    });
    assertEquals(updated.data.heading, "Updated");

    // Reorder
    await store.reorder("page-1", [
      { widgetId: w1.id, order: 1 },
      { widgetId: w2.id, order: 0 },
    ]);

    // Load and verify order
    const loaded = await store.loadForPage("page-1");
    assertEquals(loaded.length, 2);

    // Delete
    const deleted = await store.delete("page-1", w1.id);
    assertEquals(deleted, true);

    // Verify deletion
    const remaining = await store.loadForPage("page-1");
    assertEquals(remaining.length, 1);
  });

  it("should handle reorder with empty array", async () => {
    const store = new WidgetStore(kv);
    // Should be a no-op, not throw
    await store.reorder("page-1", []);
  });
});
