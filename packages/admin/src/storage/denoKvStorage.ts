import type { ListOptions, Storage, StorageItem } from "@leproj/tennet";
import type { PluginModel } from "@leproj/tennet";

/**
 * Deno KV-backed storage implementation for plugin data.
 *
 * Key layout:
 * - Items:   ["plugins", slug, "items", id]
 * - Count:   ["plugins", slug, "meta", "count"]
 * - Indexes: ["plugins", slug, "index", field, value_lower, id]
 */
export class DenoKvStorage implements Storage {
  private _kv: Deno.Kv;
  private _slug: string;
  private _model: PluginModel;
  private _searchFields: string[];
  private _indexFields: string[];

  constructor(
    kv: Deno.Kv,
    slug: string,
    model: PluginModel,
    indexFields?: string[],
  ) {
    this._kv = kv;
    this._slug = slug;
    this._model = model;
    this._searchFields = Object.keys(model).filter(
      (k) => model[k] === "string",
    );
    this._indexFields = indexFields ??
      Object.keys(model).filter((k) => model[k] === "string");
  }

  /** Build a KV key for an item. */
  private _itemKey(id: string): Deno.KvKey {
    return ["plugins", this._slug, "items", id];
  }

  /** Build the KV key for the item count. */
  private _countKey(): Deno.KvKey {
    return ["plugins", this._slug, "meta", "count"];
  }

  /** Build a KV key for an index entry. */
  private _indexKey(field: string, value: string, id: string): Deno.KvKey {
    return ["plugins", this._slug, "index", field, value.toLowerCase(), id];
  }

  /** Add index entries for an item to an atomic operation. */
  private _addIndexOps(
    op: Deno.AtomicOperation,
    item: StorageItem,
    mode: "set" | "delete",
  ): Deno.AtomicOperation {
    for (const field of this._indexFields) {
      const val = item[field];
      if (val === undefined || val === null) continue;
      const strVal = String(val);
      if (mode === "set") {
        op = op.set(this._indexKey(field, strVal, item.id), item.id);
      } else {
        op = op.delete(this._indexKey(field, strVal, item.id));
      }
    }
    return op;
  }

  async get(id: string): Promise<StorageItem | null> {
    const entry = await this._kv.get<StorageItem>(this._itemKey(id));
    return entry.value ?? null;
  }

  async set(id: string, data: StorageItem): Promise<void> {
    const item: StorageItem = { ...data, id };
    const existing = await this._kv.get<StorageItem>(this._itemKey(id));
    const isNew = existing.value === null;

    let op = this._kv.atomic()
      .set(this._itemKey(id), item);

    // Remove old index entries if updating
    if (!isNew && existing.value) {
      op = this._addIndexOps(op, existing.value, "delete");
    }

    // Add new index entries
    op = this._addIndexOps(op, item, "set");

    if (isNew) {
      const countEntry = await this._kv.get<Deno.KvU64>(this._countKey());
      if (countEntry.value === null) {
        op = op.check(countEntry).set(this._countKey(), new Deno.KvU64(1n));
      } else {
        op = op.sum(this._countKey(), 1n);
      }
    }

    const result = await op.commit();
    if (!result.ok) {
      throw new Error(`Failed to set item "${id}" in "${this._slug}"`);
    }
  }

  async delete(id: string): Promise<boolean> {
    const existing = await this._kv.get<StorageItem>(this._itemKey(id));
    if (existing.value === null) return false;

    const countEntry = await this._kv.get<Deno.KvU64>(this._countKey());
    const currentCount = countEntry.value ? BigInt(countEntry.value.value) : 0n;
    const newCount = currentCount > 0n ? currentCount - 1n : 0n;

    let op = this._kv.atomic()
      .check(existing)
      .delete(this._itemKey(id))
      .set(this._countKey(), new Deno.KvU64(newCount));

    // Remove index entries
    op = this._addIndexOps(op, existing.value, "delete");

    const result = await op.commit();
    if (!result.ok) {
      throw new Error(`Failed to delete item "${id}" from "${this._slug}"`);
    }
    return true;
  }

  async list(options?: ListOptions): Promise<StorageItem[]> {
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 20;
    const search = options?.search?.toLowerCase();
    const searchFields = options?.searchFields?.length
      ? options.searchFields
      : this._searchFields;

    const prefix: Deno.KvKey = ["plugins", this._slug, "items"];
    const items: StorageItem[] = [];

    for await (const entry of this._kv.list<StorageItem>({ prefix })) {
      const item = entry.value;
      if (search) {
        const matches = searchFields.some((field) =>
          String(item[field] ?? "").toLowerCase().includes(search)
        );
        if (!matches) continue;
      }
      items.push(item);
    }

    const start = (page - 1) * limit;
    return items.slice(start, start + limit);
  }

  /**
   * List items by a secondary index field value.
   * Returns all items where `field` equals `value` (case-insensitive).
   */
  async listByIndex(field: string, value: string): Promise<StorageItem[]> {
    const prefix: Deno.KvKey = [
      "plugins",
      this._slug,
      "index",
      field,
      value.toLowerCase(),
    ];
    const items: StorageItem[] = [];

    for await (const entry of this._kv.list<string>({ prefix })) {
      const id = entry.value;
      const item = await this.get(id);
      if (item) items.push(item);
    }

    return items;
  }

  async count(
    options?: { search?: string; searchFields?: string[] },
  ): Promise<number> {
    if (!options?.search) {
      const entry = await this._kv.get<Deno.KvU64>(this._countKey());
      if (entry.value === null) return 0;
      return Number(entry.value.value);
    }

    const search = options.search.toLowerCase();
    const searchFields = options.searchFields?.length
      ? options.searchFields
      : this._searchFields;

    const prefix: Deno.KvKey = ["plugins", this._slug, "items"];
    let count = 0;

    for await (const entry of this._kv.list<StorageItem>({ prefix })) {
      const item = entry.value;
      if (
        searchFields.some((field) =>
          String(item[field] ?? "").toLowerCase().includes(search)
        )
      ) {
        count++;
      }
    }

    return count;
  }
}
