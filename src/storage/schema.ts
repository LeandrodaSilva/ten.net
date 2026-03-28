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
export const CURRENT_SCHEMA_VERSION = 1;

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
