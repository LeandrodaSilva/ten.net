import { viewEngine } from "../viewEngine.ts";
import { paramsEngine } from "../paramsEngine.ts";
import { embeddedRouterEngine } from "../embedded/embeddedRouterEngine.ts";
import type { Route } from "../models/Route.ts";
import type { AppManifest } from "../build/manifest.ts";
import type { Middleware } from "../middleware/middleware.ts";
import { decodeBase64Universal } from "./base64.ts";
import type {
  AdminPluginLikeCore,
  Base64Decoder,
  DynamicPageRenderer,
  DynamicRouteLike,
  DynamicRouteRegistryLike,
  I18nMap,
  SitemapEntriesProvider,
  TenCoreOptions,
  WidgetPageRendererCore,
} from "./types.ts";
import type { SitemapContext, SitemapEntry } from "../models/Sitemap.ts";

/**
 * Runtime-agnostic HTTP request handler for Ten.net.
 *
 * Handles the full request pipeline — middleware chain, route matching,
 * view rendering, dynamic pages, and 404 — using only Web Standard APIs
 * (`Request`, `Response`, `URL`, `RegExp`, `atob`). Zero Deno dependencies.
 *
 * The Deno-specific adapter ({@link Ten}) wraps this class to add
 * filesystem scanning, `Deno.serve`, and the file watcher.
 *
 * @example
 * ```typescript
 * // Service Worker usage (after Fase 2)
 * import { TenCore } from "@leproj/tennet/core";
 * import type { AppManifest } from "@leproj/tennet/build/manifest";
 *
 * const core = new TenCore({ embedded: manifest });
 * self.addEventListener("fetch", (event) => {
 *   event.respondWith(core.fetch(event.request));
 * });
 * ```
 *
 * @module
 */
export class TenCore {
  private _routes: Route[] = [];
  private _embedded?: AppManifest;
  private _middlewares: Middleware[] = [];
  private _dynamicRegistry?: DynamicRouteRegistryLike;
  private _kv?: unknown;
  private _widgetRenderer?: WidgetPageRendererCore;
  private _dynamicPageRenderer?: DynamicPageRenderer;
  private _decodeBase64: Base64Decoder;
  private _tailwindCss?: string;
  private _i18n: I18nMap = {};
  private _initialized = false;
  private _appPath: string = "";
  private _canonicalBaseUrl?: string;
  private _environment = "development";
  private _sitemapEnabled = true;
  private _robotsEnabled = true;
  private _sitemapEntriesProviders: SitemapEntriesProvider[] = [];

  constructor(options: TenCoreOptions = {}) {
    this._embedded = options.embedded;
    this._decodeBase64 = options.decodeBase64 ?? decodeBase64Universal;
    this._appPath = options.appPath ?? "";
    if (options.i18n) {
      this._i18n = options.i18n;
    }
    if (options.routes?.length) {
      this._routes.push(...options.routes);
    }
    this._canonicalBaseUrl = options.canonicalBaseUrl
      ? this._normalizeBaseUrl(options.canonicalBaseUrl)
      : undefined;
    this._environment = (options.environment ?? "development").trim()
      .toLowerCase();
    this._sitemapEnabled = options.sitemapEnabled ?? true;
    this._robotsEnabled = options.robotsEnabled ?? true;
    this._sitemapEntriesProviders = options.sitemapEntriesProviders
      ? [...options.sitemapEntriesProviders]
      : [];
  }

  // ---------------------------------------------------------------------------
  // Public accessors — used by the Deno adapter (ten.ts) to read/write state
  // ---------------------------------------------------------------------------

  get routes(): readonly Route[] {
    return this._routes;
  }

  get embedded(): AppManifest | undefined {
    return this._embedded;
  }

  get kv(): unknown {
    return this._kv;
  }

  set kv(value: unknown) {
    this._kv = value;
  }

  get widgetRenderer(): WidgetPageRendererCore | undefined {
    return this._widgetRenderer;
  }

  get dynamicRegistry(): DynamicRouteRegistryLike | undefined {
    return this._dynamicRegistry;
  }

