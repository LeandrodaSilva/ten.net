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
}
