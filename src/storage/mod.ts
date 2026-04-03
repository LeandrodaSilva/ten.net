/**
 * IndexedDB-backed storage adapters for Ten.net.
 * Use in browsers and Service Workers for persistent dynamic content.
 *
 * @example
 * ```typescript
 * import { IndexedDBStorage } from "@leproj/tennet/storage/indexeddb";
 *
 * const storage = new IndexedDBStorage("my-app");
 * await storage.set("page-1", { id: "page-1", title: "Hello", body: "<p>World</p>" });
 * const page = await storage.get("page-1");
 * ```
 *
 * @module
 */
export { IndexedDBStorage } from "./indexeddb.ts";
export { IndexedDBKv } from "./indexeddbKv.ts";
export { StorageSync, type SyncOptions } from "./sync.ts";
