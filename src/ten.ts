import { routerEngine } from "./routerEngine.ts";
import { viewEngine } from "./viewEngine.ts";
import { paramsEngine } from "./paramsEngine.ts";
import type { Route } from "./models/Route.ts";
import type { Plugin } from "./models/Plugin.ts";
import { PagePlugin } from "./plugins/pagePlugin.ts";
import { AdminPlugin } from "./plugins/adminPlugin.ts";
import { PostsPlugin } from "./plugins/postsPlugin.ts";
import { CategoriesPlugin } from "./plugins/categoriesPlugin.ts";
import { GroupsPlugin } from "./plugins/groupsPlugin.ts";
import { UsersPlugin } from "./plugins/usersPlugin.ts";
import { SettingsPlugin } from "./plugins/settingsPlugin.ts";
import type { AppManifest } from "./build/manifest.ts";
import { embeddedRouterEngine } from "./embedded/embeddedRouterEngine.ts";
import type { BuildOptions, BuildResult } from "./build/build.ts";
import type { Middleware } from "./middleware/middleware.ts";
import { authMiddleware } from "./auth/authMiddleware.ts";
import { csrfMiddleware } from "./auth/csrfMiddleware.ts";
import { securityHeadersMiddleware } from "./auth/securityHeaders.ts";

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
  private _plugins: Plugin[] = [];
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
   * Registers a plugin with the Ten application. The plugin's routes are
   * automatically added to the router and it becomes visible in the admin dashboard.
   *
   * @param plugin - The plugin class constructor to register. Must extend the abstract Plugin class.
   *
   * @example
   * ```typescript
   * import { Ten } from "@leproj/tennet";
   *
   * const app = Ten.net();
   * app.addPlugin(MyPlugin);
   * ```
   */
  public addPlugin(plugin: new (...args: never[]) => Plugin): void {
    // Here you can add logic to register the plugin
    console.log(`Plugin ${plugin.name} added.`);
    const p = new plugin();
    const routes = p.getRoutes();
    this._plugins.push(p);
    this._routes.push(...routes);
    this._plugins.forEach((pl) => {
      pl.plugins = this._plugins;
    });
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

  /** Core routing logic, extracted from the original _handleRequest. */
  private async _routeRequest(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname;

    if (path === "/admin/favicon.ico") {
      const { faviconBytes } = await import("./assets/faviconData.ts");
      return new Response(faviconBytes.buffer as ArrayBuffer, {
        headers: { "Content-Type": "image/x-icon" },
      });
    }

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
      // Routes with specific methods must match the request method
      if (r.method !== "ALL" && r.method !== req.method.toUpperCase()) {
        return false;
      }
      return true;
    });

    if (!route) return new Response("Not found", { status: 404 });

    // Save original method and set request method for import resolution
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
   * This method performs the following operations:
   * 1. Loads routes from the route factory using the configured app path and route file name
   * 2. Registers built-in plugins (admin, pages, posts, categories, groups, users, settings)
   * 3. Registers security middlewares (headers, auth, CSRF)
   * 4. Starts the Deno HTTP server with the configured request handler
   *
   * @param options - Optional Deno.ServeTcpOptions (e.g. `{ port: 3000 }`)
   * @returns The Deno.HttpServer instance for lifecycle control (e.g. shutdown)
   * @throws {Error} May throw if route loading fails or server cannot start
   *
   * @example
   * ```typescript
   * const app = Ten.net();
   * const server = await app.start({ port: 3000 });
   * // Later: await server.shutdown();
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

    // Register built-in plugins
    this.addPlugin(AdminPlugin);
    this.addPlugin(PagePlugin);
    this.addPlugin(PostsPlugin);
    this.addPlugin(CategoriesPlugin);
    this.addPlugin(GroupsPlugin);
    this.addPlugin(UsersPlugin);
    this.addPlugin(SettingsPlugin);
    console.info("Routes:", this._routes.map((r) => r.path));

    // Register security middlewares
    this.use(securityHeadersMiddleware);
    this.use(authMiddleware());
    this.use(csrfMiddleware);

    if (!this._embedded && Deno.env.get("DEBUG")) {
      this._startFileWatcher();
    }

    return Deno.serve(options ?? {}, this._handleRequest.bind(this));
  }
}
