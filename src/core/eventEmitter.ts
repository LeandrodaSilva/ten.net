/**
 * Listener for an {@link EventEmitter} event. Receives the emitted arguments
 * and may be synchronous or asynchronous.
 */
export type EventListener = (...args: unknown[]) => void | Promise<void>;

interface ListenerEntry {
  fn: EventListener;
  once: boolean;
}

/**
 * Minimal, runtime-agnostic event emitter used as the plugin-communication bus.
 *
 * Plugins and application code can publish and subscribe to named events to
 * coordinate without holding direct references to each other.
 *
 * `emit` invokes listeners sequentially in registration order, awaiting async
 * ones, and is resilient: a listener that throws is logged and skipped so it
 * cannot break the other listeners or the request that triggered the event.
 *
 * @example
 * ```typescript
 * const events = new EventEmitter();
 * events.on("page:published", (slug) => console.log("published", slug));
 * await events.emit("page:published", "/about");
 * ```
 */
export class EventEmitter {
  #listeners = new Map<string, ListenerEntry[]>();

  /** Register a listener for `event`. Returns `this` for chaining. */
  on(event: string, listener: EventListener): this {
    return this.#add(event, listener, false);
  }

  /** Register a one-shot listener that is removed after its first invocation. */
  once(event: string, listener: EventListener): this {
    return this.#add(event, listener, true);
  }

  /** Remove a previously registered listener (matched by reference). */
  off(event: string, listener: EventListener): this {
    const entries = this.#listeners.get(event);
    if (!entries) return this;
    const next = entries.filter((entry) => entry.fn !== listener);
    if (next.length > 0) this.#listeners.set(event, next);
    else this.#listeners.delete(event);
    return this;
  }

  /** Remove all listeners for `event`, or every listener when `event` is omitted. */
  removeAllListeners(event?: string): this {
    if (event === undefined) this.#listeners.clear();
    else this.#listeners.delete(event);
    return this;
  }

  /** Number of listeners currently registered for `event`. */
  listenerCount(event: string): number {
    return this.#listeners.get(event)?.length ?? 0;
  }

  /** Names of all events that currently have at least one listener. */
  eventNames(): string[] {
    return [...this.#listeners.keys()];
  }

  /**
   * Emit `event`, invoking each listener with `args` in registration order.
   * Awaits async listeners sequentially; a listener error is logged and does
   * not abort the remaining listeners.
   */
  async emit(event: string, ...args: unknown[]): Promise<void> {
    const entries = this.#listeners.get(event);
    if (!entries || entries.length === 0) return;
    // Snapshot so listeners added/removed during dispatch don't affect this pass.
    for (const entry of [...entries]) {
      if (entry.once) this.#removeEntry(event, entry);
      try {
        await entry.fn(...args);
      } catch (error) {
        console.error(`Listener for "${event}" threw; ignoring`, error); // NOSONAR
      }
    }
  }

  #add(event: string, listener: EventListener, once: boolean): this {
    const entries = this.#listeners.get(event);
    if (entries) entries.push({ fn: listener, once });
    else this.#listeners.set(event, [{ fn: listener, once }]);
    return this;
  }

  #removeEntry(event: string, entry: ListenerEntry): void {
    const entries = this.#listeners.get(event);
    if (!entries) return;
    const index = entries.indexOf(entry);
    if (index !== -1) entries.splice(index, 1);
    if (entries.length === 0) this.#listeners.delete(event);
  }
}
