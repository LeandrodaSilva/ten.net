import { findOrderedLayouts } from "./utils/findOrderedLayouts.ts";
import { findDocumentLayoutRoot } from "./utils/findDocumentLayoutRoot.ts";
import type { Route } from "./models/Route.ts";
import type { AppManifest } from "./build/manifest.ts";
import { escapeHtml } from "./utils/htmlEscape.ts";

interface IViewEngine {
  _appPath: string;
  route: Route;
  req: Request;
  params: Record<string, string>;
  embedded?: AppManifest;
}

export async function viewEngine(args: IViewEngine) {
  const {
    _appPath,
    route,
    req,
    params,
    embedded,
  } = args;
  let pageModule = route.page;
  let layoutContents: string[] = [];

  if (false === route.isAdmin) {
    if (embedded) {
      const documentLayout = embedded.documentHtml;
      pageModule = documentLayout.replace("{{content}}", pageModule);
      layoutContents = embedded.layouts[route.path] ?? [];
    } else {
      const layouts = findOrderedLayouts(_appPath, route.path);
      const documentLayout = findDocumentLayoutRoot(_appPath);
      pageModule = documentLayout.replace("{{content}}", pageModule);
      for (const layoutPath of layouts) {
        layoutContents.push(Deno.readTextFileSync(layoutPath));
      }
    }
  }

  if (layoutContents) {
    for (let i = layoutContents.length - 1; i >= 0; i--) {
      pageModule = layoutContents[i].replace("{{content}}", pageModule);
    }

    if (route.run) {
      try {
        const routeResponse = await route.run(req, {
          params,
        }) as Response;

        if (routeResponse) {
          const body = await routeResponse.json();
          const keys = Object.keys(body);

          keys.forEach((key) => {
            // Triple-brace: raw output (unescaped)
            pageModule = String(pageModule).replace(
              `{{{${key}}}}`,
              String(body[key]),
            );
            // Double-brace: escaped output (XSS-safe)
            pageModule = String(pageModule).replace(
              `{{${key}}}`,
              escapeHtml(String(body[key])),
            );
          });
        }
      } catch (e) {
        console.error(e);
      }
    }

    return pageModule;
  }
}
