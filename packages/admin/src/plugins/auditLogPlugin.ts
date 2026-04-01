import { Plugin, type PluginModel } from "@leproj/tennet";

/** Valid audit log actions. */
export type AuditAction =
  | "create"
  | "update"
  | "delete"
  | "reorder"
  | "duplicate";

const VALID_ACTIONS: AuditAction[] = [
  "create",
  "update",
  "delete",
  "reorder",
  "duplicate",
];

/** Fields that are optional (not required even for non-boolean types). */
const OPTIONAL_FIELDS = new Set(["details"]);

/** TTL for audit log entries: 90 days in milliseconds. */
export const AUDIT_LOG_TTL = 90 * 24 * 60 * 60 * 1000;

/** Input for the log() convenience method. */
export interface AuditLogEntry {
  action: AuditAction;
  resource: string;
  resource_id: string;
  user_id: string;
  username: string;
  details?: string;
}

export class AuditLogPlugin extends Plugin {
  name: string;
  description: string;
  model: PluginModel;

  /** Mark this plugin as readonly — admin UI should not show create/edit/delete forms. */
  readonly = true;

  constructor() {
    super();
    this.name = "AuditLogPlugin";
    this.description = "Track all admin actions for auditing.";
    this.model = {
      action: "string",
      resource: "string",
      resource_id: "string",
      user_id: "string",
      username: "string",
      details: "string",
      timestamp: "string",
    };
  }

  /**
   * Synchronous validation for AuditLogPlugin data.
   * Checks action enum, required fields, details optional.
   */
  public override validate(
    data: Record<string, unknown>,
  ): { valid: boolean; errors: Record<string, string> } {
    const { errors } = super.validate(data);

    // Remove errors for optional fields
    for (const field of OPTIONAL_FIELDS) {
      delete errors[field];
    }

    // action: must be one of the valid audit actions
    const action = data.action;
    if (typeof action === "string" && action !== "") {
      if (!VALID_ACTIONS.includes(action as AuditAction)) {
        errors.action = "action must be create, update, or delete";
      }
    }

    return { valid: Object.keys(errors).length === 0, errors };
  }

  /**
   * Convenience method to create an audit log entry with automatic timestamp.
   * Returns the data record ready for storage.create().
   */
  public log(entry: AuditLogEntry): Record<string, string> {
    return {
      action: entry.action,
      resource: entry.resource,
      resource_id: entry.resource_id,
      user_id: entry.user_id,
      username: entry.username,
      details: entry.details ?? "",
      timestamp: new Date().toISOString(),
    };
  }
}
