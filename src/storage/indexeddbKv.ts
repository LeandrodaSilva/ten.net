/**
 * Minimal Deno.Kv-compatible adapter backed by IndexedDB.
 * Supports get(), set(), and delete() with array keys serialized as strings.
 *
 * Used by the widget renderer in the browser, which expects a Kv-like interface.
 *
 * @module
 */

import { IndexedDBStorage } from "./indexeddb.ts";

/**
 * Minimal Deno.Kv-compatible adapter backed by IndexedDB.
 * Implements only the subset of the Kv API that Ten.net's widget renderer uses.
 */
export class IndexedDBKv {
  private _storage: IndexedDBStorage;

  constructor(dbName = "tennet-kv") {
    this._storage = new IndexedDBStorage(dbName, "kv");
  }

  /** Get a value by key array (e.g., `["widgets", "page-1", "hero"]`). */
  async get<T = unknown>(
    key: string[],
  ): Promise<{ key: string[]; value: T | null; versionstamp: string }> {
    const id = key.join(":");
    const item = await this._storage.get(id);
    return {
      key,
      value: item ? (item.value as T) : null,
      versionstamp: item ? String(item.versionstamp ?? "0") : "0",
    };
  }

  /** Set a value by key array. */
  async set(key: string[], value: unknown): Promise<void> {
    const id = key.join(":");
    await this._storage.set(id, {
      id,
      key: key as unknown as string,
      value: value as unknown as string,
      versionstamp: String(Date.now()),
    });
  }

  /** Delete a value by key array. */
  async delete(key: string[]): Promise<void> {
    const id = key.join(":");
    await this._storage.delete(id);
  }

  /** Close the underlying database connection. */
  async close(): Promise<void> {
    await this._storage.close();
  }

  /** Delete the entire database. Useful for tests and cleanup. */
  async destroy(): Promise<void> {
    await this._storage.destroy();
  }
}
