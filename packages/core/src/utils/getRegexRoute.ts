/**
 * Converts a route pattern string into a regular expression for matching URLs.
 *
 * This function transforms route patterns with dynamic segments (enclosed in square brackets)
 * into regex patterns that can match actual URLs. Dynamic segments like `[id]` or `[slug]`
 * are converted to match any characters except forward slashes.
 *
 * @param route - The route pattern string to convert (e.g., "/users/[id]/posts/[slug]")
 * @returns A RegExp object that matches URLs conforming to the route pattern
 *
 * @example
 * ```typescript
 * const regex = getRegexRoute("/users/[id]/posts");
 * regex.test("/users/123/posts"); // true
 * regex.test("/users/abc/posts"); // true
 * regex.test("/users/123/comments"); // false
 * ```
 */
export function getRegexRoute(route: string): RegExp {
  const pattern = route
    .split("/")
    .map((seg) => {
      if (!seg) return "";
      if (seg.startsWith("[") && seg.endsWith("]")) return "[^/]+";
      return seg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    })
    .join("/");

  return new RegExp(`^${pattern}$`);
}
