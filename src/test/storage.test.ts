import { describe, it } from "@std/testing/bdd";
import { assertEquals, assertExists } from "@std/assert";
import { InMemoryStorage } from "../models/Storage.ts";

describe("InMemoryStorage", () => {
  it("should return null for non-existent ID", async () => {
    const storage = new InMemoryStorage();
    const result = await storage.get("non-existent-id");
    assertEquals(result, null);
  });

  it("should set and get an item (roundtrip)", async () => {
    const storage = new InMemoryStorage();
    const item = { id: "1", name: "Test Item", value: "hello" };
    await storage.set("1", item);
    const result = await storage.get("1");
    assertExists(result);
    assertEquals(result.id, "1");
    assertEquals(result.name, "Test Item");
    assertEquals(result.value, "hello");
  });

  it("should overwrite existing item on set", async () => {
    const storage = new InMemoryStorage();
    await storage.set("1", { id: "1", name: "Original" });
    await storage.set("1", { id: "1", name: "Updated" });
    const result = await storage.get("1");
    assertEquals(result!.name, "Updated");
  });

  it("should always store id from the key argument", async () => {
    const storage = new InMemoryStorage();
    await storage.set("abc", { id: "different", name: "Item" });
    const result = await storage.get("abc");
    assertEquals(result!.id, "abc");
  });

  it("should list all items", async () => {
    const storage = new InMemoryStorage();
    await storage.set("1", { id: "1", name: "A" });
    await storage.set("2", { id: "2", name: "B" });
    await storage.set("3", { id: "3", name: "C" });
    const items = await storage.list();
    assertEquals(items.length, 3);
  });

  it("should list empty array when no items", async () => {
    const storage = new InMemoryStorage();
    const items = await storage.list();
    assertEquals(items, []);
  });

  it("should paginate with page and limit", async () => {
    const storage = new InMemoryStorage();
    for (let i = 1; i <= 25; i++) {
      await storage.set(String(i), { id: String(i), name: `Item ${i}` });
    }
    const page1 = await storage.list({ page: 1, limit: 10 });
    assertEquals(page1.length, 10);
    const page3 = await storage.list({ page: 3, limit: 10 });
    assertEquals(page3.length, 5);
  });

  it("should default to page 1 with limit 20 when no options given", async () => {
    const storage = new InMemoryStorage();
    for (let i = 1; i <= 25; i++) {
      await storage.set(String(i), { id: String(i), name: `Item ${i}` });
    }
    const items = await storage.list();
    assertEquals(items.length, 20);
  });

  it("should filter by search and searchFields", async () => {
    const storage = new InMemoryStorage();
    await storage.set("1", { id: "1", title: "Hello World", body: "content" });
    await storage.set("2", {
      id: "2",
      title: "Foo Bar",
      body: "hello content",
    });
    await storage.set("3", { id: "3", title: "No match", body: "nothing" });

    const results = await storage.list({
      search: "hello",
      searchFields: ["title"],
    });
    assertEquals(results.length, 1);
    assertEquals(results[0].id, "1");
  });

  it("should search across multiple searchFields", async () => {
    const storage = new InMemoryStorage();
    await storage.set("1", { id: "1", title: "Hello", body: "nothing" });
    await storage.set("2", { id: "2", title: "nothing", body: "Hello" });
    await storage.set("3", { id: "3", title: "no", body: "no" });

    const results = await storage.list({
      search: "hello",
      searchFields: ["title", "body"],
    });
    assertEquals(results.length, 2);
  });

  it("should be case-insensitive in search", async () => {
    const storage = new InMemoryStorage();
    await storage.set("1", { id: "1", title: "UPPERCASE" });
    const results = await storage.list({
      search: "uppercase",
      searchFields: ["title"],
    });
    assertEquals(results.length, 1);
  });

  it("should return false when deleting non-existent item", async () => {
    const storage = new InMemoryStorage();
    const result = await storage.delete("ghost");
    assertEquals(result, false);
  });

  it("should return true when deleting existing item", async () => {
    const storage = new InMemoryStorage();
    await storage.set("1", { id: "1", name: "to delete" });
    const result = await storage.delete("1");
    assertEquals(result, true);
    const item = await storage.get("1");
    assertEquals(item, null);
  });

  it("should count all items with no options", async () => {
    const storage = new InMemoryStorage();
    await storage.set("1", { id: "1" });
    await storage.set("2", { id: "2" });
    await storage.set("3", { id: "3" });
    const count = await storage.count();
    assertEquals(count, 3);
  });

  it("should count 0 when store is empty", async () => {
    const storage = new InMemoryStorage();
    const count = await storage.count();
    assertEquals(count, 0);
  });

  it("should count with search filter", async () => {
    const storage = new InMemoryStorage();
    await storage.set("1", { id: "1", name: "apple" });
    await storage.set("2", { id: "2", name: "banana" });
    await storage.set("3", { id: "3", name: "apricot" });
    const count = await storage.count({
      search: "ap",
      searchFields: ["name"],
    });
    assertEquals(count, 2);
  });

  it("should count all items when search is empty string", async () => {
    const storage = new InMemoryStorage();
    await storage.set("1", { id: "1", name: "a" });
    await storage.set("2", { id: "2", name: "b" });
    const count = await storage.count({ search: "", searchFields: ["name"] });
    assertEquals(count, 2);
  });

  it("should count all items when searchFields is empty array", async () => {
    const storage = new InMemoryStorage();
    await storage.set("1", { id: "1", name: "a" });
    await storage.set("2", { id: "2", name: "b" });
    const count = await storage.count({
      search: "a",
      searchFields: [],
    });
    assertEquals(count, 2);
  });
});