  /** Override the dynamic registry (used by tests and the Deno adapter). */
  set dynamicRegistryOverride(r: DynamicRouteRegistryLike | undefined) {
    this._dynamicRegistry = r;
  }

  get tailwindCss(): string | undefined {
    return this._tailwindCss;
  }

  set tailwindCss(value: string | undefined) {
    this._tailwindCss = value;
  }

  get i18n(): I18nMap {
    return this._i18n;
  }

  set i18n(value: I18nMap) {
    this._i18n = value;
  }

  get middlewares(): readonly Middleware[] {
    return this._middlewares;
  }

  get canonicalBaseUrl(): string | undefined {
    return this._canonicalBaseUrl;
  }

  set canonicalBaseUrl(value: string | undefined) {
    this._canonicalBaseUrl = value ? this._normalizeBaseUrl(value) : undefined;
  }

  get environment(): string {
    return this._environment;
  }

  set environment(value: string | undefined) {
    this._environment = (value ?? "development").trim().toLowerCase();
  }

  get sitemapEnabled(): boolean {
    return this._sitemapEnabled;
  }

  set sitemapEnabled(value: boolean) {
    this._sitemapEnabled = value;
  }

  get robotsEnabled(): boolean {
    return this._robotsEnabled;
  }

  set robotsEnabled(value: boolean) {
    this._robotsEnabled = value;
  }

  // ---------------------------------------------------------------------------
  // Route management
  // ---------------------------------------------------------------------------

  /** Append routes to the registry. */
  addRoutes(routes: Route[]): void {
    this._routes.push(...routes);
  }

  /** Remove all routes (used by the file watcher before rescanning). */
  clearRoutes(): void {
    this._routes = [];
  }

  /**
   * Hot-swap the embedded AppManifest at runtime.
   *
   * Replaces the internal manifest, clears all existing routes (including any
   * manually added ones), resets the initialized flag, and rebuilds routes from
   * the new manifest. Intended for the playground feature where the Service
   * Worker manifest needs to be updated without reinstalling the SW.
   */
  updateManifest(manifest: AppManifest): void {
    this._embedded = manifest;
    this._routes = [];
    this._initialized = false;
    if (manifest.i18n) {
      this._i18n = manifest.i18n;
    }
    this.init();
  }

  // ---------------------------------------------------------------------------
  // Middleware & plugin registration
  // ---------------------------------------------------------------------------

  /** Register a middleware in the request pipeline (in order). */
  use(middleware: Middleware): void {
    this._middlewares.push(middleware);
  }

  /**
   * Register a runtime-agnostic admin plugin.
   * Loads its routes, middlewares, dynamic registry, kv, and widget renderer.
   */
  async useAdmin(admin: AdminPluginLikeCore): Promise<void> {
    const { routes, middlewares, dynamicRegistry, kv, widgetRenderer } =
      await admin.init();
    this._routes.push(...routes);
    for (const mw of middlewares) {
      this.use(mw);
    }
    if (dynamicRegistry) {
      this._dynamicRegistry = dynamicRegistry;
    }
    if (kv !== undefined) {
      this._kv = kv;
    }
    if (widgetRenderer) {
      this._widgetRenderer = widgetRenderer;
    }
    if (admin.getSitemapEntries) {
      this.addSitemapEntriesProvider((context) =>
        admin.getSitemapEntries!(context)
      );
    }
  }

  /** Register an additional provider for concrete sitemap entries. */
  addSitemapEntriesProvider(provider: SitemapEntriesProvider): void {
    this._sitemapEntriesProviders.push(provider);
  }

  /**
   * Inject the dynamic-page renderer callback.
   * In Deno this is supplied by the adapter and calls `renderDynamicPage`
   * with the filesystem path and KV instance. In embedded mode it is a
   * lighter in-memory renderer.
   */
  setDynamicPageRenderer(renderer: DynamicPageRenderer): void {
    this._dynamicPageRenderer = renderer;
  }

  // ---------------------------------------------------------------------------
  // Initialisation
  // ---------------------------------------------------------------------------

