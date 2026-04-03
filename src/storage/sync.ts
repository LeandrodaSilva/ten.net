/**
 * Storage synchronization with a remote server.
 * Pulls updated and deleted items from a server endpoint
 * and applies them to a local {@link IndexedDBStorage}.
 *
 * @module
 */

import type { IndexedDBStorage } from "./indexeddb.ts";

/** Configuration options for {@link StorageSync}. */
export interface SyncOptions {
  /** Base URL of the server (e.g., `"https://myapp.com"`). */
  serverUrl: string;
  /** API endpoint for sync (e.g., `"/api/admin/pages/sync"`). */
  endpoint: string;
  /** Sync interval in milliseconds (default: 60000 = 1 min). */
  interval?: number;
  /** Custom headers (e.g., Authorization). */
  headers?: Record<string, string>;
}

/** Response format expected from the sync endpoint. */
interface SyncResponse {
  items: Array<{ id: string; [key: string]: unknown }>;
  deleted: string[];
  timestamp: number;
}

/**
 * Synchronizes an {@link IndexedDBStorage} instance with a remote server.
 * Uses a pull-based protocol: fetches items modified since the last sync timestamp.
 */
export class StorageSync {
  private _storage: IndexedDBStorage;
  private _options: SyncOptions;
  private _timer: number | null = null;
  private _lastSync: number = 0;

  constructor(storage: IndexedDBStorage, options: SyncOptions) {
    this._storage = storage;
    this._options = options;
  }

  /**
   * Pull updated items from the server and apply to local storage.
   *
   * Protocol: `GET {serverUrl}{endpoint}?since={lastSync}`
   * Expected response: `{ items: StorageItem[], deleted: string[], timestamp: number }`
   */
  async pull(): Promise<{ updated: number; deleted: number }> {
    const url =
      `${this._options.serverUrl}${this._options.endpoint}?since=${this._lastSync}`;
    const res = await fetch(url, { headers: this._options.headers });

    if (!res.ok) {
      throw new Error(`Sync failed: ${res.status} ${res.statusText}`);
    }

    const { items, deleted, timestamp } = (await res.json()) as SyncResponse;

    for (const item of items) {
      await this._storage.set(item.id, item);
    }

    for (const id of deleted) {
      await this._storage.delete(id);
    }

    this._lastSync = timestamp;
    return { updated: items.length, deleted: deleted.length };
  }

  /** Start periodic sync. Performs an immediate pull, then repeats at the configured interval. */
  start(): void {
    if (this._timer !== null) return;
    this.pull().catch(console.error);
    this._timer = setInterval(() => {
      this.pull().catch(console.error);
    }, this._options.interval ?? 60_000) as unknown as number;
  }

  /** Stop periodic sync. */
  stop(): void {
    if (this._timer !== null) {
      clearInterval(this._timer);
      this._timer = null;
    }
  }

  /** The timestamp of the last successful sync (0 if never synced). */
  get lastSync(): number {
    return this._lastSync;
  }
}
