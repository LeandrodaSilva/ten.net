import { walk } from "@std/fs/walk";
import { transpileFile } from "./trans.ts";

export type RouteInfo = {
  route: string;
  regex: RegExp;
  hasPage: boolean;
  transpiledCode: string;
};

interface DefaultContext<P> {
  params?: P;
}

// const TRANSPILED_CODE: any = {};
//
// for await (const entry of walk("./app", { includeDirs: false, exts: [".ts"] })) {
//   const sourcePath = entry.path;
//   const outPath = sourcePath.replace(/\.ts$/, ".js");
//   try {
//     console.log("Transpilando", sourcePath, "->", outPath);
//     TRANSPILED_CODE[`@${sourcePath}`] = await transpileFile(sourcePath);
//   } catch (e) {
//     console.error(`Erro ao transpilar ${sourcePath}:`, e);
//   }
// }

export class Ten<C extends DefaultContext<any>> {
  private readonly _appPath = "./app";
  private readonly _routeFileName = "route.ts";
  private readonly _routes: RouteInfo[] = [];

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
      let hasRoute = false;

      try {
        await Deno.stat(`${entry.path}/${this._routeFileName}`);
        hasRoute = true;
      } catch {
      }

      try {
        await Deno.stat(`${entry.path}/page.html`);
        hasPage = true;
      } catch {
      }

      if (!hasRoute && !hasPage) continue;

      const rel = entry.path
        .replace(/^[.\/]*app/, "") // remove prefixos como './app' ou 'app'
        .replaceAll("\\", "/");

      const route = rel.length ? rel : "/";

      const sourcePath = `${entry.path}/route.ts`;
      const outPath = sourcePath.replace(/\.ts$/, ".js");
      let transpiledCode = "";
      try {
        console.log("Transpilando", sourcePath, "->", outPath);
        transpiledCode = await transpileFile(sourcePath);
      } catch (e) {
        console.error(`Erro ao transpilar ${sourcePath}:`, e);
      }

      routes.push({
        route,
        regex: this._toRegex(route),
        hasPage,
        transpiledCode,
      });
    }

    return routes;
  }

  private _pathNamedParams(
    path: string,
    route: string,
  ): Record<string, string> {
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

  private async _handleRequest(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname;
    const method = req.method.toUpperCase();

    const match = this._routes.find((r) => r.regex.test(path));
    if (!match) return new Response("Not found", { status: 404 });

    try {
      console.info(
        "Module called path:",
        `@app${match.route}/${this._routeFileName}`,
      );
      const module = await import(
        "data:application/javascript," +
          encodeURIComponent(match.transpiledCode)
      ) as unknown as any;
      console.info("Module called:", module);
      const fn = module[method] as
        | ((req: Request, ctx: C) => Response | Promise<Response>)
        | undefined;
      const params = this._pathNamedParams(path, match.route);
      if (typeof fn === "function" && !match.hasPage) {
        return fn(req, {
          params,
        } as C);
      }

      if (Object.keys(module).length === 0 && !match.hasPage) {
        throw new Error("Module is empty");
      }

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

            if (fn) {
              try {
                const routeResponse = await fn(req, {
                  params,
                } as C) as Response;

                if (routeResponse) {
                  const body = await routeResponse.json();
                  const keys = Object.keys(body);

                  keys.forEach((key) => {
                    fullContent = String(fullContent).replace(`{{${key}}}`, body[key])
                  })
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
      return new Response("Method not implemented", { status: 500 });
    }
  }

  public async start() {
    this._routes.push(...await this._buildRoutes());
    console.info("Routes:", this._routes.map((r) => r.route));
    Deno.serve(this._handleRequest.bind(this));
  }
}
