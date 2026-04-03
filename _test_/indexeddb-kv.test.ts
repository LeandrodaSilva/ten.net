import "fake-indexeddb/auto";
import { afterEach, describe, it } from "@std/testing/bdd";
import { assertEquals } from "@std/assert";
import { IndexedDBKv } from "../src/storage/indexeddbKv.ts";

let kv: IndexedDBKv;
let dbCounter = 0;

function createKv(): IndexedDBKv {
  dbCounter++;
  return new IndexedDBKv(`test-kv-${Date.now()}-${dbCounter}`);
}

describe("IndexedDBKv", () => {
  afterEach(async () => {
    if (kv) await kv.destroy();
  });

  it("get() retorna value null para key inexistente", async () => {
    kv = createKv();
    const result = await kv.get<string>(["missing", "key"]);
    assertEquals(result.value, null);
    assertEquals(result.versionstamp, "0");
  });

  it("set() + get() persiste e recupera valor", async () => {
    kv = createKv();
    await kv.set(["widgets", "hero"], { html: "<h1>Hi</h1>" });
    const result = await kv.get<{ html: string }>(["widgets", "hero"]);
    assertEquals(result.value!.html, "<h1>Hi</h1>");
    assertEquals(result.key, ["widgets", "hero"]);
  });

  it("keys com multiplos segmentos", async () => {
    kv = createKv();
    await kv.set(["a", "b", "c"], "deep-value");
    const result = await kv.get<string>(["a", "b", "c"]);
    assertEquals(result.value, "deep-value");
    assertEquals(result.key, ["a", "b", "c"]);
    // Different key should not match
    const other = await kv.get<string>(["a", "b"]);
    assertEquals(other.value, null);
  });

  it("delete() remove valor", async () => {
    kv = createKv();
    await kv.set(["key"], "value");
    await kv.delete(["key"]);
    const result = await kv.get<string>(["key"]);
    assertEquals(result.value, null);
  });

  it("instancias isoladas", async () => {
    kv = createKv();
    const kv2 = createKv();
    await kv.set(["shared"], "from-kv1");
    await kv2.set(["shared"], "from-kv2");
    const r1 = await kv.get<string>(["shared"]);
    const r2 = await kv2.get<string>(["shared"]);
    assertEquals(r1.value, "from-kv1");
    assertEquals(r2.value, "from-kv2");
    await kv2.destroy();
  });
});
