import { afterEach, beforeEach, describe, it } from "@std/testing/bdd";
import { assertEquals, assertExists, assertRejects } from "@std/assert";
import { WidgetStore } from "../widgets/widgetStore.ts";

describe("WidgetStore", () => {
  let kv: Deno.Kv;
  let store: WidgetStore;

  beforeEach(async () => {
    kv = await Deno.openKv(":memory:");
    store = new WidgetStore(kv);
  });

  afterEach(() => {
    kv.close();
  });

  describe("create()", () => {
    it("should persist a widget instance in KV and return it", async () => {
      const instance = await store.create("page-1", {
        type: "hero",
        placeholder: "main",
        order: 0,
        data: { title: "Hello" },
      });

      assertExists(instance.id);
      assertEquals(instance.type, "hero");
      assertEquals(instance.placeholder, "main");
      assertEquals(instance.order, 0);
      assertEquals(instance.data.title, "Hello");
      assertExists(instance.created_at);
      assertExists(instance.updated_at);
    });

    it("should generate a unique UUID for each created instance", async () => {
      const a = await store.create("page-1", {
        type: "hero",
        placeholder: "main",
        order: 0,
        data: {},
      });
      const b = await store.create("page-1", {
        type: "rich-text",
        placeholder: "main",
        order: 1,
        data: {},
      });

      assertEquals(a.id !== b.id, true);
    });
  });

  describe("loadForPage()", () => {
    it("should return instances sorted by placeholder then order", async () => {
      await store.create("page-sort", {
        type: "rich-text",
        placeholder: "sidebar",
        order: 1,
        data: {},
      });
      await store.create("page-sort", {
        type: "hero",
        placeholder: "main",
        order: 0,
        data: {},
      });
      await store.create("page-sort", {
        type: "image",
        placeholder: "main",
        order: 2,
        data: {},
      });
      await store.create("page-sort", {
        type: "gallery",
        placeholder: "sidebar",
        order: 0,
        data: {},
      });

      const instances = await store.loadForPage("page-sort");
      assertEquals(instances.length, 4);

      // Sorted by placeholder ("main" < "sidebar"), then by order within each
      assertEquals(instances[0].placeholder, "main");
      assertEquals(instances[0].order, 0);
      assertEquals(instances[1].placeholder, "main");
      assertEquals(instances[1].order, 2);
      assertEquals(instances[2].placeholder, "sidebar");
      assertEquals(instances[2].order, 0);
      assertEquals(instances[3].placeholder, "sidebar");
      assertEquals(instances[3].order, 1);
    });

    it("should return empty array for a page with no widgets", async () => {
      const instances = await store.loadForPage("page-empty");
      assertEquals(instances, []);
    });

    it("should isolate widgets between different pages", async () => {
      await store.create("page-a", {
        type: "hero",
        placeholder: "main",
        order: 0,
        data: {},
      });

      const forPageB = await store.loadForPage("page-b");
      assertEquals(forPageB, []);
    });
  });

  describe("update()", () => {
    it("should update widget data fields", async () => {
      const created = await store.create("page-upd", {
        type: "rich-text",
        placeholder: "main",
        order: 0,
        data: { body: "Original" },
      });

      const updated = await store.update("page-upd", created.id, {
        data: { body: "Updated" },
      });

      assertEquals(updated.data.body, "Updated");
      assertEquals(updated.id, created.id);
      assertEquals(updated.type, "rich-text");
    });

    it("should bump updated_at on update", async () => {
      const created = await store.create("page-ts", {
        type: "html",
        placeholder: "main",
        order: 0,
        data: {},
      });

      // Small pause to ensure timestamp differs
      await new Promise((r) => setTimeout(r, 2));

      const updated = await store.update("page-ts", created.id, {
        data: { html: "<b>Hi</b>" },
      });

      assertEquals(updated.created_at, created.created_at);
      assertEquals(updated.updated_at >= created.updated_at, true);
    });

    it("should throw when updating a non-existent widget", async () => {
      await assertRejects(
        () => store.update("page-x", "nonexistent-id", { data: {} }),
        Error,
      );
    });
  });

  describe("delete()", () => {
    it("should remove a widget from KV and return true", async () => {
      const instance = await store.create("page-del", {
        type: "embed",
        placeholder: "footer",
        order: 0,
        data: {},
      });

      const deleted = await store.delete("page-del", instance.id);
      assertEquals(deleted, true);

      const remaining = await store.loadForPage("page-del");
      assertEquals(remaining.length, 0);
    });

    it("should return false for a non-existent widget", async () => {
      const result = await store.delete("page-del", "does-not-exist");
      assertEquals(result, false);
    });
  });

  describe("reorder()", () => {
    it("should update order fields atomically", async () => {
      const a = await store.create("page-reorder", {
        type: "hero",
        placeholder: "main",
        order: 0,
        data: {},
      });
      const b = await store.create("page-reorder", {
        type: "rich-text",
        placeholder: "main",
        order: 1,
        data: {},
      });

      // Swap orders
      await store.reorder("page-reorder", [
        { widgetId: a.id, order: 1 },
        { widgetId: b.id, order: 0 },
      ]);

      const instances = await store.loadForPage("page-reorder");
      assertEquals(instances.length, 2);
      // After reorder, b (order:0) should come first
      assertEquals(instances[0].id, b.id);
      assertEquals(instances[0].order, 0);
      assertEquals(instances[1].id, a.id);
      assertEquals(instances[1].order, 1);
    });

    it("should be a no-op when given an empty array", async () => {
      await store.create("page-noop", {
        type: "hero",
        placeholder: "main",
        order: 0,
        data: {},
      });

      // Should not throw
      await store.reorder("page-noop", []);

      const instances = await store.loadForPage("page-noop");
      assertEquals(instances.length, 1);
    });

    it("should throw when reordering a non-existent widget", async () => {
      await assertRejects(
        () =>
          store.reorder("page-reorder-err", [
            { widgetId: "ghost-id", order: 0 },
          ]),
        Error,
      );
    });
  });
});
