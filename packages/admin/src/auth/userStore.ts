import type { User } from "./types.ts";
import { createPasswordHash } from "./passwordHasher.ts";

/** Pluggable user storage interface. */
export interface UserStore {
  get(username: string): Promise<User | null>;
  set(username: string, user: User): Promise<void>;
  delete(username: string): Promise<void>;
}

/** In-memory user store. */
export class InMemoryUserStore implements UserStore {
  private _store = new Map<string, User>();

  get(username: string): Promise<User | null> {
    return Promise.resolve(this._store.get(username) ?? null);
  }

  set(username: string, user: User): Promise<void> {
    this._store.set(username, user);
    return Promise.resolve();
  }

  delete(username: string): Promise<void> {
    this._store.delete(username);
    return Promise.resolve();
  }
}

/** Seed a default admin user if none exists. */
export async function seedDefaultAdmin(store: UserStore): Promise<void> {
  const existing = await store.get("admin");
  if (existing) return;

  const { hash, salt } = await createPasswordHash("admin");
  const user: User = {
    id: crypto.randomUUID(),
    username: "admin",
    passwordHash: hash,
    salt,
    role: "admin",
    createdAt: Date.now(),
  };
  await store.set("admin", user);
}
