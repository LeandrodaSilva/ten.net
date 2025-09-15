import {routerEngine} from "./routerEngine.ts";
import {viewEngine} from "./viewEngine.ts";
import {paramsEngine} from "./paramsEngine.ts";
import {Route} from "./models/Route.ts";

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

  /**
   * Creates and returns a new instance of the Ten class.
   *
   * @returns A new Ten instance
   */
  static net(): Ten {
    return new Ten();
  }

  private async _handleRequest(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname;

    const route = this._routes.find((r) => r.regex.test(path));
	  route.method = req.method;

    if (!route) return new Response("Not found", { status: 404 });

    try {
      await route.import();

      const params = paramsEngine(path, route);

      if (!route.isView) {
        return route.call(req, {
          params,
        });
      }

      if (route.isView) {
        try {
					const page = await viewEngine({
						_appPath: this._appPath,
						route,
						req,
						params
					});
					return new Response(page, {
						status: 200,
						headers: { "Content-Type": "text/html" },
					})
        } catch {
          console.error(`Error rendering page for route: ${route.path}`); // NOSONAR
        }
      }

      return new Response("Not found", { status: 404 });
    } catch (e) {
      return new Response(String(e), { status: 500 });
    }
  }

	private _startFileWatcher() {
		const worker = new Worker(new URL("./devFileWatcherWorker.ts", import.meta.url), {
			type: "module",
		});

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
   * 2. Logs the loaded routes to the console for debugging purposes
   * 3. Starts the Deno HTTP server with the configured request handler
   *
   * @returns A promise that resolves when the server startup process is complete
   * @throws {Error} May throw if route loading fails or server cannot start
   */
  public async start() {
	  this._routes.push(
		  ...await routerEngine(this._appPath, this._routeFileName),
	  );
	  console.info("Routes:", this._routes.map((r) => r.path));

		if (Deno.env.get("DEBUG")) {
			this._startFileWatcher();
		}

	  Deno.serve(this._handleRequest.bind(this));
  }
}
