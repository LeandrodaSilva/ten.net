/**
 * Extracts named parameters from a URL path based on a route pattern.
 * 
 * @param path - The actual URL path (e.g., "/users/123/posts/456")
 * @param route - The route pattern with named parameters in brackets (e.g., "/users/[id]/posts/[postId]")
 * @returns A record object containing the extracted parameter names and their corresponding values
 * 
 * @example
 * ```typescript
 * const params = pathNamedParams("/users/123/posts/456", "/users/[id]/posts/[postId]");
 * // Returns: { id: "123", postId: "456" }
 * ```
 */
export function pathNamedParams(path: string, route: string): Record<string, string|undefined> {
  const params: Record<string, string|undefined> = {};
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
