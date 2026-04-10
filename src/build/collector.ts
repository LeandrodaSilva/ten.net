import { walk } from "@deno-walk";
import { encodeBase64 } from "@std/encoding";
import { getRegexRoute } from "../utils/getRegexRoute.ts";
import { transpileRoute } from "../utils/transpileRoute.ts";
import { findOrderedLayoutsSync } from "../utils/findOrderedLayouts.ts";
import { findDocumentLayoutRootSync } from "../utils/findDocumentLayoutRoot.ts";
import { getMimeType } from "./mimeTypes.ts";
import {
  findSelectorTemplateSync,
  scanTranslationsSync,
} from "../i18nEngine.ts";
import type { AppManifest, EmbeddedRoute } from "./manifest.ts";

export async function collectManifest(
  appPath: string,
  publicPath: string,
  routeFileName = "route.ts",
): Promise<AppManifest> {
  const routes = await collectRoutes(appPath, routeFileName);
  const layouts = collectLayouts(appPath, routes);
  let documentHtml = findDocumentLayoutRootSync(appPath);
  const assets = await collectAssets(publicPath);
  const i18nMap = scanTranslationsSync(appPath);

  // Generate inline Tailwind CSS at build time
  const { hasTailwindCdn, injectTailwindCss } = await import(
    "../tailwind/inject.ts"
  );
  if (hasTailwindCdn(documentHtml)) {
    const { extractCandidates, extractCandidatesFromTs } = await import(
      "../tailwind/scanner.ts"
    );
    const { generateTailwindCss } = await import("../tailwind/generator.ts");

    const allHtml: string[] = [documentHtml];
    const allTs: string[] = [];
    for (const route of routes) {
      if (route.pageContent) allHtml.push(route.pageContent);
    }
    for (const contents of Object.values(layouts)) {
      allHtml.push(...contents);
    }

    // Scan .ts files in appPath to capture classes emitted dynamically from
    // route handlers (e.g. template literals in buildNavHtml()).
    for await (
      const entry of walk(appPath, {
        exts: [".ts"],
        includeDirs: false,
      })
    ) {
      try {
        allTs.push(await Deno.readTextFile(entry.path));
      } catch { /* ignore */ }
    }

    const candidates = [
      ...new Set([
        ...extractCandidates(allHtml),
        ...extractCandidatesFromTs(allTs),
      ]),
    ];
    const css = await generateTailwindCss(candidates);
    documentHtml = injectTailwindCss(documentHtml, css);
  }

  const manifest: AppManifest = { routes, layouts, documentHtml, assets };
  if (Object.keys(i18nMap).length > 0) {
    manifest.i18n = i18nMap;
  }

  // Collect custom i18n selector templates
  const selectorTemplates: Record<string, string> = {};
  for (const route of routes) {
    if (!route.hasPage) continue;
    const template = findSelectorTemplateSync(appPath, route.path);
    if (template) selectorTemplates[route.path] = template;
  }
  if (Object.keys(selectorTemplates).length > 0) {
    manifest.selectorTemplates = selectorTemplates;
  }

  return manifest;
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

    const normalizedAppPath = appPath.replace(/\\/g, "/").replace(/^\.\//, "")
      .replace(/\/$/, "");
    const normalizedEntryPath = entry.path.replace(/\\/g, "/").replace(
      /^\.\//,
      "",
    );
    const rel = normalizedEntryPath.startsWith(normalizedAppPath)
      ? normalizedEntryPath.slice(normalizedAppPath.length)
      : normalizedEntryPath.replace(/^[.\/]*app/, "");

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
