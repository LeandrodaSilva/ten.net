/** How frequently a sitemap URL is likely to change (`<changefreq>`). */
export type SitemapChangeFrequency =
  | "always"
  | "hourly"
  | "daily"
  | "weekly"
  | "monthly"
  | "yearly"
  | "never";

/** A single entry in the generated `sitemap.xml`. */
export interface SitemapEntry {
  /** Route path (e.g. `/about`), resolved against the site base URL. */
  path?: string;
  /** Absolute URL; takes precedence over {@link SitemapEntry.path}. */
  loc?: string;
  /** Last-modified date, rendered as `<lastmod>`. */
  lastmod?: string | Date;
  /** Expected change frequency, rendered as `<changefreq>`. */
  changefreq?: SitemapChangeFrequency;
  /** Priority relative to other URLs (0.0–1.0), rendered as `<priority>`. */
  priority?: number;
}

/** Context passed to sitemap-entry providers when collecting URLs. */
export interface SitemapContext {
  /** The incoming request that triggered sitemap generation. */
  request: Request;
  /** The resolved canonical base URL for the site. */
  baseUrl: string;
}
