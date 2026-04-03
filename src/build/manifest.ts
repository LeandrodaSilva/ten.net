/**
 * Type definitions for the Ten.net application manifest used in
 * compiled single-binary builds. Defines the structure for embedded
 * routes, static assets, and layout mappings.
 *
 * @module
 */

/** A route entry embedded in the compiled application binary. */
export interface EmbeddedRoute {
  /** URL path pattern (e.g. `/hello/[name]`). */
  path: string;
  /** Serialised RegExp source for runtime matching. */
  regexSource: string;
  /** RegExp flags (e.g. `"i"`). */
  regexFlags: string;
  /** Whether the route has an associated HTML page template. */
  hasPage: boolean;
  /** Transpiled JavaScript source of the route handler. */
  transpiledCode: string;
  /** Raw HTML content of the page template, if any. */
  pageContent: string;
}

/** A static asset embedded in the compiled binary. */
export interface EmbeddedAsset {
  /** MIME type (e.g. `"image/png"`). */
  mimeType: string;
  /** Base-64 encoded file contents. */
  dataBase64: string;
}

/** Top-level manifest describing a compiled Ten.net application. */
export interface AppManifest {
  /** All embedded route definitions. */
  routes: EmbeddedRoute[];
  /** Map of directory paths to their ordered layout file contents. */
  layouts: Record<string, string[]>;
  /** Root document HTML wrapper. */
  documentHtml: string;
  /** Map of URL paths to their embedded static assets. */
  assets: Record<string, EmbeddedAsset>;
  /** Optional seed data for browser storage (store name → items). */
  _seed?: Record<string, Array<{ id: string; [key: string]: unknown }>>;
}
