import { afterEach, beforeEach, describe, it } from "@std/testing/bdd";
import { assertEquals, assertExists } from "@std/assert";
import { DenoKvStorage } from "../storage/denoKvStorage.ts";

describe("DenoKvStorage", () => {
  let kv: Deno.Kv;
  let storage: DenoKvStorage;

  beforeEach(async () => {
    kv = await Deno.openKv(":memory:");
    storage = new DenoKvStorage(kv, "test-plugin", {
      name: "string",
      slug: "string",
      active: "boolean",
    });
  });

  afterEach(() => {
    kv.close();
  });

  describe("get()", () => {
    it("should return null for non-existent item", async () => {
      const result = await storage.get("nonexistent");
      assertEquals(result, null);
    });

    it("should return item after set", async () => {
      await storage.set("1", { id: "1", name: "Alpha", slug: "alpha" });
      const result = await storage.get("1");
      assertExists(result);
      assertEquals(result!.name, "Alpha");
      assertEquals(result!.slug, "alpha");
    });
  });

  describe("set()", () => {
    it("should create a new item", async () => {
      await storage.set("1", { id: "1", name: "Alpha", slug: "alpha" });
      const item = await storage.get("1");
      assertEquals(item!.id, "1");
    });

    it("should update an existing item without changing count", async () => {
      await storage.set("1", { id: "1", name: "Alpha", slug: "alpha" });
      await storage.set("1", {
        id: "1",
        name: "Alpha Updated",
        slug: "alpha-v2",
      });
      const count = await storage.count();
      assertEquals(count, 1);
      const item = await storage.get("1");
      assertEquals(item!.name, "Alpha Updated");
    });

    it("should increment count for new items", async () => {
      await storage.set("1", { id: "1", name: "A", slug: "a" });
      await storage.set("2", { id: "2", name: "B", slug: "b" });
      const count = await storage.count();
      assertEquals(count, 2);
    });

    it("should ensure id is set on the stored item", async () => {
      await storage.set("my-id", { id: "wrong", name: "Test", slug: "test" });
      const item = await storage.get("my-id");
      assertEquals(item!.id, "my-id");
    });
  });

  describe("delete()", () => {
    it("should return false for non-existent item", async () => {
      const result = await storage.delete("nonexistent");
      assertEquals(result, false);
    });

    it("should delete an existing item and decrement count", async () => {
      await storage.set("1", { id: "1", name: "A", slug: "a" });
      await storage.set("2", { id: "2", name: "B", slug: "b" });
      assertEquals(await storage.count(), 2);

      const result = await storage.delete("1");
      assertEquals(result, true);
      assertEquals(await storage.get("1"), null);
      assertEquals(await storage.count(), 1);
    });

    it("should not go below zero count", async () => {
      await storage.set("1", { id: "1", name: "A", slug: "a" });
      await storage.delete("1");
      assertEquals(await storage.count(), 0);
    });
  });

  describe("list()", () => {
    it("should return empty array when no items", async () => {
      const items = await storage.list();
      assertEquals(items.length, 0);
    });

    it("should return all items", async () => {
      await storage.set("1", { id: "1", name: "A", slug: "a" });
      await storage.set("2", { id: "2", name: "B", slug: "b" });
      await storage.set("3", { id: "3", name: "C", slug: "c" });
      const items = await storage.list();
      assertEquals(items.length, 3);
    });

    it("should paginate results", async () => {
      await storage.set("1", { id: "1", name: "A", slug: "a" });
      await storage.set("2", { id: "2", name: "B", slug: "b" });
      await storage.set("3", { id: "3", name: "C", slug: "c" });

      const page1 = await storage.list({ page: 1, limit: 2 });
      assertEquals(page1.length, 2);

      const page2 = await storage.list({ page: 2, limit: 2 });
      assertEquals(page2.length, 1);

      const page3 = await storage.list({ page: 3, limit: 2 });
      assertEquals(page3.length, 0);
    });

    it("should filter by search text", async () => {
      await storage.set("1", { id: "1", name: "Apple", slug: "apple" });
      await storage.set("2", { id: "2", name: "Banana", slug: "banana" });
      await storage.set("3", { id: "3", name: "Apricot", slug: "apricot" });

      const results = await storage.list({ search: "ap" });
      assertEquals(results.length, 2);
    });

    it("should search case-insensitively", async () => {
      await storage.set("1", { id: "1", name: "Apple", slug: "apple" });
      const results = await storage.list({ search: "APPLE" });
      assertEquals(results.length, 1);
    });

    it("should search specific fields when searchFields provided", async () => {
      await storage.set("1", { id: "1", name: "Apple", slug: "fruit" });
      const results = await storage.list({
        search: "fruit",
        searchFields: ["slug"],
      });
      assertEquals(results.length, 1);

      const noResults = await storage.list({
        search: "fruit",
        searchFields: ["name"],
      });
      assertEquals(noResults.length, 0);
    });
  });

  describe("count()", () => {
    it("should return 0 when empty", async () => {
      assertEquals(await storage.count(), 0);
    });

    it("should return correct count", async () => {
      await storage.set("1", { id: "1", name: "A", slug: "a" });
      await storage.set("2", { id: "2", name: "B", slug: "b" });
      assertEquals(await storage.count(), 2);
    });

    it("should count with search filter", async () => {
      await storage.set("1", { id: "1", name: "Apple", slug: "apple" });
      await storage.set("2", { id: "2", name: "Banana", slug: "banana" });
      await storage.set("3", { id: "3", name: "Apricot", slug: "apricot" });

      assertEquals(
        await storage.count({ search: "ap", searchFields: ["name"] }),
        2,
      );
      assertEquals(
        await storage.count({ search: "banana" }),
        1,
      );
    });
  });

  describe("indexes", () => {
    it("should index string fields and support listByIndex", async () => {
      await storage.set("1", { id: "1", name: "Tech", slug: "tech" });
      await storage.set("2", { id: "2", name: "Science", slug: "science" });
      await storage.set("3", { id: "3", name: "Tech News", slug: "tech" });

      const techs = await storage.listByIndex("slug", "tech");
      assertEquals(techs.length, 2);

      const sciences = await storage.listByIndex("slug", "science");
      assertEquals(sciences.length, 1);
    });

    it("should be case-insensitive in index lookup", async () => {
      await storage.set("1", { id: "1", name: "Tech", slug: "Tech" });
      const results = await storage.listByIndex("slug", "tech");
      assertEquals(results.length, 1);
    });

    it("should update indexes when item is updated", async () => {
      await storage.set("1", { id: "1", name: "Tech", slug: "tech" });

      // Change slug
      await storage.set("1", {
        id: "1",
        name: "Technology",
        slug: "technology",
      });

      const oldIndex = await storage.listByIndex("slug", "tech");
      assertEquals(oldIndex.length, 0);

      const newIndex = await storage.listByIndex("slug", "technology");
      assertEquals(newIndex.length, 1);
      assertEquals(newIndex[0].name, "Technology");
    });

    it("should remove indexes when item is deleted", async () => {
      await storage.set("1", { id: "1", name: "Tech", slug: "tech" });
      await storage.delete("1");

      const results = await storage.listByIndex("slug", "tech");
      assertEquals(results.length, 0);
    });

    it("should return empty array for non-existent index value", async () => {
      const results = await storage.listByIndex("slug", "nonexistent");
      assertEquals(results.length, 0);
    });

    it("should respect custom indexFields", async () => {
      kv.close();
      kv = await Deno.openKv(":memory:");
      const customStorage = new DenoKvStorage(
        kv,
        "custom",
        { name: "string", slug: "string", description: "string" },
        ["slug"], // Only index slug
      );

      await customStorage.set("1", {
        id: "1",
        name: "Test",
        slug: "test",
        description: "A test item",
      });

      // slug is indexed
      const bySlug = await customStorage.listByIndex("slug", "test");
      assertEquals(bySlug.length, 1);

      // name is NOT indexed (not in indexFields)
      const byName = await customStorage.listByIndex("name", "Test");
      assertEquals(byName.length, 0);
    });
  });

  describe("full CRUD lifecycle", () => {
    it("should create, read, update, delete correctly", async () => {
      // Create
      await storage.set("item-1", {
        id: "item-1",
        name: "Original",
        slug: "original",
      });
      assertEquals(await storage.count(), 1);

      // Read
      const created = await storage.get("item-1");
      assertEquals(created!.name, "Original");

      // Update
      await storage.set("item-1", {
        id: "item-1",
        name: "Updated",
        slug: "updated",
      });
      assertEquals(await storage.count(), 1);
      const updated = await storage.get("item-1");
      assertEquals(updated!.name, "Updated");

      // Delete
      await storage.delete("item-1");
      assertEquals(await storage.count(), 0);
      assertEquals(await storage.get("item-1"), null);
    });
  });
});
