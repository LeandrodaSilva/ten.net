import {walk} from "@std/fs/walk";

export type RouteInfo = {
  route: string;
  regex: RegExp;
  hasPage: boolean;
};

export interface DefaultContext<P> {
  params?: P;
}

export class Ten<C extends DefaultContext<any>> {
  private readonly _appPath = "./app";
  private readonly _routeFileName = "route.ts";
  private readonly _routes: RouteInfo[] = [];
  private _context: (req: Request) => Partial<C> = (req: Request): {} => ({})

  static net<C extends DefaultContext<any>>(): Ten<C> {
    return new Ten<C>();
  }

  private _escapeRegex(s: string) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  private _toRegex(route: string): RegExp {
    const pattern = route
      .split("/")
      .map((seg) => {
        if (!seg) return "";
        if (seg.startsWith("[") && seg.endsWith("]")) return "[^/]+";
        return this._escapeRegex(seg);
      })
      .join("/");

    return new RegExp(`^${pattern}$`);
  }

  private async _buildRoutes(): Promise<RouteInfo[]> {
    const routes: RouteInfo[] = [];

    for await (const entry of walk(this._appPath, { includeDirs: true })) {
      if (!entry.isDirectory) continue;

      let hasPage = false;

      try {
        await Deno.stat(`${entry.path}/${this._routeFileName}`);
      } catch {
        try {
          await Deno.stat(`${entry.path}/page.html`);
          hasPage = true;
        } catch {
          continue;
        }
      }

      const rel = entry.path
        .replace(/^[.\/]*app/, "") // remove prefixos como './app' ou 'app'
        .replaceAll("\\", "/");

      const route = rel.length ? rel : "/";

      routes.push({
        route,
        regex: this._toRegex(route),
        hasPage,
      });
    }

    return routes;
  }

  private _pathNamedParams(path: string, route: string): Record<string, string> {
    const params: Record<string, string> = {};
    const pathSegments = path.split("/").filter(Boolean);
    const routeSegments = route.split("/").filter(Boolean);

    routeSegments.forEach((seg, i) => {
      if (seg.startsWith("[") && seg.endsWith("]")) {
        const paramName = seg.slice(1, -1);
        params[paramName] = pathSegments[i];
      }
    });
    return params;
  }

  public setContext(context: (req: Request) => Partial<C>): Ten<C> {
    this._context = context;
    return this;
  }

  private _findOrderedLayouts(route: string): string[] {
    const layouts: string[] = [];
    const segments = route.split("/").filter(Boolean);
    let currentPath = this._appPath;

    for (const segment of ["", ...segments]) {
      currentPath += `/${segment}`;
      try {
        Deno.statSync(`${currentPath}/layout.html`);
        layouts.push(`${currentPath}/layout.html`);
      } catch {
        // No layout in this segment, continue
      }
    }

    return layouts;
  }

  private _findDocumentLayoutRoot(): string {
    const rootLayoutPath = `${this._appPath}/document.html`;
    try {
      Deno.statSync(rootLayoutPath);
      return Deno.readTextFileSync(rootLayoutPath);
    } catch {
      return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Ten.net</title></head><body>{{content}}</body></html>`;
    }
  }

  public async start() {
    this._routes.push(...await this._buildRoutes());
    console.info("Routes:", this._routes.map(r => r.route));
    Deno.serve(async (req: Request): Promise<Response> => {
      const url = new URL(req.url);
      const path = url.pathname;
      const method = req.method.toUpperCase();

      const match = this._routes.find((r) => r.regex.test(path));
      if (!match) return new Response("Not found", { status: 404 });

      try {
        const module = await eval('import(`${this._appPath}${match.route}/${this._routeFileName}`)');
        const fn = module[method] as
          | ((req: Request, ctx: C) => Response | Promise<Response>)
          | undefined;
        const params = this._pathNamedParams(path, match.route);
        if (typeof fn === "function" && !match.hasPage) {
          return fn(req, {
            params,
            ...this._context(req),
          } as C);
        }
        return new Response("Method not implemented", { status: 501 });
      } catch {
        if (match.hasPage && method === "GET") {
          try {
            const pageModule = Deno.readTextFileSync(
              `${this._appPath}${match.route}/page.html`,
            );
            const layouts = this._findOrderedLayouts(match.route);
            const documentLayout = this._findDocumentLayoutRoot();
            let fullContent = documentLayout.replace("{{content}}", pageModule);
            if (layouts) {
              for (let i = layouts.length - 1; i >= 0; i--) {
                const layoutContent = Deno.readTextFileSync(layouts[i]);
                fullContent = layoutContent.replace("{{content}}", fullContent);
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
          }
          catch {
            return new Response("Not found", { status: 404 });
          }
        }
        return new Response("Not found", { status: 404 });
      }
    });
  }
}
