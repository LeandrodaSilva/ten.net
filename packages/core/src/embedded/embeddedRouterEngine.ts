import { Route } from "../models/Route.ts";
import type { AppManifest } from "../build/manifest.ts";

export function embeddedRouterEngine(manifest: AppManifest): Route[] {
  return manifest.routes.map((er) => {
    const route = new Route({
      path: er.path,
      regex: new RegExp(er.regexSource, er.regexFlags),
      hasPage: er.hasPage,
      transpiledCode: er.transpiledCode,
      sourcePath: "",
    });

    route.page = er.pageContent;

    return route;
  });
}
