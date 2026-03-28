import { Route } from "./Route.ts";
import { PluginList } from "../admin/components/plugin-list.tsx";
import { toSlug } from "../utils/toSlug.ts";
import { appWithChildren } from "../admin/app.tsx";
import { Plugins } from "../admin/components/plugins.tsx";

/** Schema map describing a plugin's data model fields and their types. */
export type PluginModel = Record<
  string,
  "string" | "number" | "boolean" | "object"
>;

/**
 * Base class for Ten.net plugins. Extend this class and implement the
 * required properties to create a plugin that auto-registers admin routes.
 */
export abstract class Plugin {
  /** Display name of the plugin. */
  abstract name: string;
  /** Short description shown in the admin dashboard. */
  abstract description: string;
  /** Data model schema for the plugin. */
  abstract model: PluginModel;
  private _routes: Route[] = [];
  private _plugins: Plugin[] = [];

  protected constructor() {
    // Base constructor logic (if any)
  }

  set plugins(plugins: Plugin[]) {
    this._plugins = plugins;
  }

  private _index(_req: Request): Response {
    return new Response(
      JSON.stringify({
        plugin: this.name,
        description: this.description,
        model: this.model,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }

  private _addIndexRoute() {
    const slug = toSlug(this.name);
    const isAdminPlugin = slug === "admin-plugin";
    let path = `/admin/plugins/${slug}`;

    if (isAdminPlugin) {
      path = `/admin`;
    }

    const route = new Route({
      path,
      regex: new RegExp(`^${path}$`),
      hasPage: true,
      transpiledCode: "",
      sourcePath: "",
    });
    route.method = "GET";
    route.run = this._index.bind(this);

    if (isAdminPlugin) {
      route.page = appWithChildren(Plugins);
    } else {
      route.page = appWithChildren(PluginList);
    }

    this._routes.push(route);
  }

  public getRoutes(): Route[] {
    this._addIndexRoute();

    return this._routes;
  }
}
