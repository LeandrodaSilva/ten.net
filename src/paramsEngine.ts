import { pathNamedParams } from "./utils/pathNamedParams.ts";
import { Route } from "./models/Route.ts";

export function paramsEngine(path: string, route: Route) {
  const rawParams = pathNamedParams(path, route.path);
  return Object.fromEntries(
    Object.entries(rawParams).filter(([_, value]) => value !== undefined),
  ) as Record<string, string>;
}
