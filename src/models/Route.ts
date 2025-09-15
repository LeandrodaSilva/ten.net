export class Route {
  public path: string;
  public regex: RegExp;
  public hasPage: boolean;
  public transpiledCode: string;
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
  private _call:
    | ((
      req: Request,
      ctx?: { params: Record<string, string> },
    ) => Response | Promise<Response>)
    | undefined;

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

  get method() {
    return this._method;
  }

	get call() {
		return this._call;
	}

	set page(str: string) {
		this._pageContent = str;
	}

	get page() {
		return this._pageContent;
	}

	get isView() {
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
  public async import(): Promise<| ((
	  req: Request,
	  ctx?: { params: Record<string, string> },
  ) => Response | Promise<Response>)
	  | undefined> {
    try {
      const module = await import(
        "data:application/javascript," +
          encodeURIComponent(this.transpiledCode)
      ) as unknown as Record<string, unknown>;
      console.info("Module called:", module);
      const fn = module[this._method] as
        | ((
          req: Request,
          ctx?: { params: Record<string, string> },
        ) => Response | Promise<Response>)
        | undefined;
      if (Object.keys(module).length === 0 && !this.hasPage) {
        throw new Error("Module is empty");
      }
			this._call = fn;
      return fn;
    } catch (e) {
      console.error(e);
      return undefined;
    }
  }
}
