/**
 * Represents information about a route in the application.
 *
 * @interface RouteInfo
 * @property {string} route - The route path or pattern
 * @property {RegExp} regex - Regular expression used for route matching
 * @property {boolean} hasPage - Indicates whether the route has an associated page component
 * @property {string} transpiledCode - The compiled/transpiled code for the route
 * @property {string} sourcePath - The file system path to the source file
 */
export type RouteInfo = {
  route: string;
  regex: RegExp;
  hasPage: boolean;
  transpiledCode: string;
  sourcePath: string;
};
