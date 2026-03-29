/**
 * Schema versioning and migration system for Deno KV storage.
 *
 * Key: ["_meta", "schema_version"] → number
 *
 * Migrations are idempotent functions that run sequentially
 * from the current version to the latest.
 */

/** A migration function that transforms data in KV. */
export interface Migration {
  version: number;
  description: string;
  migrate: (kv: Deno.Kv) => Promise<void>;
}

const SCHEMA_VERSION_KEY: Deno.KvKey = ["_meta", "schema_version"];

/** Current schema version — increment when adding new migrations. */
export const CURRENT_SCHEMA_VERSION = 2;

/** All registered migrations, ordered by version. */
const migrations: Migration[] = [
  {
    version: 1,
    description: "Initial schema — plugin items, counts, indexes",
    migrate: async (_kv: Deno.Kv) => {
      // v1 is the baseline — no data transformation needed.
      // This migration exists so the schema version is set on first run.
    },
  },
  {
    version: 2,
    description:
      "Migrate PagePlugin items from {name, html} to expanded model with slug, title, body, status, seo fields",
    migrate: async (kv: Deno.Kv) => {
      const prefix: Deno.KvKey = ["plugins", "page-plugin", "items"];
      for await (const entry of kv.list<Record<string, unknown>>({ prefix })) {
        const item = entry.value;
        if (!item || typeof item !== "object") continue;

        // Skip items that already have the new schema fields
        if ("slug" in item && "status" in item) continue;

        const id = item.id as string;
        const oldName = (item.name as string) ?? "";
        const oldHtml = (item.html as string) ?? "";

        // Convert old {name, html} → new expanded model
        const migrated = {
          ...item,
          id,
          slug: oldName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "") || id,
          title: oldName,
          body: oldHtml,
          status: "draft" as const,
          seo_title: "",
          seo_description: "",
          template: "",
          author_id: "",
          updated_at: new Date().toISOString(),
        };

        // Remove old fields
        delete (migrated as Record<string, unknown>).name;
        delete (migrated as Record<string, unknown>).html;

        await kv.set(["plugins", "page-plugin", "items", id], migrated);
      }
    },
  },
];

/** Get the current schema version from KV. Returns 0 if not set. */
export async function getSchemaVersion(kv: Deno.Kv): Promise<number> {
  const entry = await kv.get<number>(SCHEMA_VERSION_KEY);
  return entry.value ?? 0;
}

/** Set the schema version in KV. */
async function setSchemaVersion(kv: Deno.Kv, version: number): Promise<void> {
  await kv.set(SCHEMA_VERSION_KEY, version);
}

/**
 * Run all pending migrations up to CURRENT_SCHEMA_VERSION.
 * Safe to call multiple times — skips already-applied migrations.
 *
 * @param kv - The Deno.Kv instance to migrate
 * @returns The final schema version after migrations
 */
export async function runMigrations(kv: Deno.Kv): Promise<number> {
  const currentVersion = await getSchemaVersion(kv);

  if (currentVersion >= CURRENT_SCHEMA_VERSION) {
    return currentVersion;
  }

  const pending = migrations.filter((m) => m.version > currentVersion);
  pending.sort((a, b) => a.version - b.version);

  for (const migration of pending) {
    await migration.migrate(kv);
    await setSchemaVersion(kv, migration.version);
  }

  return CURRENT_SCHEMA_VERSION;
}
