import "fake-indexeddb/auto";
import { afterEach, describe, it } from "@std/testing/bdd";
import { assertEquals, assertExists } from "@std/assert";
import { IndexedDBStorage } from "../src/storage/indexeddb.ts";

let storage: IndexedDBStorage;
let dbCounter = 0;

function createStorage(): IndexedDBStorage {
  dbCounter++;
  return new IndexedDBStorage(`test-idb-${Date.now()}-${dbCounter}`);
}

describe("IndexedDBStorage", () => {
  afterEach(async () => {
    if (storage) await storage.destroy();
  });

  it("get() retorna null para id inexistente", async () => {
    storage = createStorage();
    const result = await storage.get("non-existent");
    assertEquals(result, null);
  });

  it("set() + get() persiste e recupera item", async () => {
    storage = createStorage();
    const item = { id: "1", title: "Hello", body: "World" };
    await storage.set("1", item);
    const result = await storage.get("1");
    assertExists(result);
    assertEquals(result.id, "1");
    assertEquals(result.title, "Hello");
    assertEquals(result.body, "World");
  });

  it("set() atualiza item existente (upsert)", async () => {
    storage = createStorage();
    await storage.set("1", { id: "1", name: "Original" });
    await storage.set("1", { id: "1", name: "Updated" });
    const result = await storage.get("1");
    assertExists(result);
    assertEquals(result.name, "Updated");
  });

  it("delete() retorna true para existente, false para inexistente", async () => {
    storage = createStorage();
    await storage.set("1", { id: "1", name: "Item" });
    const deleted = await storage.delete("1");
    assertEquals(deleted, true);
    const notFound = await storage.delete("ghost");
    assertEquals(notFound, false);
  });

  it("list() retorna items paginados", async () => {
    storage = createStorage();
    for (let i = 1; i <= 5; i++) {
      await storage.set(`item-${i}`, { id: `item-${i}`, name: `Item ${i}` });
    }
    const page = await storage.list({ page: 1, limit: 2 });
    assertEquals(page.length, 2);
  });

  it("list() com search filtra por substring case-insensitive", async () => {
    storage = createStorage();
    await storage.set("1", { id: "1", title: "Hello World" });
    await storage.set("2", { id: "2", title: "Foo Bar" });
    await storage.set("3", { id: "3", title: "HELLO Again" });
    const results = await storage.list({ search: "hello" });
    assertEquals(results.length, 2);
  });

  it("list() com searchFields filtra apenas campos especificados", async () => {
    storage = createStorage();
    await storage.set("1", { id: "1", title: "Apple", body: "nothing" });
    await storage.set("2", { id: "2", title: "nothing", body: "Apple pie" });
    const results = await storage.list({
      search: "apple",
      searchFields: ["title"],
    });
    assertEquals(results.length, 1);
    assertEquals(results[0].id, "1");
  });

  it("count() sem search retorna total", async () => {
    storage = createStorage();
    await storage.set("1", { id: "1" });
    await storage.set("2", { id: "2" });
    await storage.set("3", { id: "3" });
    const count = await storage.count();
    assertEquals(count, 3);
  });

  it("count() com search retorna total filtrado", async () => {
    storage = createStorage();
    await storage.set("1", { id: "1", name: "apple" });
    await storage.set("2", { id: "2", name: "banana" });
    await storage.set("3", { id: "3", name: "apricot" });
    const count = await storage.count({
      search: "ap",
      searchFields: ["name"],
    });
    assertEquals(count, 2);
  });

  it("close() fecha conexao sem erro", async () => {
    storage = createStorage();
    await storage.set("1", { id: "1", name: "test" });
    await storage.close();
    // After close, destroy should still work (reopens internally)
    await storage.destroy();
  });

  it("destroy() remove database", async () => {
    storage = createStorage();
    await storage.set("1", { id: "1", name: "test" });
    await storage.destroy();
    // After destroy, a fresh instance should have no data
    const fresh = new IndexedDBStorage(
      (storage as unknown as { _dbName: string })._dbName,
    );
    const result = await fresh.get("1");
    assertEquals(result, null);
    await fresh.destroy();
  });

  it("instancias com dbNames diferentes sao isoladas", async () => {
    storage = createStorage();
    const storage2 = createStorage();
    await storage.set("1", { id: "1", name: "StorageA" });
    await storage2.set("1", { id: "1", name: "StorageB" });
    const fromA = await storage.get("1");
    const fromB = await storage2.get("1");
    assertEquals(fromA!.name, "StorageA");
    assertEquals(fromB!.name, "StorageB");
    await storage2.destroy();
  });
});
