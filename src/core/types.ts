import type { Route } from "../models/Route.ts";
import type { Middleware } from "../middleware/middleware.ts";
import type { AppManifest } from "../build/manifest.ts";
import type { SitemapContext, SitemapEntry } from "../models/Sitemap.ts";

/**
 * Runtime-agnostic widget page renderer — same contract as {@link WidgetPageRenderer}
 * but uses `unknown` instead of `Deno.Kv` so the core has zero Deno dependencies.
 */
export type WidgetPageRendererCore = (
  pageId: string,
  body: string,
  kv: unknown,
) => Promise<string>;

/** Structural interface for a dynamic route entry (subset of DynamicRoute). */
export interface DynamicRouteLike {
  id: string;
  body: string;
  title: string;
  seo_title: string;
  seo_description: string;
  template: string;
  widgets_enabled?: boolean;
}

/** Dynamic route shape used when enumerating sitemap entries. */
export interface DynamicRouteSitemapLike extends DynamicRouteLike {
  slug?: string;
  route?: { path: string };
  updated_at?: string;
  published_at?: string;
}

/** Runtime-agnostic sitemap entries provider. */
export type SitemapEntriesProvider = (
  context: SitemapContext,
) => Promise<SitemapEntry[]> | SitemapEntry[];

/** Structural interface for a dynamic route registry. */
export interface DynamicRouteRegistryLike {
  match(pathname: string): DynamicRouteLike | null;
  readonly notFoundPage: DynamicRouteLike | null;
  all?(): DynamicRouteSitemapLike[];
}

/**
 * Callback type that renders a matched dynamic page to an HTML string.
 * Injected into TenCore by the Deno adapter (ten.ts) to avoid pulling
 * filesystem and KV dependencies into the core.
 */
export type DynamicPageRenderer = (
  dynamicRoute: DynamicRouteLike,
  req?: Request,
) => Promise<string>;

/** Runtime-agnostic base-64 decoder. Defaults to {@link decodeBase64Universal}. */
export type Base64Decoder = (base64: string) => Uint8Array;

/**
 * Error handler invoked when the request pipeline throws.
 *
 * Receives the originating request and the thrown error, and must produce a
 * `Response`. Registered via {@link TenCore.onError} (or the Deno adapter's
 * `Ten.onError`). If the handler itself throws, the core falls back to a plain
 * `500 Internal Server Error`.
 */
export type ErrorHandler = (
  req: Request,
  error: unknown,
) => Response | Promise<Response>;

/**
 * Lifecycle hook invoked at the start of the request pipeline, before
 * middleware and routing. Returning a `Response` short-circuits the pipeline
 * (the response still passes through any {@link ResponseHook}s). Returning
 * `undefined` continues normally.
 */
export type RequestHook = (
  req: Request,
) => void | Response | Promise<void | Response>;

/**
 * Lifecycle hook invoked after a response is produced. Returning a `Response`
 * replaces the current one (response interceptor); returning `undefined` keeps
 * it. Applied to success, 404, and error responses alike.
 */
export type ResponseHook = (
  req: Request,
  res: Response,
) => void | Response | Promise<void | Response>;

/**
 * Lifecycle hook invoked once during graceful shutdown, after in-flight
 * requests have drained. Use it to release resources (close DB handles, flush
 * buffers, etc.).
 */
export type ShutdownHook = () => void | Promise<void>;

/**
 * Runtime-agnostic admin plugin interface.
 * Uses `unknown` for `kv` and {@link WidgetPageRendererCore} instead of
 * Deno-specific types so external plugins can target the core.
 */
export interface AdminPluginLikeCore {
  init(): Promise<{
    routes: Route[];
    middlewares: Middleware[];
    dynamicRegistry?: DynamicRouteRegistryLike;
    kv?: unknown;
    widgetRenderer?: WidgetPageRendererCore;
  }>;
  getSitemapEntries?(context: SitemapContext): Promise<SitemapEntry[]>;
}

/** Map of route directories to locales to translations (original text to translated text). */
export type I18nMap = Record<string, Record<string, Record<string, string>>>;

/** Options accepted by the {@link TenCore} constructor. */
export interface TenCoreOptions {
  /** Pre-built application manifest (embedded / compiled mode). */
  embedded?: AppManifest;
  /** Pre-loaded routes to seed the core with. */
  routes?: Route[];
  /** App directory path — required for filesystem-based template loading (document.html, layout.html) in non-embedded mode. */
  appPath?: string;
  /** Custom base-64 decoder. Defaults to the `atob`-based universal decoder. */
  decodeBase64?: Base64Decoder;
  /** Pre-scanned i18n translations map. */
  i18n?: I18nMap;
  /** Canonical public base URL used for sitemap and robots generation. */
  canonicalBaseUrl?: string;
  /** Current runtime environment. Non-production disallows all crawling. */
  environment?: string;
  /** Enable or disable the built-in /sitemap.xml endpoint. */
  sitemapEnabled?: boolean;
  /** Enable or disable the built-in /robots.txt endpoint. */
  robotsEnabled?: boolean;
  /** Additional providers for concrete sitemap entries. */
  sitemapEntriesProviders?: SitemapEntriesProvider[];
  /** Custom handler invoked when the request pipeline throws. */
  errorHandler?: ErrorHandler;
}
