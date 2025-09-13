import {walk} from "@deno-walk";
import {getRegexRoute} from "./utils/getRegexRoute.ts";
import {transpileRoute} from "./utils/transpileRoute.ts";
import {Route} from "./models/Route.ts";

/**
 * Creates route information by scanning a directory structure for route files and pages.
 *
 * This function walks through the specified application path, identifies directories containing
 * route files (with the specified filename) and/or page.html files, generates route patterns,
 * and transpiles TypeScript route files to JavaScript.
 *
 * @param appPath - The root path of the application to scan for routes
 * @param routeFileName - The name of the route file to look for (e.g., "route.ts")
 * @returns A Promise that resolves to an array of RouteInfo objects containing route metadata,
 *          including the route pattern, regex, page presence flag, and transpiled code
 *
 * @example
 * ```typescript
 * const routes = await routeFactory('./app', 'route.ts');
 * console.log(rout es); // Array of RouteInfo objects
 * ```
 *
 * @remarks
 * - Only directories containing either a route file or page.html are processed
 * - Route paths are normalized to use forward slashes and remove app prefix
 * - TypeScript route files are automatically transpiled to JavaScript
 * - Transpilation errors are logged but don't stop the process
 * - Missing route files are handled gracefully and return empty transpiled code
 */
export async function routerEngine(
  appPath: string,
  routeFileName: string,
): Promise<Route[]> {
  const routes: Route[] = [];

  for await (const entry of walk(appPath, { includeDirs: true })) {
    if (!entry.isDirectory) continue;

    let hasPage = false;
    let hasRoute = false;
		let page: string = "";

    try {
      Deno.lstatSync(`${entry.path}/${routeFileName}`);
      hasRoute = true;
    } catch {
      // No route file
    }

    try {
	    page = Deno.readTextFileSync(
		    `${entry.path}/page.html`,
	    );
      hasPage = true;
    } catch {
      // No page file
    }

    if (!hasRoute && !hasPage) continue;

    const rel = entry.path
      .replace(/^[.\/]*app/, "") // remove prefixos como './app' ou 'app'
      .replaceAll("\\", "/");

    const path = rel.length ? rel : "/";

    const sourcePath = `${entry.path}/route.ts`;

		const route = new Route({
			path,
			regex: getRegexRoute(path),
			hasPage,
			transpiledCode: "",
			sourcePath,
		});

		route.page = page;

    routes.push(route);
  }

  const promises = routes.map(async (r) => {
    const sourcePath = r.sourcePath;
    let transpiledCode = "";

    try {
      Deno.lstatSync(sourcePath);
    } catch {
      return r;
    }

    try {
      transpiledCode = await transpileRoute(sourcePath);
    } catch (e) {
      console.error(`Error ${sourcePath}:`, e);
    }

    r.transpiledCode = transpiledCode;

    return r;
  });

  return await Promise.all(promises);
}
