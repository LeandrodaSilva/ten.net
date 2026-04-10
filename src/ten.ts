import { routerEngine } from "./routerEngine.ts";
import type { Route } from "./models/Route.ts";
import type { AppManifest } from "./build/manifest.ts";
import type { BuildOptions, BuildResult } from "./build/build.ts";
import type { Middleware } from "./middleware/middleware.ts";
import type { DynamicRouteRegistry } from "./routing/dynamicRouteRegistry.ts";
import type { WidgetPageRenderer } from "./models/WidgetResolver.ts";
import { renderDynamicPage } from "./routing/dynamicPageHandler.ts";
import { TenCore } from "./core/tenCore.ts";
import type {
  AdminPluginLikeCore,
  DynamicRouteRegistryLike,
} from "./core/types.ts";

/** Interface for an admin plugin that can be registered via useAdmin(). */
export interface AdminPluginLike {
  init(): Promise<{
    routes: Route[];
    middlewares: Middleware[];
    dynamicRegistry?: DynamicRouteRegistry;
    kv?: Deno.Kv;
    widgetRenderer?: WidgetPageRenderer;
  }>;
}

/**
 * Ten is a web framework class that provides routing, request handling, and server functionality.
 * It supports file-based routing with dynamic route parameters, HTML page rendering with layouts,
 * and automatic transpilation of TypeScript route files.
 *
 * @example
 * ```typescript
 * const app = Ten.net();
 * await app.start();
 * ```
 */
export class Ten {
  private readonly _appPath: string;
  private readonly _routeFileName = "route.ts";
  private _core: TenCore;

  private constructor(appPath = "./app") {
    this._appPath = appPath;
    this._core = new TenCore({ appPath });
    this._setDefaultDynamicPageRenderer();
  }

  /** Install the Deno-aware dynamic-page renderer on the core. */
  private _setDefaultDynamicPageRenderer(): void {
    this._core.setDynamicPageRenderer((dynamicRoute, req) => {
      return renderDynamicPage(
        {
          id: dynamicRoute.id,
          body: dynamicRoute.body,
          title: dynamicRoute.title,
          seo_title: dynamicRoute.seo_title,
          seo_description: dynamicRoute.seo_description,
          template: dynamicRoute.template,
          widgets_enabled: dynamicRoute.widgets_enabled,
        },
        this._appPath,
        this._core.kv as Deno.Kv | undefined,
        req ? { url: new URL(req.url).href, type: "website" } : undefined,
        this._core.widgetRenderer
          ? (pageId, body, kv) =>
            this._core.widgetRenderer!(pageId, body, kv as Deno.Kv)
          : undefined,
        this._core.tailwindCss,
      );
    });
  }

  /**
   * Creates and returns a new instance of the Ten class.
   * When called with an `embedded` manifest, the framework runs in compiled mode
   * using pre-bundled and obfuscated routes, templates, and assets.
   *
   * @param options - Optional configuration.
   * @returns A new Ten instance
   *
   * @example
   * ```typescript
   * // Development mode
   * const app = Ten.net();
   *
   * // Custom app path
   * const app = Ten.net({ appPath: "./src/app" });
   *
   * // Compiled mode (used by generated binary)
   * const app = Ten.net({ embedded: manifest });
   * ```
   */
  static net(options?: { embedded?: AppManifest; appPath?: string }): Ten {
    const instance = new Ten(options?.appPath);
    if (options?.embedded) {
      instance._core = new TenCore({
        embedded: options.embedded,
        appPath: options?.appPath,
      });
      // Re-install the renderer on the new core instance.
      instance._setDefaultDynamicPageRenderer();
    }
    return instance;
  }

  /**
   * Compiles the application into an encrypted binary.
   * Collects routes, templates, and assets, encrypts them with AES-256-GCM,
   * and optionally compiles to a standalone Deno binary.
   *
   * @param options - Build configuration options
   * @returns Build result with paths and statistics
   *
   * @example
   * ```typescript
   * import { Ten } from "@leproj/tennet";
   *
   * const result = await Ten.build({ output: "./dist" });
   * console.log(`Built ${result.stats.routes} routes`);
   * ```
   */
  static async build(options?: BuildOptions): Promise<BuildResult> {
    const { build } = await import("./build/build.ts");
    return build(options);
  }

  /**
   * Registers a middleware function in the request pipeline.
   * Middlewares are executed in the order they are registered.
   *
   * @param middleware - The middleware function to register
   */
  public use(middleware: Middleware): void {
    this._core.use(middleware);
  }

  /**
   * Registers an admin plugin, initializing its routes and middlewares.
   * If the admin plugin returns a DynamicRouteRegistry, it is stored
   * for dynamic page matching in the request pipeline.
   * Call this before start() to enable the admin panel.
   *
   * @param admin - An AdminPlugin instance (or any object implementing AdminPluginLike)
   *
   * @example
   * ```typescript
   * import { Ten } from "@leproj/tennet";
   * import { AdminPlugin, PagePlugin } from "@leproj/tennet/admin";
   *
   * const app = Ten.net();
   * await app.useAdmin(new AdminPlugin({ plugins: [PagePlugin] }));
   * await app.start();
   * ```
   */
  public async useAdmin(admin: AdminPluginLike): Promise<void> {
    const coreAdmin: AdminPluginLikeCore = {
      init: async () => {
        const result = await admin.init();
        return {
          routes: result.routes,
          middlewares: result.middlewares,
          dynamicRegistry: result.dynamicRegistry as
            | DynamicRouteRegistryLike
            | undefined,
          kv: result.kv,
          widgetRenderer: result.widgetRenderer
            ? (pageId, body, kv) =>
              result.widgetRenderer!(pageId, body, kv as Deno.Kv)
            : undefined,
        };
      },
    };

    // The default dynamic-page renderer (set in the constructor) reads
    // this._core.kv and this._core.widgetRenderer lazily, so it automatically
    // picks up the values set by useAdmin — no re-injection needed.
    await this._core.useAdmin(coreAdmin);
  }

