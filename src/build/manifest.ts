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
