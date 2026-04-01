import type { SessionStore } from "../auth/sessionStore.ts";
import type { Session } from "../auth/types.ts";

/**
 * Deno KV-backed session store with native TTL expiry.
 *
 * Key layout:
 * - Sessions: ["auth", "sessions", sessionId] → Session
 * - User index: ["auth", "sessions_by_user", userId, sessionId] → sessionId
 */
export class DenoKvSessionStore implements SessionStore {
  private _kv: Deno.Kv;

  constructor(kv: Deno.Kv) {
    this._kv = kv;
  }

  private _sessionKey(sessionId: string): Deno.KvKey {
    return ["auth", "sessions", sessionId];
  }

  private _userIndexKey(userId: string, sessionId: string): Deno.KvKey {
    return ["auth", "sessions_by_user", userId, sessionId];
  }

  async get(sessionId: string): Promise<Session | null> {
    const entry = await this._kv.get<Session>(this._sessionKey(sessionId));
    const session = entry.value ?? null;
    if (session && session.expiresAt < Date.now()) {
      await this.delete(sessionId);
      return null;
    }
    return session;
  }

  async set(sessionId: string, session: Session): Promise<void> {
    const ttlMs = session.expiresAt - Date.now();
    const expireIn = ttlMs > 0 ? ttlMs : undefined;

    const op = this._kv.atomic()
      .set(this._sessionKey(sessionId), session, { expireIn })
      .set(
        this._userIndexKey(session.userId, sessionId),
        sessionId,
        { expireIn },
      );

    const result = await op.commit();
    if (!result.ok) {
      throw new Error(`Failed to set session "${sessionId}"`);
    }
  }

  async delete(sessionId: string): Promise<void> {
    const entry = await this._kv.get<Session>(this._sessionKey(sessionId));
    const op = this._kv.atomic()
      .delete(this._sessionKey(sessionId));

    if (entry.value) {
      op.delete(this._userIndexKey(entry.value.userId, sessionId));
    }

    await op.commit();
  }

  async deleteByUserId(userId: string): Promise<void> {
    const prefix: Deno.KvKey = ["auth", "sessions_by_user", userId];
    const ops: string[] = [];

    for await (const entry of this._kv.list<string>({ prefix })) {
      ops.push(entry.value);
    }

    for (const sessionId of ops) {
      await this.delete(sessionId);
    }
  }
}
