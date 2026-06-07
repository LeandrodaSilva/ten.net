/** A generic item stored in plugin storage. */
export interface StorageItem {
  /** Unique identifier of the item. */
  id: string;
  /** Arbitrary additional fields. */
  [key: string]: unknown;
}

/** Options for listing storage items. */
export interface ListOptions {
  /** 1-based page number. */
  page?: number;
  /** Maximum number of items per page. */
  limit?: number;
  /** Free-text query matched against {@link ListOptions.searchFields}. */
  search?: string;
  /** Fields to match the `search` query against. */
  searchFields?: string[];
}

/** Pluggable storage interface for plugin data. */
export interface Storage {
  /** Fetch a single item by id, or `null` if it does not exist. */
  get(id: string): Promise<StorageItem | null>;
  /** List items, optionally paginated and filtered. */
  list(options?: ListOptions): Promise<StorageItem[]>;
  /** Create or replace the item stored under `id`. */
  set(id: string, data: StorageItem): Promise<void>;
  /** Delete the item by id; resolves `true` when one was removed. */
  delete(id: string): Promise<boolean>;
  /** Count items, optionally filtered by a search query. */
  count(
    options?: { search?: string; searchFields?: string[] },
  ): Promise<number>;
}

/** In-memory storage implementation using a Map. */
export class InMemoryStorage implements Storage {
  private _store = new Map<string, StorageItem>();

  get(id: string): Promise<StorageItem | null> {
    return Promise.resolve(this._store.get(id) ?? null);
  }

  list(options?: ListOptions): Promise<StorageItem[]> {
    let items = Array.from(this._store.values());

    if (options?.search && options?.searchFields?.length) {
      const q = options.search.toLowerCase();
      items = items.filter((item) =>
        options.searchFields!.some((field) =>
          String(item[field] ?? "").toLowerCase().includes(q)
        )
      );
    }

    // Sort by ID for consistent ordering
    items.sort((a, b) => a.id.localeCompare(b.id));

    const page = options?.page ?? 1;
    const limit = options?.limit ?? 20;
    const start = (page - 1) * limit;
    return Promise.resolve(items.slice(start, start + limit));
  }

  set(id: string, data: StorageItem): Promise<void> {
    this._store.set(id, { ...data, id });
    return Promise.resolve();
  }

  delete(id: string): Promise<boolean> {
    return Promise.resolve(this._store.delete(id));
  }

  count(
    options?: { search?: string; searchFields?: string[] },
  ): Promise<number> {
    if (!options?.search || !options?.searchFields?.length) {
      return Promise.resolve(this._store.size);
    }
    const q = options.search.toLowerCase();
    let count = 0;
    for (const item of this._store.values()) {
      if (
        options.searchFields.some((field) =>
          String(item[field] ?? "").toLowerCase().includes(q)
        )
      ) {
        count++;
      }
    }
    return Promise.resolve(count);
  }
}
