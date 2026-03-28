/**
 * Auto-discovers route entrypoints in the application directory and
 * bundles them using Deno's bundler API.
 *
 * @module
 */

import { walk } from "@deno-walk";

/** Configuration options for {@linkcode bundleRoutes}. */
export interface BundleRoutesOptions {
  /** Path to the app directory (default: "./app") */
  appPath?: string;
  /** Route file name to look for (default: "route.ts") */
  routeFileName?: string;
  /** Output directory for bundled files (default: "dist") */
  outputDir?: string;
  /** Whether to minify the output (default: false) */
  minify?: boolean;
}

/**
 * Walks the application directory and discovers all route entrypoint files.
 *
 * @param appPath - Root application directory to scan
 * @param routeFileName - Name of the route file to look for (e.g. "route.ts")
 * @returns Array of file paths to discovered route entrypoints
 */
export async function discoverRouteEntrypoints(
  appPath: string,
  routeFileName: string,
): Promise<string[]> {
  const entrypoints: string[] = [];

  try {
    Deno.lstatSync(appPath);
  } catch {
    return entrypoints;
  }

  for await (const entry of walk(appPath, { includeDirs: true })) {
    if (!entry.isDirectory) continue;

    const routePath = `${entry.path}/${routeFileName}`;

    try {
      Deno.lstatSync(routePath);
      entrypoints.push(routePath);
    } catch {
      // No route file in this directory
    }
  }

  return entrypoints;
}

/**
 * Auto-discovers route files in the app directory and bundles them
 * together using `Deno.bundle()`.
 *
 * @param options - Bundle configuration options
 * @returns The Deno bundle result
 *
 * @example
 * ```typescript
 * const result = await bundleRoutes({ appPath: "./app", outputDir: "./dist" });
 * console.log(result.success);
 * ```
 */
export async function bundleRoutes(
  options?: BundleRoutesOptions,
): Promise<ReturnType<typeof Deno.bundle>> {
  const appPath = options?.appPath ?? "./app";
  const routeFileName = options?.routeFileName ?? "route.ts";
  const outputDir = options?.outputDir ?? "dist";
  const minify = options?.minify ?? false;

  const entrypoints = await discoverRouteEntrypoints(appPath, routeFileName);

  if (entrypoints.length === 0) {
    throw new Error(`No route entrypoints found in "${appPath}"`);
  }

  return await Deno.bundle({
    entrypoints,
    outputDir,
    platform: "deno",
    minify,
  });
}
