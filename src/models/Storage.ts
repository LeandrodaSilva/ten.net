/** A generic item stored in plugin storage. */
export interface StorageItem {
  id: string;
  [key: string]: unknown;
}

/** Options for listing storage items. */
export interface ListOptions {
  page?: number;
  limit?: number;
  search?: string;
  searchFields?: string[];
}

/** Pluggable storage interface for plugin data. */
export interface Storage {
  get(id: string): Promise<StorageItem | null>;
  list(options?: ListOptions): Promise<StorageItem[]>;
  set(id: string, data: StorageItem): Promise<void>;
  delete(id: string): Promise<boolean>;
  count(
    options?: { search?: string; searchFields?: string[] },
  ): Promise<number>;
}

/** In-memory storage implementation using a Map. */
export class InMemoryStorage implements Storage {
  private _store = new Map<string, StorageItem>();

  async get(id: string): Promise<StorageItem | null> {
    return this._store.get(id) ?? null;
  }

  async list(options?: ListOptions): Promise<StorageItem[]> {
    let items = Array.from(this._store.values());

    if (options?.search && options?.searchFields?.length) {
      const q = options.search.toLowerCase();
      items = items.filter((item) =>
        options.searchFields!.some((field) =>
          String(item[field] ?? "").toLowerCase().includes(q)
        )
      );
    }

    const page = options?.page ?? 1;
    const limit = options?.limit ?? 20;
    const start = (page - 1) * limit;
    return items.slice(start, start + limit);
  }

  async set(id: string, data: StorageItem): Promise<void> {
    this._store.set(id, { ...data, id });
  }

  async delete(id: string): Promise<boolean> {
    return this._store.delete(id);
  }

  async count(
    options?: { search?: string; searchFields?: string[] },
  ): Promise<number> {
    if (!options?.search || !options?.searchFields?.length) {
      return this._store.size;
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
    return count;
  }
}
