/** Minimal `ExtendableEvent` shape from the Service Worker API. */
export interface ExtendableEvent extends Event {
  /** Extend the event's lifetime until the given promise settles. */
  waitUntil(f: Promise<unknown>): void;
}

/** Minimal `FetchEvent` shape from the Service Worker API. */
export interface FetchEvent extends ExtendableEvent {
  /** The request being fetched. */
  readonly request: Request;
  /** ID of the client that initiated the fetch. */
  readonly clientId: string;
  /** ID of the client resulting from the fetch (for navigations). */
  readonly resultingClientId: string;
  /** Respond to the fetch with a response (or a promise of one). */
  respondWith(r: Response | PromiseLike<Response>): void;
}

/** Options for the Ten.net Service Worker adapter ({@link handle}/{@link fire}). */
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
