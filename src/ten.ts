import { routerEngine } from "./routerEngine.ts";
import { viewEngine } from "./viewEngine.ts";
import { paramsEngine } from "./paramsEngine.ts";
import type { Route } from "./models/Route.ts";
import type { AppManifest } from "./build/manifest.ts";
import { embeddedRouterEngine } from "./embedded/embeddedRouterEngine.ts";
import type { BuildOptions, BuildResult } from "./build/build.ts";
import type { Middleware } from "./middleware/middleware.ts";
import type { DynamicRouteRegistry } from "./routing/dynamicRouteRegistry.ts";
import type { BlogRouteRegistry } from "./routing/blogRouteRegistry.ts";
import { renderDynamicPage } from "./routing/dynamicPageHandler.ts";

/** Interface for an admin plugin that can be registered via useAdmin(). */
export interface AdminPluginLike {
  init(): Promise<{
    routes: Route[];
    middlewares: Middleware[];
    dynamicRegistry?: DynamicRouteRegistry;
    blogRegistry?: BlogRouteRegistry;
    kv?: Deno.Kv;
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
  private readonly _appPath = "./app";
  private readonly _routeFileName = "route.ts";
  private _routes: Route[] = [];
  private _embedded?: AppManifest;
  private _middlewares: Middleware[] = [];
  private _dynamicRegistry?: DynamicRouteRegistry;
  private _kv?: Deno.Kv;

  /**
   * Creates and returns a new instance of the Ten class.
   * When called with an `embedded` manifest, the framework runs in compiled mode
   * using pre-bundled and obfuscated routes, templates, and assets.
   *
   * @param options - Optional configuration. Pass `embedded` for compiled binary mode.
   * @returns A new Ten instance
   *
   * @example
   * ```typescript
   * // Development mode
   * const app = Ten.net();
   *
   * // Compiled mode (used by generated binary)
   * const app = Ten.net({ embedded: manifest });
   * ```
   */
  static net(options?: { embedded?: AppManifest }): Ten {
    const instance = new Ten();
    if (options?.embedded) {
      instance._embedded = options.embedded;
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
    this._middlewares.push(middleware);
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
    const { routes, middlewares, dynamicRegistry, kv } = await admin.init();
    this._routes.push(...routes);
    for (const mw of middlewares) {
      this.use(mw);
    }
    if (dynamicRegistry) {
      this._dynamicRegistry = dynamicRegistry;
    }
    if (kv) {
      this._kv = kv;
    }
  }

  /**
   * Handle a matched dynamic page by rendering it through the template engine.
   * Returns a full HTML response with layouts and SEO meta tags applied.
   */
  private async _handleDynamicPage(
    dynamicRoute: {
      id: string;
      body: string;
      title: string;
      seo_title: string;
      seo_description: string;
      template: string;
      widgets_enabled?: string;
    },
  ): Promise<Response> {
    const html = await renderDynamicPage(
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
      this._kv,
    );
    return new Response(html, {
      status: 200,
      headers: { "Content-Type": "text/html" },
    });
  }

  /**
   * Handle 404 responses. If the DynamicRouteRegistry has a custom 404 page
   * (slug "404"), render it. Otherwise, return a plain text "Not found" response.
   */
  private async _handle404(): Promise<Response> {
    if (this._dynamicRegistry?.notFoundPage) {
      const notFound = this._dynamicRegistry.notFoundPage;
      const html = await renderDynamicPage(
        {
          id: notFound.id,
          body: notFound.body,
          title: notFound.title,
          seo_title: notFound.seo_title,
          seo_description: notFound.seo_description,
          template: notFound.template,
        },
        this._appPath,
        this._kv,
      );
      return new Response(html, {
        status: 404,
        headers: { "Content-Type": "text/html" },
      });
    }
    return new Response("Not found", { status: 404 });
  }

  /** Route an incoming HTTP request through the middleware chain and router. */
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
   * Priority: embedded assets > file-based + admin routes > dynamic pages (GET) > custom 404 > plain 404
   */
  private async _routeRequest(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname;

    if (this._embedded?.assets[path]) {
      const asset = this._embedded.assets[path];
      const { decodeBase64 } = await import("@std/encoding");
      return new Response(decodeBase64(asset.dataBase64), {
        headers: {
          "Content-Type": asset.mimeType,
          "Cache-Control": "public, max-age=31536000",
        },
      });
    }

    const route = this._routes.find((r) => {
      if (!r.regex.test(path)) return false;
      if (r.method !== "ALL" && r.method !== req.method.toUpperCase()) {
        return false;
      }
      return true;
    });

    if (!route) {
      // After file-based + admin route miss, try dynamic pages (GET only)
      if (req.method === "GET" && this._dynamicRegistry) {
        const dynamicRoute = this._dynamicRegistry.match(path);
        if (dynamicRoute) {
          return await this._handleDynamicPage(dynamicRoute);
        }
      }
      return await this._handle404();
    }

    const originalMethod = route.method;
    route.method = req.method;

    try {
      await route.import();

      const params = paramsEngine(path, route);

      if (!route.isView && route.run) {
        const response = route.run(req, {
          params,
        });
        route.method = originalMethod;
        return response;
      }

      if (route.isView) {
        try {
          const page = await viewEngine({
            _appPath: this._appPath,
            route,
            req,
            params,
            embedded: this._embedded,
          });
          route.method = originalMethod;
          return new Response(page, {
            status: 200,
            headers: { "Content-Type": "text/html" },
          });
        } catch {
          console.error(`Error rendering page for route: ${route.path}`); // NOSONAR
        }
      }

      route.method = originalMethod;
      return this._handle404();
    } catch (e) {
      route.method = originalMethod;
      console.error(e);
      return new Response("Internal Server Error", { status: 500 });
    }
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
      this._routes = [];
      this._routes.push(
        ...await routerEngine(this._appPath, this._routeFileName),
      );
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
    if (this._embedded) {
      this._routes.push(...embeddedRouterEngine(this._embedded));
    } else {
      this._routes.push(
        ...await routerEngine(this._appPath, this._routeFileName),
      );
    }

    console.info("Routes:", this._routes.map((r) => r.path));

    if (!this._embedded && Deno.env.get("DEBUG")) {
      this._startFileWatcher();
    }

    return Deno.serve(options ?? {}, this._handleRequest.bind(this));
  }
}
