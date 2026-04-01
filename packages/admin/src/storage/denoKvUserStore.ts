import type { UserStore } from "../auth/userStore.ts";
import type { User } from "../auth/types.ts";

/** Deno KV-backed user store. Persists admin users across restarts. */
export class DenoKvUserStore implements UserStore {
  private _kv: Deno.Kv;

  constructor(kv: Deno.Kv) {
    this._kv = kv;
  }

  async get(username: string): Promise<User | null> {
    const entry = await this._kv.get<User>(["auth", "users", username]);
    return entry.value;
  }

  async set(username: string, user: User): Promise<void> {
    await this._kv.set(["auth", "users", username], user);
  }

  async delete(username: string): Promise<void> {
    await this._kv.delete(["auth", "users", username]);
  }
}
