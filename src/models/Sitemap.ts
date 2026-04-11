export type SitemapChangeFrequency =
  | "always"
  | "hourly"
  | "daily"
  | "weekly"
  | "monthly"
  | "yearly"
  | "never";

export interface SitemapEntry {
  path?: string;
  loc?: string;
  lastmod?: string | Date;
  changefreq?: SitemapChangeFrequency;
  priority?: number;
}

export interface SitemapContext {
  request: Request;
  baseUrl: string;
}
