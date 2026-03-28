/**
 * Type definitions for the Ten.net application manifest used in
 * compiled single-binary builds. Defines the structure for embedded
 * routes, static assets, and layout mappings.
 *
 * @module
 */

export interface EmbeddedRoute {
  path: string;
  regexSource: string;
  regexFlags: string;
  hasPage: boolean;
  transpiledCode: string;
  pageContent: string;
}

export interface EmbeddedAsset {
  mimeType: string;
  dataBase64: string;
}

export interface AppManifest {
  routes: EmbeddedRoute[];
  layouts: Record<string, string[]>;
  documentHtml: string;
  assets: Record<string, EmbeddedAsset>;
}
