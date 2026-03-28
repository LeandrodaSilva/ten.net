import { evaluateModuleCode } from "../utils/evaluateModuleCode.ts";

/** Represents a single route in the Ten.net application. */
export class Route {
  /** URL path pattern (e.g. `/hello/[name]`). */
  public path: string;
  /** Compiled regular expression used for URL matching. */
  public regex: RegExp;
  /** Whether this route has an associated HTML page template. */
  public hasPage: boolean;
  /** Transpiled JavaScript source for the route handler. */
  public transpiledCode: string;
  /** Filesystem path to the original TypeScript source file. */
  public sourcePath: string;
  private _pageContent: string = "";
  private _method:
    | "GET"
    | "POST"
    | "PUT"
    | "DELETE"
    | "PATCH"
    | "OPTIONS"
    | "HEAD"
    | "ALL" = "ALL";
  private _run:
    | ((
      req: Request,
      ctx?: { params: Record<string, string> },
    ) => Response | Promise<Response>)
    | undefined;

  /** Create a new Route. */
  constructor(args: {
    path: string;
    regex: RegExp;
    hasPage: boolean;
    transpiledCode: string;
    sourcePath: string;
  }) {
    this.path = args.path;
    this.regex = args.regex;
    this.hasPage = args.hasPage;
    this.transpiledCode = args.transpiledCode;
    this.sourcePath = args.sourcePath;
  }

  /** Set the HTTP method for this route. */
  set method(method: string) {
    const m = method.toUpperCase();
    if (
      ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD", "ALL"]
        .includes(m)
    ) {
      this._method = m as
        | "GET"
        | "POST"
        | "PUT"
        | "DELETE"
        | "PATCH"
        | "OPTIONS"
        | "HEAD"
        | "ALL";
    }
  }

  /** The current HTTP method. */
  get method(): string {
    return this._method;
  }

  /** Whether this route lives under `/admin`. */
  get isAdmin(): boolean {
    const adminPathPattern = /^\/admin(\/|$)/;
    return adminPathPattern.test(this.path);
  }

  /** The route handler function, if any. */
  get run():
    | ((
      req: Request,
      ctx?: { params: Record<string, string> },
    ) => Response | Promise<Response>)
    | undefined {
    return this._run;
  }

  /** Assign a handler function to this route. */
  set run(
    fn:
      | ((
        req: Request,
        ctx?: { params: Record<string, string> },
      ) => Response | Promise<Response>)
      | undefined,
  ) {
    this._run = fn;
  }

  /** Set the HTML page template content. */
  set page(str: string) {
    this._pageContent = str;
  }

  /** The HTML page template content. */
  get page(): string {
    return this._pageContent;
  }

  /** Whether this route should be rendered as an HTML page (has page + GET). */
  get isView(): boolean {
    return this.hasPage && this._method === "GET";
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
  public async import(): Promise<
    | ((
      req: Request,
      ctx?: { params: Record<string, string> },
    ) => Response | Promise<Response>)
    | undefined
  > {
    if (this.run) return this.run;
    try {
      const module = await evaluateModuleCode(this.transpiledCode);
      const fn = module[this._method] as
        | ((
          req: Request,
          ctx?: { params: Record<string, string> },
        ) => Response | Promise<Response>)
        | undefined;
      if (Object.keys(module).length === 0 && !this.hasPage) {
        throw new Error("Module is empty");
      }
      this._run = fn;
      return fn;
    } catch (e) {
      console.error(e);
      return undefined;
    }
  }
}
