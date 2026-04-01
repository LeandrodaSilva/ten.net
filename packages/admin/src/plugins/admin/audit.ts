import { requestSession } from "../../auth/authMiddleware.ts";
import { AUDIT_LOG_TTL, type AuditLogPlugin } from "../auditLogPlugin.ts";
import type { StorageItem } from "@leproj/tennet";

export interface AuditContext {
  kv: Deno.Kv | null;
  auditLogPlugin?: AuditLogPlugin;
}

/** Log an audit entry if AuditLogPlugin is registered. Failures never block CRUD operations. */
export async function logAudit(
  ctx: AuditContext,
  action: "create" | "update" | "delete",
  resource: string,
  resourceId: string,
  req: Request,
  details?: string,
): Promise<void> {
  if (!ctx.auditLogPlugin) return;

  try {
    const session = requestSession.get(req);
    const entry = ctx.auditLogPlugin.log({
      action,
      resource,
      resource_id: resourceId,
      user_id: session?.userId ?? "unknown",
      username: session?.username ?? "unknown",
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

    if (ctx.kv) {
      // Write directly to KV with TTL
      const key = ["plugins", ctx.auditLogPlugin.slug, "items", id];
      await ctx.kv.set(key, item, { expireIn: AUDIT_LOG_TTL });

      // Write indexes for action, resource, user_id
      await ctx.kv.set(
        [
          "plugins",
          ctx.auditLogPlugin.slug,
          "index",
          "action",
          entry.action,
          id,
        ],
        id,
        { expireIn: AUDIT_LOG_TTL },
      );
      await ctx.kv.set(
        [
          "plugins",
          ctx.auditLogPlugin.slug,
          "index",
          "resource",
          entry.resource,
          id,
        ],
        id,
        { expireIn: AUDIT_LOG_TTL },
      );
      await ctx.kv.set(
        [
          "plugins",
          ctx.auditLogPlugin.slug,
          "index",
          "user_id",
          entry.user_id,
          id,
        ],
        id,
        { expireIn: AUDIT_LOG_TTL },
      );
    } else {
      await ctx.auditLogPlugin.storage.set(id, item);
    }
  } catch {
    // Audit failure must not block the CRUD operation
  }
}
