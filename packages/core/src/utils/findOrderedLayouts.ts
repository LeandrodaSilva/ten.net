/**
 * Finds all layout.html files in the hierarchical path structure from the app root to the specified route.
 *
 * @param appPath - The base application path where the search begins
 * @param route - The route path to traverse, segments separated by forward slashes
 * @returns An array of file paths to layout.html files found in order from root to the deepest segment
 *
 * @example
 * ```typescript
 * const layouts = findOrderedLayouts('/app', '/users/profile');
 * // Returns: ['/app/layout.html', '/app/users/layout.html', '/app/users/profile/layout.html']
 * ```
 */
export function findOrderedLayouts(appPath: string, route: string): string[] {
  const layouts: string[] = [];
  const segments = route.split("/").filter(Boolean);
  let currentPath = appPath;

  for (const segment of ["", ...segments]) {
    currentPath += `/${segment}`;
    try {
      Deno.lstatSync(`${currentPath}/layout.html`);
      layouts.push(`${currentPath}/layout.html`);
    } catch {
      // No layout in this segment, continue
    }
  }

  return layouts.map((p) => p.replaceAll("//", "/"));
}
