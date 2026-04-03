import type { Plugin } from "@leproj/tennet";
import type { StorageItem } from "@leproj/tennet";
import type { PermissionAction } from "@leproj/tennet";
import { InMemoryUserStore, seedDefaultAdmin } from "../../auth/userStore.ts";
import { InMemorySessionStore } from "../../auth/sessionStore.ts";
import { PermissionsStore } from "../../auth/permissionsStore.ts";
import { ROLE_PERMISSIONS } from "../../auth/types.ts";
import { RolesPlugin } from "../rolesPlugin.ts";
import { AuditLogPlugin } from "../auditLogPlugin.ts";
import { MediaStore } from "./mediaStore.ts";
import type { AdminContext } from "./context.ts";

/** Seed built-in roles and their permissions on first init. */
export async function seedBuiltInRoles(ctx: AdminContext): Promise<void> {
  const rolesPlugin = ctx.plugins.find(
    (p) => p instanceof RolesPlugin,
  ) as RolesPlugin | undefined;
  if (!rolesPlugin) return;

  // Check if roles already exist
  const existingCount = await rolesPlugin.storage.count({});
  if (existingCount > 0) return;

  const builtInRoles = [
    {
      name: "Admin",
      slug: "admin",
      description: "Full access to all resources",
      is_system: "true",
    },
    {
      name: "Editor",
      slug: "editor",
      description: "Create and edit content",
      is_system: "true",
    },
    {
      name: "Viewer",
      slug: "viewer",
      description: "Read-only access",
      is_system: "true",
    },
  ];

  for (const role of builtInRoles) {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const item: StorageItem = {
      id,
      ...role,
      created_at: now,
      updated_at: now,
    };
    await rolesPlugin.storage.set(id, item);
  }

  // Seed permissions from ROLE_PERMISSIONS hardcoded
  if (ctx.kv) {
    const permissionsStore = new PermissionsStore(ctx.kv);
    for (const [roleSlug, resources] of Object.entries(ROLE_PERMISSIONS)) {
      for (const [resource, perms] of Object.entries(resources)) {
        await permissionsStore.set(
          roleSlug,
          resource,
          perms as PermissionAction[],
        );
      }
    }
  }
}

/**
 * Initialize storage backends, seed data, and return a populated AdminContext.
 * Called once per AdminPlugin lifecycle (re-init reuses the returned context).
 */
export async function initAdmin(
  pluginConstructors: (new () => Plugin)[],
  storageMode: "memory" | "kv",
  kvPath?: string,
): Promise<AdminContext> {
  const plugins = pluginConstructors.map((Ctor) => new Ctor());

  let kv: Deno.Kv | null = null;
  let sessionStore: import("../../auth/sessionStore.ts").SessionStore;
  let userStore: import("../../auth/userStore.ts").UserStore;

  if (storageMode === "kv") {
    const { DenoKvStorage } = await import(
      "../../storage/denoKvStorage.ts"
    );
    const { DenoKvSessionStore } = await import(
      "../../storage/denoKvSessionStore.ts"
    );
    const { DenoKvUserStore } = await import(
      "../../storage/denoKvUserStore.ts"
    );
    const { runMigrations } = await import("../../storage/schema.ts");

    kv = await Deno.openKv(kvPath);
    await runMigrations(kv);

    for (const plugin of plugins) {
      plugin.storage = new DenoKvStorage(kv, plugin.slug, plugin.model);
    }

    sessionStore = new DenoKvSessionStore(kv);
    userStore = new DenoKvUserStore(kv);
  } else {
    sessionStore = new InMemorySessionStore();
    userStore = new InMemoryUserStore();
  }

  await seedDefaultAdmin(userStore);

  const auditLogPlugin = plugins.find(
    (p) => p instanceof AuditLogPlugin,
  ) as AuditLogPlugin | undefined;

  const mediaStore = kv ? new MediaStore(kv) : undefined;

  const ctx: AdminContext = {
    kv,
    plugins,
    appPath: "./app",
    sessionStore,
    userStore,
    auditLogPlugin,
    mediaStore,
  };

  await seedBuiltInRoles(ctx);

  return ctx;
}
