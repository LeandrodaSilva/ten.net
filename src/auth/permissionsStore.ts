import type { PermissionAction } from "../models/Permission.ts";
import { buildPermissionKey } from "../models/Permission.ts";
import { ROLE_PERMISSIONS } from "./types.ts";

const VALID_ACTIONS: PermissionAction[] = [
  "read",
  "create",
  "update",
  "delete",
];

/** Data structure for rendering the permissions matrix UI. */
export interface MatrixData {
  roles: string[];
  resources: string[];
  permissions: Record<string, Record<string, PermissionAction[]>>;
}

/**
 * Store for managing role-resource permissions in Deno KV.
 * Falls back to hardcoded ROLE_PERMISSIONS when KV has no data.
 */
export class PermissionsStore {
  private kv: Deno.Kv | null;

  constructor(kv: Deno.Kv | null) {
    this.kv = kv;
  }

  /**
   * Get permissions for a role+resource combination.
   * Returns null if no custom permissions are configured (caller should fallback).
   */
  async get(
    roleSlug: string,
    resource: string,
  ): Promise<PermissionAction[] | null> {
    if (!this.kv) return this._getFallback(roleSlug, resource);

    const key = buildPermissionKey(roleSlug, resource);
    const entry = await this.kv.get<PermissionAction[]>(key);
    if (entry.value) return entry.value;

    return null;
  }

  /**
   * Set permissions for a role+resource combination.
   */
  async set(
    roleSlug: string,
    resource: string,
    permissions: PermissionAction[],
  ): Promise<void> {
    if (!this.kv) return;

    // Only allow valid PermissionAction values
    const sanitized = permissions.filter((p) => VALID_ACTIONS.includes(p));
    const key = buildPermissionKey(roleSlug, resource);
    await this.kv.set(key, sanitized);
  }

  /**
   * Get all permissions for a given role across all resources.
   */
  async getAll(
    roleSlug: string,
  ): Promise<Record<string, PermissionAction[]>> {
    const result: Record<string, PermissionAction[]> = {};

    if (!this.kv) {
      // Fallback to hardcoded
      const rolePerms =
        ROLE_PERMISSIONS[roleSlug as keyof typeof ROLE_PERMISSIONS];
      if (rolePerms) {
        for (const [resource, perms] of Object.entries(rolePerms)) {
          result[resource] = perms as PermissionAction[];
        }
      }
      return result;
    }

    const prefix = ["permissions", roleSlug];
    const iter = this.kv.list<PermissionAction[]>({ prefix });
    for await (const entry of iter) {
      // Key is ["permissions", roleSlug, resource]
      const resource = entry.key[2] as string;
      result[resource] = entry.value;
    }

    return result;
  }

  /**
   * Get the full permissions matrix for rendering in the UI.
   */
  async getAllForMatrix(
    roleSlugs: string[],
    resources: string[],
  ): Promise<MatrixData> {
    const permissions: Record<string, Record<string, PermissionAction[]>> = {};

    for (const roleSlug of roleSlugs) {
      permissions[roleSlug] = {};
      for (const resource of resources) {
        const perms = await this.get(roleSlug, resource);
        permissions[roleSlug][resource] = perms ?? [];
      }
    }

    return { roles: roleSlugs, resources, permissions };
  }

  /**
   * Delete all permissions for a role.
   */
  async delete(roleSlug: string): Promise<void> {
    if (!this.kv) return;

    const prefix = ["permissions", roleSlug];
    const iter = this.kv.list({ prefix });
    for await (const entry of iter) {
      await this.kv.delete(entry.key);
    }
  }

  /**
   * Get fallback permissions from hardcoded ROLE_PERMISSIONS.
   */
  private _getFallback(
    roleSlug: string,
    resource: string,
  ): PermissionAction[] | null {
    const rolePerms =
      ROLE_PERMISSIONS[roleSlug as keyof typeof ROLE_PERMISSIONS];
    if (!rolePerms) return null;
    const perms = rolePerms[resource as keyof typeof rolePerms];
    if (!perms) return null;
    return perms as PermissionAction[];
  }
}