  /**
   * Load routes from the embedded manifest (if any).
   * Called automatically on the first `fetch()` call — you rarely need to
   * call this manually.
   */
  init(): void {
    if (this._initialized) return;
    this._initialized = true;

    if (this._embedded) {
      this._routes.push(...embeddedRouterEngine(this._embedded));
      if (this._embedded.i18n) {
        this._i18n = this._embedded.i18n;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // HTTP entry point
  // ---------------------------------------------------------------------------

  /**
   * Handle an incoming HTTP request.
   *
   * This is the universal entry point — compatible with the Fetch API used by
   * Cloudflare Workers, Service Workers, Deno, and Node.js.
   */
  fetch = (req: Request): Promise<Response> => {
    if (!this._initialized) this.init();
    return this._handleRequest(req);
  };

  // ---------------------------------------------------------------------------
  // i18n helpers
  // ---------------------------------------------------------------------------

  private get _availableLocales(): string[] {
    const locales = new Set<string>();
    for (const dir of Object.values(this._i18n)) {
      for (const locale of Object.keys(dir)) {
        locales.add(locale);
      }
    }
    return [...locales].sort();
  }

  private _normalizeBaseUrl(url: string): string {
    return url.endsWith("/") ? url.slice(0, -1) : url;
  }

  private _getSeoBaseUrl(request: Request): string {
    return this._normalizeBaseUrl(
      this._canonicalBaseUrl ?? new URL(request.url).origin,
    );
  }

  private _isProductionEnvironment(): boolean {
    return this._environment === "production" || this._environment === "prod";
  }

  private _matchRoute(pathname: string, method: string): Route | undefined {
    return this._routes.find((r) => {
      if (!r.regex.test(pathname)) return false;
      if (r.method !== "ALL" && r.method !== method.toUpperCase()) {
        return false;
      }
      return true;
    });
  }

  private _isPrivatePath(path: string): boolean {
    return path
      .split("/")
      .filter(Boolean)
      .some((segment) => segment.startsWith("_") || segment.startsWith("."));
  }

  private _isSensitivePath(path: string): boolean {
    const prefixes = [
      "/admin",
      "/auth",
      "/account",
      "/preview",
      "/draft",
      "/_",
    ];
    return prefixes.some((prefix) =>
      path === prefix || path.startsWith(`${prefix}/`)
    );
  }

  private _isDynamicPath(path: string): boolean {
    return path.includes("[") || path.includes("]") || path.includes(":");
  }

  private _isPrivateRoute(route: Route): boolean {
    if (this._isPrivatePath(route.path)) return true;
    return route.sourcePath
      .split(/[/\\]+/)
      .filter(Boolean)
      .some((segment) => segment.startsWith("_") || segment.startsWith("."));
  }

  private _toAbsoluteUrl(baseUrl: string, path: string): string {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    return new URL(normalizedPath, `${baseUrl}/`).toString();
  }

  private _normalizeLastmod(value?: string | Date): string | undefined {
    if (!value) return undefined;
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return undefined;
    return date.toISOString();
  }

  private _normalizePriority(value?: number): string | undefined {
    if (typeof value !== "number" || Number.isNaN(value)) return undefined;
    const clamped = Math.max(0, Math.min(1, value));
    return clamped.toFixed(1);
  }

  private _escapeXml(value: string): string {
    return value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&apos;");
  }

  private _shouldIncludeRouteInSitemap(route: Route): boolean {
    if (route.method !== "GET") return false;
    if (route.isAdmin || route.isView) return false;
    if (route.path === "/sitemap.xml" || route.path === "/robots.txt") {
      return false;
    }
    if (this._isPrivateRoute(route) || this._isDynamicPath(route.path)) {
      return false;
    }
    if (this._isSensitivePath(route.path)) return false;
    return true;
  }

  private async _collectSitemapEntries(
    request: Request,
  ): Promise<SitemapEntry[]> {
    const baseUrl = this._getSeoBaseUrl(request);

    const staticEntries: SitemapEntry[] = this._routes
      .filter((route) => this._shouldIncludeRouteInSitemap(route))
      .map((route) => ({ path: route.path }));

    const dynamicEntries = (this._dynamicRegistry?.all?.() ?? []).reduce<
      SitemapEntry[]
    >((entries, route) => {
      const path = route.route?.path ??
        (route.slug ? `/${route.slug}` : undefined);
      if (!path || path === "/404") {
        return entries;
      }
      entries.push({
        path,
        lastmod: route.updated_at ?? route.published_at,
      });
      return entries;
    }, []);

    const context: SitemapContext = {
      request,
      baseUrl,
    };
    const providerResults = await Promise.all(
      this._sitemapEntriesProviders.map(async (provider) => {
        try {
          return await provider(context);
        } catch (error) {
          console.error("Error collecting sitemap entries", error);
          return [];
        }
      }),
    );
    const providerEntries = providerResults.flat();

    const deduped = new Map<string, SitemapEntry>();
    const seoOrigin = new URL(`${baseUrl}/`).origin;

    for (
      const entry of [...staticEntries, ...dynamicEntries, ...providerEntries]
    ) {
      const loc = entry.loc
        ? new URL(entry.loc, `${baseUrl}/`).toString()
        : entry.path
        ? this._toAbsoluteUrl(baseUrl, entry.path)
        : undefined;

      if (!loc) continue;

      const parsed = new URL(loc);
      if (parsed.origin !== seoOrigin) continue;
      if (
        parsed.pathname === "/sitemap.xml" || parsed.pathname === "/robots.txt"
      ) {
        continue;
      }
      if (
        this._isSensitivePath(parsed.pathname) ||
        this._isPrivatePath(parsed.pathname)
      ) {
        continue;
      }
      if (this._isDynamicPath(parsed.pathname)) continue;

      deduped.set(loc, { ...entry, loc });
    }

    return [...deduped.values()].sort((a, b) =>
      (a.loc ?? "").localeCompare(b.loc ?? "")
    );
  }

  private _renderSitemapXml(entries: SitemapEntry[]): string {
    const body = entries.map((entry) => {
      const lastmod = this._normalizeLastmod(entry.lastmod);
      const priority = this._normalizePriority(entry.priority);
      const lines = [
        "  <url>",
        `    <loc>${this._escapeXml(entry.loc ?? "")}</loc>`,
        lastmod ? `    <lastmod>${this._escapeXml(lastmod)}</lastmod>` : "",
        entry.changefreq
          ? `    <changefreq>${this._escapeXml(entry.changefreq)}</changefreq>`
          : "",
        priority ? `    <priority>${priority}</priority>` : "",
        "  </url>",
      ].filter(Boolean);
      return lines.join("\n");
    }).join("\n");

    return [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      body,
      "</urlset>",
      "",
    ].join("\n");
  }

  private async _handleSitemapRequest(request: Request): Promise<Response> {
    if (!this._sitemapEnabled) {
      return new Response("Not found", { status: 404 });
    }

    const xml = this._renderSitemapXml(
      await this._collectSitemapEntries(request),
    );
    return new Response(xml, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=300",
      },
    });
  }

  private _renderRobotsTxt(request: Request): string {
    const lines = ["User-agent: *"];

    if (!this._isProductionEnvironment()) {
      lines.push("Disallow: /");
    } else {
      lines.push(
        "Disallow: /admin",
        "Disallow: /admin/",
        "Disallow: /auth/",
        "Disallow: /account/",
        "Disallow: /preview/",
        "Disallow: /draft/",
        "Disallow: /_/",
      );
    }

    if (this._sitemapEnabled) {
      lines.push(
        `Sitemap: ${
          this._toAbsoluteUrl(this._getSeoBaseUrl(request), "/sitemap.xml")
        }`,
      );
    }

    lines.push("");
    return lines.join("\n");
  }

  private _handleRobotsRequest(request: Request): Response {
    if (!this._robotsEnabled) {
      return new Response("Not found", { status: 404 });
    }

    return new Response(this._renderRobotsTxt(request), {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "public, max-age=300",
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Private pipeline
  // ---------------------------------------------------------------------------

  private async _handleRequest(req: Request): Promise<Response> {
    let index = 0;
    const chain = this._middlewares;
    const routeRequest = this._routeRequest.bind(this);

    const next = async (): Promise<Response> => {
      if (index < chain.length) {
        const mw = chain[index++];
        return await mw(req, next);
      }
      return await routeRequest(req);
    };

    return await next();
  }

  /**
   * Core routing logic.
   * Priority: embedded assets > file-based + admin routes > dynamic pages (GET) > 404
   */
  private async _routeRequest(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname;

    // Resolve i18n locale (no-op when no translations are configured)
    let locale: string | undefined;
    let strippedPath = path;
    if (this._availableLocales.length > 0) {
      const { resolveLocale: resolveLocaleFromReq } = await import(
        "../i18nEngine.ts"
      );
      const resolved = resolveLocaleFromReq(
        req,
        path,
        this._availableLocales,
      );
      locale = resolved.locale;
      strippedPath = resolved.strippedPath;
    }

    // 1. Embedded static assets (match against original path for assets)
    if (this._embedded?.assets[path]) {
      const asset = this._embedded.assets[path];
      return new Response(this._decodeBase64(asset.dataBase64) as BodyInit, {
        headers: {
          "Content-Type": asset.mimeType,
          "Cache-Control": "public, max-age=31536000",
        },
      });
    }

    if (
      req.method === "GET" &&
      path === "/robots.txt" &&
      !this._matchRoute(path, req.method)
    ) {
      return this._handleRobotsRequest(req);
    }

    if (
      req.method === "GET" &&
      path === "/sitemap.xml" &&
      !this._matchRoute(path, req.method)
    ) {
      return await this._handleSitemapRequest(req);
    }

    // 2. File-based + admin routes (use strippedPath for route matching)
    const route = this._matchRoute(strippedPath, req.method);

    if (!route) {
      // 3. Dynamic pages (GET only)
      if (req.method === "GET" && this._dynamicRegistry) {
        const dynamicRoute = this._dynamicRegistry.match(strippedPath);
        if (dynamicRoute) {
          return await this._handleDynamicPage(dynamicRoute, req);
        }
      }
      return await this._handle404();
    }

    const requestMethod = req.method;

    try {
      const handler = await route.import(requestMethod);

      const params = paramsEngine(strippedPath, route);

      if (!route.isViewForMethod(requestMethod) && handler) {
        return handler(req, { params, locale });
      }

      if (route.isViewForMethod(requestMethod)) {
        try {
          const page = await viewEngine({
            _appPath: this._appPath,
            route,
            req,
            params,
            handler,
            embedded: this._embedded,
            tailwindCss: this._tailwindCss,
            locale,
            i18n: this._i18n,
          });
          const headers: Record<string, string> = {
            "Content-Type": "text/html; charset=utf-8",
          };
          if (locale) {
            headers["Content-Language"] = locale;
            if (path !== strippedPath) {
              headers["Set-Cookie"] =
                `ten_lang=${locale}; Path=/; SameSite=Lax; Max-Age=31536000`;
            } else {
              headers["Vary"] = "Accept-Language";
            }
          }
          return new Response(page, { status: 200, headers });
        } catch (error) {
          console.error(
            `Error rendering page for route: ${route.path}`,
            error,
          ); // NOSONAR
          return new Response("Internal Server Error", { status: 500 });
        }
      }

      return this._handle404();
    } catch (e) {
      console.error(`Error handling route: ${route?.path}`, e);
      return new Response("Internal Server Error", { status: 500 });
    }
  }

  private async _handleDynamicPage(
    dynamicRoute: DynamicRouteLike,
    req?: Request,
  ): Promise<Response> {
    if (this._dynamicPageRenderer) {
      const html = await this._dynamicPageRenderer(dynamicRoute, req);
      return new Response(html, {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }
    // Fallback: no renderer injected
    return new Response("Internal Server Error", { status: 500 });
  }

  private async _handle404(): Promise<Response> {
    if (this._dynamicRegistry?.notFoundPage) {
      const notFound = this._dynamicRegistry.notFoundPage;
      if (this._dynamicPageRenderer) {
        const html = await this._dynamicPageRenderer(notFound);
        return new Response(html, {
          status: 404,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      }
    }
    return new Response("Not found", { status: 404 });
  }
}
