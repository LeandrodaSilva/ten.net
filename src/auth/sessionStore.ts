import type { Session } from "./types.ts";

/** Pluggable session storage interface. */
export interface SessionStore {
  get(sessionId: string): Promise<Session | null>;
  set(sessionId: string, session: Session): Promise<void>;
  delete(sessionId: string): Promise<void>;
  deleteByUserId(userId: string): Promise<void>;
}

/** In-memory session store with automatic expiry cleanup. */
export class InMemorySessionStore implements SessionStore {
  private _store = new Map<string, Session>();

  async get(sessionId: string): Promise<Session | null> {
    const session = this._store.get(sessionId) ?? null;
    if (session && session.expiresAt < Date.now()) {
      this._store.delete(sessionId);
      return null;
    }
    return session;
  }

  async set(sessionId: string, session: Session): Promise<void> {
    this._store.set(sessionId, session);
  }

  async delete(sessionId: string): Promise<void> {
    this._store.delete(sessionId);
  }

  async deleteByUserId(userId: string): Promise<void> {
    for (const [id, session] of this._store) {
      if (session.userId === userId) {
        this._store.delete(id);
      }
    }
  }
}
