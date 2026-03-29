import type { Permission } from "../auth/types.ts";

/** Permission actions for the access control matrix. */
export type PermissionAction = "read" | "create" | "update" | "delete";

/** A single permission entry stored in Deno KV. */
export interface PermissionEntry {
  id: string;
  role_slug: string;
  resource: string;
  /** JSON array string, e.g. '["read","create","update","delete"]' */
  permissions: string;
  updated_at: string;
}

/**
 * Parse a JSON permission string into an array of PermissionAction.
 * Returns empty array on invalid input.
 */
export function parsePermissions(json: string): PermissionAction[] {
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((p: unknown): p is PermissionAction =>
      typeof p === "string" &&
      ["read", "create", "update", "delete"].includes(p)
    );
  } catch {
    return [];
  }
}

/**
 * Serialize an array of PermissionAction into a JSON string.
 */
export function serializePermissions(perms: PermissionAction[]): string {
  return JSON.stringify(perms);
}

/**
 * Build the Deno KV key for a role+resource permission lookup.
 * Key format: ["permissions", roleSlug, resource]
 */
export function buildPermissionKey(
  roleSlug: string,
  resource: string,
): Deno.KvKey {
  return ["permissions", roleSlug, resource];
}

/**
 * Type compatibility assertion: PermissionAction is assignable to Permission.
 * This ensures our type stays in sync with the auth system.
 */
const _typeCheck: Permission = "read" as PermissionAction;
void _typeCheck;
