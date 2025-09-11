import type { RouteInfo } from "./@types/routeInfo.ts";
import { routeFactory } from "./routeFactory.ts";
import { findDocumentLayoutRoot } from "./utils/findDocumentLayoutRoot.ts";
import { findOrderedLayouts } from "./utils/findOrderedLayouts.ts";
import { pathNamedParams } from "./utils/pathNamedParams.ts";

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
  private readonly _routes: RouteInfo[] = [];

  /**
   * Creates and returns a new instance of the Ten class.
   *
   * @returns A new Ten instance
   */
  static net(): Ten {
    return new Ten();
  }

  /**
   * Dynamically imports and executes JavaScript code to retrieve a specific method function.
   *
   * This method creates a data URI from the provided JavaScript code, imports it as a module,
   * and extracts the specified method function that can handle HTTP requests.
   *
   * @param method - The name of the method/function to extract from the imported module
   * @param code - The JavaScript code as a string to be dynamically imported
   *
   * @returns A promise that resolves to an object containing:
   * - `module`: The imported module as a record of key-value pairs
   * - `fn`: The extracted method function that accepts a Request and optional context with params,
   *   or undefined if the method doesn't exist or isn't callable
   *
   * @throws Logs errors to console if the dynamic import fails, but doesn't throw exceptions
   *
   * @example
   * ```typescript
   * const result = await this._getRouteModuleMethodFn('handleGet', 'export function handleGet(req) { return new Response("Hello"); }');
   * if (result.fn) {
   *   const response = await result.fn(request, { params: { id: '123' } });
   * }
   * ```
   */
  private async _getRouteModuleMethodFn(method: string, code: string): Promise<{
    module: Record<string, unknown>;
    fn:
      | ((
        req: Request,
        ctx?: { params: Record<string, string> },
      ) => Response | Promise<Response>)
      | undefined;
  }> {
    try {
      const module = await import(
        "data:application/javascript," +
          encodeURIComponent(code)
      ) as unknown as Record<string, unknown>;
      console.info("Module called:", module);
      const fn = module[method] as
        | ((
          req: Request,
          ctx?: { params: Record<string, string> },
        ) => Response | Promise<Response>)
        | undefined;
      return {
        module,
        fn,
      };
    } catch (e) {
      console.error(e);
      return { module: {}, fn: undefined };
    }
  }

  private async _handleRequest(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname;
    const method = req.method.toUpperCase();

    const match = this._routes.find((r) => r.regex.test(path));
    if (!match) return new Response("Not found", { status: 404 });

    try {
      const { fn, module } = await this._getRouteModuleMethodFn(
        method,
        match.transpiledCode,
      );
      const rawParams = pathNamedParams(path, match.route);
      const params = Object.fromEntries(
        Object.entries(rawParams).filter(([_, value]) => value !== undefined),
      ) as Record<string, string>;

      if (typeof fn === "function" && (!match.hasPage || method !== "GET")) {
        return fn(req, {
          params,
        });
      }

      if (Object.keys(module).length === 0 && !match.hasPage) {
        throw new Error("Module is empty");
      }

      if (match.hasPage && method === "GET") {
        try {
          const pageModule = Deno.readTextFileSync(
            `${this._appPath}${match.route}/page.html`,
          );
          const layouts = findOrderedLayouts(this._appPath, match.route);
          const documentLayout = findDocumentLayoutRoot(this._appPath);
          let fullContent = documentLayout.replace("{{content}}", pageModule);
          if (layouts) {
            for (let i = layouts.length - 1; i >= 0; i--) {
              const layoutContent = Deno.readTextFileSync(layouts[i]);
              fullContent = layoutContent.replace("{{content}}", fullContent);
            }

            if (fn) {
              try {
                const routeResponse = await fn(req, {
                  params,
                }) as Response;

                if (routeResponse) {
                  const body = await routeResponse.json();
                  const keys = Object.keys(body);

                  keys.forEach((key) => {
                    fullContent = String(fullContent).replace(
                      `{{${key}}}`,
                      body[key],
                    );
                  });
                }
              } catch (e) {
                console.error(e);
              }
            }

            return new Response(fullContent, {
              status: 200,
              headers: { "Content-Type": "text/html" },
            });
          }
          return new Response(pageModule, {
            status: 200,
            headers: { "Content-Type": "text/html" },
          });
        } catch {
          return new Response("Not found", { status: 404 });
        }
      }
      return new Response("Not found", { status: 404 });
    } catch (e) {
      return new Response(String(e), { status: 500 });
    }
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
      ...await routeFactory(this._appPath, this._routeFileName),
    );
    console.info("Routes:", this._routes.map((r) => r.route));
    Deno.serve(this._handleRequest.bind(this));
  }
}
