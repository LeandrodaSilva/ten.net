/**
 * IndexedDB-backed storage adapter for Ten.net.
 * Implements the {@link Storage} interface using IndexedDB,
 * which is available in browsers and Service Workers.
 *
 * @module
 */

import type { ListOptions, Storage, StorageItem } from "../models/Storage.ts";
import type {
  IDBCursorWithValue,
  IDBDatabase,
  IDBObjectStore,
  IDBRequest,
  IDBTransaction,
  IDBTransactionMode,
} from "./idb_types.ts";
import { getIndexedDB } from "./idb_types.ts";

/** Wraps an IDBRequest in a Promise. */
function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Waits for a transaction to complete. */
function transactionDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error("Transaction aborted"));
  });
}

/** Case-insensitive substring match across fields. */
function matchesSearch(
  item: StorageItem,
  search: string,
  searchFields?: string[],
): boolean {
  const q = search.toLowerCase();
  const fields = searchFields?.length ? searchFields : Object.keys(item);
  return fields.some((field) =>
    String(item[field] ?? "").toLowerCase().includes(q)
  );
}

/**
 * Storage adapter backed by IndexedDB.
 * Works in browsers, Service Workers, and any environment with IndexedDB.
 */
export class IndexedDBStorage implements Storage {
  private _dbName: string;
  private _storeName: string;
  private _dbPromise: Promise<IDBDatabase> | null = null;

  constructor(dbName: string, storeName = "items") {
    this._dbName = dbName;
    this._storeName = storeName;
  }

  private _openDB(): Promise<IDBDatabase> {
    if (this._dbPromise) return this._dbPromise;

    this._dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      const idb = getIndexedDB();
      const request = idb.open(this._dbName, 1);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(this._storeName)) {
          db.createObjectStore(this._storeName, { keyPath: "id" });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        this._dbPromise = null;
        reject(request.error);
      };
    });

    return this._dbPromise;
  }

  private async _getStore(
    mode: IDBTransactionMode,
  ): Promise<{ store: IDBObjectStore; tx: IDBTransaction }> {
    const db = await this._openDB();
    const tx = db.transaction(this._storeName, mode);
    const store = tx.objectStore(this._storeName);
    return { store, tx };
  }

  async get(id: string): Promise<StorageItem | null> {
    const { store } = await this._getStore("readonly");
    const result = await requestToPromise(store.get(id));
    return (result as StorageItem) ?? null;
  }

  async set(id: string, data: StorageItem): Promise<void> {
    const { store, tx } = await this._getStore("readwrite");
    store.put({ ...data, id });
    await transactionDone(tx);
  }

  async delete(id: string): Promise<boolean> {
    const { store, tx } = await this._getStore("readwrite");
    const existing = await requestToPromise(store.get(id));
    if (!existing) return false;
    store.delete(id);
    await transactionDone(tx);
    return true;
  }

  async list(options?: ListOptions): Promise<StorageItem[]> {
    const { store } = await this._getStore("readonly");
    const items: StorageItem[] = [];
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 20;
    const start = (page - 1) * limit;
    const hasSearch = !!(options?.search && options.search.length > 0);

    return new Promise((resolve, reject) => {
      const request = store.openCursor();
      let matchIndex = 0;

      request.onsuccess = () => {
        const cursor = request.result as IDBCursorWithValue | null;
        if (!cursor) {
          resolve(items);
          return;
        }

        const item = cursor.value as StorageItem;

        if (hasSearch) {
          if (!matchesSearch(item, options!.search!, options?.searchFields)) {
            cursor.continue();
            return;
          }
        }

        if (matchIndex >= start && items.length < limit) {
          items.push(item);
        }
        matchIndex++;

        if (items.length >= limit) {
          resolve(items);
          return;
        }

        cursor.continue();
      };

      request.onerror = () => reject(request.error);
    });
  }

  async count(
    options?: { search?: string; searchFields?: string[] },
  ): Promise<number> {
    const { store } = await this._getStore("readonly");

    if (!options?.search || !options.search.length) {
      return requestToPromise(store.count());
    }

    return new Promise((resolve, reject) => {
      const request = store.openCursor();
      let count = 0;

      request.onsuccess = () => {
        const cursor = request.result as IDBCursorWithValue | null;
        if (!cursor) {
          resolve(count);
          return;
        }

        const item = cursor.value as StorageItem;
        if (matchesSearch(item, options.search!, options.searchFields)) {
          count++;
        }
        cursor.continue();
      };

      request.onerror = () => reject(request.error);
    });
  }

  /** Close the database connection. */
  async close(): Promise<void> {
    if (!this._dbPromise) return;
    const db = await this._dbPromise;
    db.close();
    this._dbPromise = null;
  }

  /** Delete the entire database. Useful for tests and cleanup. */
  async destroy(): Promise<void> {
    await this.close();
    return new Promise((resolve, reject) => {
      const idb = getIndexedDB();
      const request = idb.deleteDatabase(this._dbName);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}
