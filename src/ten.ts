import { routerEngine } from "./routerEngine.ts";
import { viewEngine } from "./viewEngine.ts";
import { paramsEngine } from "./paramsEngine.ts";
import type { Route } from "./models/Route.ts";
import type { AppManifest } from "./build/manifest.ts";
import { embeddedRouterEngine } from "./embedded/embeddedRouterEngine.ts";
import type { BuildOptions, BuildResult } from "./build/build.ts";
import type { Middleware } from "./middleware/middleware.ts";

/** Interface for an admin plugin that can be registered via useAdmin(). */
export interface AdminPluginLike {
  init(): Promise<{ routes: Route[]; middlewares: Middleware[] }>;
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
    const { routes, middlewares } = await admin.init();
    this._routes.push(...routes);
    for (const mw of middlewares) {
      this.use(mw);
    }
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

  /** Core routing logic. */
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

    if (!route) return new Response("Not found", { status: 404 });

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
      return new Response("Not found", { status: 404 });
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