  /**
   * Exposes the core fetch handler for direct use (e.g. testing, Cloudflare).
   */
  get fetch(): (req: Request) => Promise<Response> {
    return this._core.fetch;
  }

  /** Spawn a web worker that watches the app directory for file changes. */
  private _startFileWatcher() {
    const worker = new Worker(
      new URL("./devFileWatcherWorker.ts", import.meta.url),
      {
        type: "module",
      },
    );

    worker.onmessage = async (event) => {
      console.info("Worker message: ", event);
      this._core.clearRoutes();
      this._core.addRoutes(
        await routerEngine(this._appPath, this._routeFileName),
      );
      const { scanTranslations } = await import("./i18nEngine.ts");
      this._core.i18n = await scanTranslations(this._appPath);
      await this._generateTailwindCss();
    };

    worker.postMessage({
      action: "start",
    });
  }

  /**
   * Starts the server by loading routes and beginning to serve HTTP requests.
   *
   * @param options - Optional Deno.ServeTcpOptions (e.g. `{ port: 3000 }`)
   * @returns The Deno.HttpServer instance for lifecycle control (e.g. shutdown)
   *
   * @example
   * ```typescript
   * const app = Ten.net();
   * await app.start({ port: 3000 });
   * ```
   */
  public async start(
    options?: Deno.ServeTcpOptions,
  ): Promise<Deno.HttpServer<Deno.NetAddr>> {
    if (!this._core.embedded) {
      this._core.addRoutes(
        await routerEngine(this._appPath, this._routeFileName),
      );
      const { scanTranslations } = await import("./i18nEngine.ts");
      this._core.i18n = await scanTranslations(this._appPath);

      // Validate translations (dev mode only)
      if (Object.keys(this._core.i18n).length > 0) {
        const { validateTranslations } = await import("./i18nEngine.ts");
        const templates: Record<string, string> = {};
        for (const route of this._core.routes) {
          if (route.hasPage && route.page) {
            templates[route.path] = route.page;
          }
        }
        validateTranslations(this._core.i18n, templates);
      }

      await this._generateTailwindCss();
    }
    // Embedded routes are loaded lazily inside TenCore.init() on first fetch.

    console.info(
      "Routes:",
      this._core.routes.map((r) => r.path),
    );

    if (!this._core.embedded && Deno.env.get("DEBUG")) {
      this._startFileWatcher();
    }

    return Deno.serve(options ?? {}, this._core.fetch);
  }

  // ---------------------------------------------------------------------------
  // Tailwind CSS generation (dev mode)
  // ---------------------------------------------------------------------------

  /** Scan routes for Tailwind classes and generate inline CSS. */
  private async _generateTailwindCss(): Promise<void> {
    const { findDocumentLayoutRoot } = await import(
      "./utils/findDocumentLayoutRoot.ts"
    );
    const { hasTailwindCdn } = await import("./tailwind/inject.ts");

    const documentHtml = await findDocumentLayoutRoot(this._appPath);
    if (!hasTailwindCdn(documentHtml)) return;

    const { findOrderedLayouts } = await import(
      "./utils/findOrderedLayouts.ts"
    );
    const { extractCandidates, extractCandidatesFromTs } = await import(
      "./tailwind/scanner.ts"
    );
    const { generateTailwindCss } = await import("./tailwind/generator.ts");

    const allHtml: string[] = [documentHtml];
    const allTs: string[] = [];

    for (const route of this._core.routes) {
      if (route.page) allHtml.push(route.page);
      const layouts = await findOrderedLayouts(this._appPath, route.path);
      for (const layoutPath of layouts) {
        allHtml.push(await Deno.readTextFile(layoutPath));
      }
    }

    // Scan .ts files in appPath to capture classes emitted dynamically from
    // route handlers (e.g. template literals in buildNavHtml()).
    const { walk } = await import("@deno-walk");
    for await (
      const entry of walk(this._appPath, {
        exts: [".ts"],
        includeDirs: false,
      })
    ) {
      try {
        allTs.push(await Deno.readTextFile(entry.path));
      } catch { /* ignore */ }
    }

    const candidates = [
      ...new Set([
        ...extractCandidates(allHtml),
        ...extractCandidatesFromTs(allTs),
      ]),
    ];
    this._core.tailwindCss = await generateTailwindCss(candidates);
  }

  // ---------------------------------------------------------------------------
  // Private compatibility shims — tests access these via type casting
  // ---------------------------------------------------------------------------

  /** @internal Used by tests via type casting. Delegates to TenCore. */
  private _handleRequest(req: Request): Promise<Response> {
    return this._core.fetch(req);
  }

  /** @internal Used by tests via type casting. */
  private get _routes(): readonly Route[] {
    return this._core.routes;
  }

  private set _routes(r: Route[]) {
    this._core.clearRoutes();
    if (r.length) this._core.addRoutes(r);
  }

  /** @internal Used by tests via type casting. */
  private get _middlewares(): readonly Middleware[] {
    return this._core.middlewares;
  }

  /** @internal Used by tests via type casting. */
  private get _dynamicRegistry(): DynamicRouteRegistryLike | undefined {
    return this._core.dynamicRegistry;
  }

  private set _dynamicRegistry(r: DynamicRouteRegistryLike | undefined) {
    this._core.dynamicRegistryOverride = r;
  }
}
