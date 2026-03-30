import type { WidgetInstance, WidgetType } from "./types.ts";

/**
 * CRUD store for WidgetInstances backed by Deno KV.
 *
 * Key layout:
 *   ["widgets", pageId, "instance", widgetId] → WidgetInstance
 */
export class WidgetStore {
  private readonly _kv: Deno.Kv;

  constructor(kv: Deno.Kv) {
    this._kv = kv;
  }

  /**
   * Validate that an ID does not contain path-traversal or KV-injection characters.
   * Allows only alphanumeric, hyphens, and underscores (UUID-safe).
   */
  private _validateId(id: string, label: string): void {
    if (!id || !/^[a-zA-Z0-9_-]+$/.test(id)) {
      throw new Error(
        `Invalid ${label}: must be non-empty and contain only alphanumeric characters, hyphens, or underscores`,
      );
    }
  }

  /** Build the KV key for a specific widget instance. */
  private _key(pageId: string, widgetId: string): Deno.KvKey {
    this._validateId(pageId, "pageId");
    this._validateId(widgetId, "widgetId");
    return ["widgets", pageId, "instance", widgetId];
  }

  /** Build the prefix key for all instances on a page. */
  private _pagePrefix(pageId: string): Deno.KvKey {
    this._validateId(pageId, "pageId");
    return ["widgets", pageId, "instance"];
  }

  /**
   * Create a new widget instance on a page.
   * Generates a UUID for the id and sets created_at / updated_at timestamps.
   */
  async create(
    pageId: string,
    data: {
      type: WidgetType;
      placeholder: string;
      order: number;
      data: Record<string, unknown>;
    },
  ): Promise<WidgetInstance> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const instance: WidgetInstance = {
      id,
      type: data.type,
      placeholder: data.placeholder,
      order: data.order,
      data: data.data,
      created_at: now,
      updated_at: now,
    };

    const result = await this._kv.atomic()
      .set(this._key(pageId, id), instance)
      .commit();

    if (!result.ok) {
      throw new Error(`Failed to create widget instance on page "${pageId}"`);
    }

    return instance;
  }

  /**
   * Update an existing widget instance.
   * Merges provided fields into the existing instance and bumps updated_at.
   */
  async update(
    pageId: string,
    widgetId: string,
    data: Partial<
      Pick<WidgetInstance, "type" | "placeholder" | "order" | "data">
    >,
  ): Promise<WidgetInstance> {
    const existing = await this._kv.get<WidgetInstance>(
      this._key(pageId, widgetId),
    );

    if (existing.value === null) {
      throw new Error(
        `Widget instance "${widgetId}" not found on page "${pageId}"`,
      );
    }

    const updated: WidgetInstance = {
      ...existing.value,
      ...data,
      id: widgetId,
      updated_at: new Date().toISOString(),
    };

    const result = await this._kv.atomic()
      .check(existing)
      .set(this._key(pageId, widgetId), updated)
      .commit();

    if (!result.ok) {
      throw new Error(
        `Failed to update widget instance "${widgetId}" on page "${pageId}"`,
      );
    }

    return updated;
  }

  /**
   * Delete a widget instance.
   * Returns true if deleted, false if it did not exist.
   */
  async delete(pageId: string, widgetId: string): Promise<boolean> {
    const existing = await this._kv.get<WidgetInstance>(
      this._key(pageId, widgetId),
    );

    if (existing.value === null) return false;

    const result = await this._kv.atomic()
      .check(existing)
      .delete(this._key(pageId, widgetId))
      .commit();

    if (!result.ok) {
      throw new Error(
        `Failed to delete widget instance "${widgetId}" on page "${pageId}"`,
      );
    }

    return true;
  }

  /**
   * Load all widget instances for a page in a single KV list operation.
   * Returns instances sorted by placeholder then order.
   */
  async loadForPage(pageId: string): Promise<WidgetInstance[]> {
    const instances: WidgetInstance[] = [];

    for await (
      const entry of this._kv.list<WidgetInstance>({
        prefix: this._pagePrefix(pageId),
      })
    ) {
      if (entry.value) {
        instances.push(entry.value);
      }
    }

    return instances.sort((a, b) => {
      if (a.placeholder !== b.placeholder) {
        return a.placeholder.localeCompare(b.placeholder);
      }
      return a.order - b.order;
    });
  }

  /**
   * Reorder widget instances within a page.
   * Accepts an array of { widgetId, order } tuples and applies them atomically.
   * Only updates the `order` field and bumps `updated_at`.
   */
  async reorder(
    pageId: string,
    order: { widgetId: string; order: number }[],
  ): Promise<void> {
    if (order.length === 0) return;

    const keys = order.map(({ widgetId }) => this._key(pageId, widgetId));
    const entries = await Promise.all(
      keys.map((key) => this._kv.get<WidgetInstance>(key)),
    );

    const now = new Date().toISOString();
    let op = this._kv.atomic();

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      if (entry.value === null) {
        throw new Error(
          `Widget instance "${
            order[i].widgetId
          }" not found on page "${pageId}"`,
        );
      }
      const updated: WidgetInstance = {
        ...entry.value,
        order: order[i].order,
        updated_at: now,
      };
      op = op.check(entry).set(keys[i], updated);
    }

    const result = await op.commit();
    if (!result.ok) {
      throw new Error(`Failed to reorder widgets on page "${pageId}"`);
    }
  }
}
