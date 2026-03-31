import type { AuditLogPlugin } from "../plugins/auditLogPlugin.ts";
import type { StorageItem } from "../models/Storage.ts";

/**
 * Widget-specific audit logger.
 *
 * Wraps AuditLogPlugin to provide semantic log methods for widget operations.
 * Writes through the plugin's in-memory or KV storage. Failures are swallowed
 * so audit errors never block CRUD operations.
 */
export class WidgetAuditLogger {
  constructor(private readonly _audit: AuditLogPlugin) {}

  /** Log a widget creation event. */
  async logCreate(
    pageId: string,
    widgetId: string,
    type: string,
    userId: string,
    username: string,
  ): Promise<void> {
    await this._write(
      "create",
      widgetId,
      userId,
      username,
      `page:${pageId} type:${type}`,
    );
  }

  /** Log a widget update event. */
  async logUpdate(
    pageId: string,
    widgetId: string,
    userId: string,
    username: string,
  ): Promise<void> {
    await this._write("update", widgetId, userId, username, `page:${pageId}`);
  }

  /** Log a widget deletion event. */
  async logDelete(
    pageId: string,
    widgetId: string,
    userId: string,
    username: string,
  ): Promise<void> {
    await this._write("delete", widgetId, userId, username, `page:${pageId}`);
  }

  /** Log a widget reorder event (applies to the whole page). */
  async logReorder(
    pageId: string,
    userId: string,
    username: string,
  ): Promise<void> {
    await this._write("reorder", pageId, userId, username, undefined);
  }

  /** Log a widget duplicate event. */
  async logDuplicate(
    pageId: string,
    originalId: string,
    newId: string,
    userId: string,
    username: string,
  ): Promise<void> {
    await this._write(
      "duplicate",
      newId,
      userId,
      username,
      `page:${pageId} original:${originalId}`,
    );
  }

  private async _write(
    action: "create" | "update" | "delete" | "reorder" | "duplicate",
    resourceId: string,
    userId: string,
    username: string,
    details: string | undefined,
  ): Promise<void> {
    try {
      const entry = this._audit.log({
        action,
        resource: "widget",
        resource_id: resourceId,
        user_id: userId,
        username,
        details,
      });
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      const item: StorageItem = {
        id,
        ...entry,
        created_at: now,
        updated_at: now,
      };
      await this._audit.storage.set(id, item);
    } catch {
      // Audit failures must never block the CRUD operation
    }
  }
}
