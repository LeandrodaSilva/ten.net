export interface ExtendableEvent extends Event {
  waitUntil(f: Promise<unknown>): void;
}

export interface FetchEvent extends ExtendableEvent {
  readonly request: Request;
  readonly clientId: string;
  readonly resultingClientId: string;
  respondWith(r: Response | PromiseLike<Response>): void;
}

export interface TenServiceWorkerOptions {
  /** Fallback fetch when route returns 404 (e.g., network passthrough). */
  fallback?: typeof fetch;
  /**
   * Only intercept requests whose pathname starts with this prefix.
   * The prefix is stripped before passing the request to TenCore.
   * Requests not matching the prefix are passed to fallback or fetch().
   */
  pathPrefix?: string;
}
