import { walk } from "@deno-walk";
import { encodeBase64 } from "@std/encoding";
import { getRegexRoute } from "../utils/getRegexRoute.ts";
import { transpileRoute } from "../utils/transpileRoute.ts";
import { findOrderedLayoutsSync } from "../utils/findOrderedLayouts.ts";
import { findDocumentLayoutRootSync } from "../utils/findDocumentLayoutRoot.ts";
import { getMimeType } from "./mimeTypes.ts";
import type { AppManifest, EmbeddedRoute } from "./manifest.ts";

export async function collectManifest(
  appPath: string,
  publicPath: string,
  routeFileName = "route.ts",
): Promise<AppManifest> {
  const routes = await collectRoutes(appPath, routeFileName);
  const layouts = collectLayouts(appPath, routes);
  const documentHtml = findDocumentLayoutRootSync(appPath);
  const assets = await collectAssets(publicPath);

  return { routes, layouts, documentHtml, assets };
}

async function collectRoutes(
  appPath: string,
  routeFileName: string,
): Promise<EmbeddedRoute[]> {
  const entries: {
    path: string;
    hasPage: boolean;
    hasRoute: boolean;
    pageContent: string;
    sourcePath: string;
  }[] = [];

  for await (const entry of walk(appPath, { includeDirs: true })) {
    if (!entry.isDirectory) continue;

    let hasPage = false;
    let hasRoute = false;
    let pageContent = "";

    try {
      Deno.lstatSync(`${entry.path}/${routeFileName}`);
      hasRoute = true;
    } catch {
      // No route file
    }

    try {
      pageContent = Deno.readTextFileSync(`${entry.path}/page.html`);
      hasPage = true;
    } catch {
      // No page file
    }

    if (!hasRoute && !hasPage) continue;

    const rel = entry.path
      .replace(/^[.\/]*app/, "")
      .replaceAll("\\", "/");

    const path = rel.length ? rel : "/";
    const sourcePath = `${entry.path}/${routeFileName}`;

    entries.push({ path, hasPage, hasRoute, pageContent, sourcePath });
  }

  const routes: EmbeddedRoute[] = await Promise.all(
    entries.map(async (e) => {
      const regex = getRegexRoute(e.path);
      let transpiledCode = "";

      if (e.hasRoute) {
        try {
          Deno.lstatSync(e.sourcePath);
          transpiledCode = await transpileRoute(e.sourcePath);
        } catch (err) {
          console.error(`Error transpiling ${e.sourcePath}:`, err);
        }
      }

      return {
        path: e.path,
        regexSource: regex.source,
        regexFlags: regex.flags,
        hasPage: e.hasPage,
        transpiledCode,
        pageContent: e.pageContent,
      };
    }),
  );

  return routes;
}

function collectLayouts(
  appPath: string,
  routes: EmbeddedRoute[],
): Record<string, string[]> {
  const layoutMap: Record<string, string[]> = {};

  for (const route of routes) {
    if (!route.hasPage) continue;

    const layoutPaths = findOrderedLayoutsSync(appPath, route.path);
    const layoutContents: string[] = [];

    for (const layoutPath of layoutPaths) {
      try {
        layoutContents.push(Deno.readTextFileSync(layoutPath));
      } catch {
        // Layout file could not be read
      }
    }

    layoutMap[route.path] = layoutContents;
  }

  return layoutMap;
}

async function collectAssets(
  publicPath: string,
): Promise<Record<string, { mimeType: string; dataBase64: string }>> {
  const assets: Record<string, { mimeType: string; dataBase64: string }> = {};

  try {
    Deno.lstatSync(publicPath);
  } catch {
    return assets;
  }

  for await (const entry of walk(publicPath, { includeFiles: true })) {
    if (entry.isDirectory) continue;

    const relativePath = "/" +
      entry.path.replace(publicPath, "").replace(/^[\/\\]+/, "").replaceAll(
        "\\",
        "/",
      );
    const data = await Deno.readFile(entry.path);
    const mimeType = getMimeType(entry.path);

    assets[relativePath] = {
      mimeType,
      dataBase64: encodeBase64(data),
    };
  }

  return assets;
}
