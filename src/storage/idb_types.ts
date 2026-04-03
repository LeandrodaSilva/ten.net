/**
 * Minimal IndexedDB type definitions for Deno compatibility.
 * These are local types (not `declare global`) to avoid JSR slow-types issues.
 * At runtime, the actual IndexedDB API is accessed via `globalThis`.
 *
 * @module
 */

export type IDBTransactionMode = "readonly" | "readwrite" | "versionchange";

export interface IDBRequest<T = unknown> {
  readonly result: T;
  readonly error: DOMException | null;
  onsuccess: ((this: IDBRequest<T>) => void) | null;
  onerror: ((this: IDBRequest<T>) => void) | null;
}

export interface IDBOpenDBRequest extends IDBRequest<IDBDatabase> {
  onupgradeneeded: ((this: IDBOpenDBRequest) => void) | null;
}

export interface IDBTransaction {
  readonly error: DOMException | null;
  objectStore(name: string): IDBObjectStore;
  oncomplete: (() => void) | null;
  onerror: (() => void) | null;
  onabort: (() => void) | null;
}

export interface IDBCursorWithValue {
  readonly value: unknown;
  continue(): void;
}

export interface IDBObjectStore {
  get(key: string): IDBRequest;
  put(value: Record<string, unknown>): IDBRequest;
  delete(key: string): IDBRequest;
  count(): IDBRequest<number>;
  openCursor(): IDBRequest<IDBCursorWithValue | null>;
}

export interface IDBDatabase {
  readonly objectStoreNames: { contains(str: string): boolean };
  transaction(
    storeNames: string | string[],
    mode?: IDBTransactionMode,
  ): IDBTransaction;
  createObjectStore(
    name: string,
    options?: { keyPath?: string; autoIncrement?: boolean },
  ): IDBObjectStore;
  close(): void;
}

export interface IDBFactory {
  open(name: string, version?: number): IDBOpenDBRequest;
  deleteDatabase(name: string): IDBRequest;
}

/** Get the global `indexedDB` factory. */
export function getIndexedDB(): IDBFactory {
  // deno-lint-ignore no-explicit-any
  return (globalThis as any).indexedDB as IDBFactory;
}
