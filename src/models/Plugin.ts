import { Route } from "./Route.ts";
import { toSlug } from "../utils/toSlug.ts";
import { appWithChildren, renderAdminPage } from "../admin/app.tsx";
import { Plugins } from "../admin/components/plugins.tsx";
import { CrudList } from "../admin/components/crud-list.tsx";
import { CrudForm } from "../admin/components/crud-form.tsx";
import type { FormFieldProps } from "../admin/components/form-field.tsx";
import { requestSession } from "../auth/authMiddleware.ts";
import { InMemoryStorage } from "./Storage.ts";
import type { Storage, StorageItem } from "./Storage.ts";

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
  /** Storage instance for this plugin's data. */
  public storage: Storage = new InMemoryStorage();

  protected constructor() {
    // Base constructor logic (if any)
  }

  /** Replace the list of registered plugins (used internally for cross-plugin awareness). */
  set plugins(plugins: Plugin[]) {
    this._plugins = plugins;
  }

  /** Get the URL slug for this plugin. */
  get slug(): string {
    return toSlug(this.name);
  }

  /** Validate data against the plugin's model schema. */
  public validate(
    data: Record<string, unknown>,
  ): { valid: boolean; errors: Record<string, string> } {
    const errors: Record<string, string> = {};
    for (const [key, type] of Object.entries(this.model)) {
      const value = data[key];
      if (value === undefined || value === null || value === "") {
        if (type !== "boolean") {
          errors[key] = `${key} is required`;
        }
        continue;
      }
      if (type === "string" && typeof value !== "string") {
        errors[key] = `${key} must be a string`;
      }
      if (
        type === "number" && typeof value !== "number" && isNaN(Number(value))
      ) {
        errors[key] = `${key} must be a number`;
      }
      if (
        type === "boolean" && typeof value !== "boolean" && value !== "true" &&
        value !== "false"
      ) {
        errors[key] = `${key} must be a boolean`;
      }
    }
    return { valid: Object.keys(errors).length === 0, errors };
  }

  /** Return a JSON representation of this plugin. */
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

  /** Handle listing items with pagination. */
  private async _listItems(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") ?? "1", 10);
    const search = url.searchParams.get("q") ?? undefined;
    const searchFields = Object.keys(this.model).filter((k) =>
      this.model[k] === "string"
    );
    const items = await this.storage.list({
      page,
      limit: 20,
      search,
      searchFields,
    });
    const total = await this.storage.count({ search, searchFields });
    return new Response(
      JSON.stringify({
        plugin: this.name,
        description: this.description,
        items,
        total,
        page,
        totalPages: Math.ceil(total / 20),
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }

  /** Handle creating a new item. */
  private async _createItem(req: Request): Promise<Response> {
    const formData = await req.formData();
    const data: Record<string, unknown> = {};
    for (const key of Object.keys(this.model)) {
      data[key] = formData.get(key)?.toString() ?? "";
    }
    const { valid, errors } = this.validate(data);
    if (!valid) {
      return new Response(JSON.stringify({ errors }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const item: StorageItem = {
      id,
      ...data,
      created_at: now,
      updated_at: now,
    };
    await this.storage.set(id, item);
    const slug = toSlug(this.name);
    return new Response(null, {
      status: 302,
      headers: { Location: `/admin/plugins/${slug}?success=created` },
    });
  }

  /** Handle getting a single item. */
  private async _getItem(
    _req: Request,
    ctx?: { params: Record<string, string> },
  ): Promise<Response> {
    const id = ctx?.params?.id;
    if (!id) return new Response("Not found", { status: 404 });
    const item = await this.storage.get(id);
    if (!item) return new Response("Not found", { status: 404 });
    return new Response(
      JSON.stringify({
        plugin: this.name,
        description: this.description,
        item,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }

  /** Handle updating an item. */
  private async _updateItem(
    req: Request,
    ctx?: { params: Record<string, string> },
  ): Promise<Response> {
    const id = ctx?.params?.id;
    if (!id) return new Response("Not found", { status: 404 });
    const existing = await this.storage.get(id);
    if (!existing) return new Response("Not found", { status: 404 });
    const formData = await req.formData();
    const data: Record<string, unknown> = { ...existing };
    for (const key of Object.keys(this.model)) {
      const val = formData.get(key);
      if (val !== null) data[key] = val.toString();
    }
    data.updated_at = new Date().toISOString();
    await this.storage.set(id, data as StorageItem);
    const slug = toSlug(this.name);
    return new Response(null, {
      status: 302,
      headers: { Location: `/admin/plugins/${slug}?success=updated` },
    });
  }

  /** Handle deleting an item. */
  private async _deleteItem(
    _req: Request,
    ctx?: { params: Record<string, string> },
  ): Promise<Response> {
    const id = ctx?.params?.id;
    if (!id) return new Response("Not found", { status: 404 });
    await this.storage.delete(id);
    const slug = toSlug(this.name);
    return new Response(null, {
      status: 302,
      headers: { Location: `/admin/plugins/${slug}?success=deleted` },
    });
  }

  /** Create and register the default admin index route for this plugin. */
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
      hasPage: isAdminPlugin,
      transpiledCode: "",
      sourcePath: "",
    });
    route.method = "GET";

    if (isAdminPlugin) {
      route.run = this._index.bind(this);
      route.page = appWithChildren(
        Plugins as unknown as () => React.ReactElement,
      );
    } else {
      route.run = async (req: Request) => {
        const listResponse = await this._listItems(req);
        const data = await listResponse.json();
        const url = new URL(req.url);

        const columns = Object.keys(this.model).map((key) => ({
          key,
          label: key.charAt(0).toUpperCase() + key.slice(1),
        }));

        const session = requestSession.get(req);
        const csrfToken = session?.csrfToken;

        const html = renderAdminPage(CrudList, {
          pluginName: this.name,
          pluginSlug: this.slug,
          columns,
          rows: data.items as Record<string, unknown>[],
          total: data.total as number,
          page: data.page as number,
          totalPages: data.totalPages as number,
          success: url.searchParams.get("success") ?? undefined,
          error: url.searchParams.get("error") ?? undefined,
          csrfToken,
        });

        return new Response(html, {
          status: 200,
          headers: { "Content-Type": "text/html" },
        });
      };
    }

    this._routes.push(route);
  }

  /** Map a model field type to a form field type. */
  private _fieldType(type: string): FormFieldProps["type"] {
    switch (type) {
      case "boolean":
        return "checkbox";
      default:
        return "text";
    }
  }

  /** Register CRUD routes for this plugin. */
  private _addCrudRoutes() {
    const slug = toSlug(this.name);
    if (slug === "admin-plugin") return;

    const basePath = `/admin/plugins/${slug}`;

    // POST — create item
    const createRoute = new Route({
      path: basePath,
      regex: new RegExp(`^${basePath}$`),
      hasPage: false,
      transpiledCode: "",
      sourcePath: "",
    });
    createRoute.method = "POST";
    createRoute.run = this._createItem.bind(this);
    this._routes.push(createRoute);

    // GET — new item form (MUST be before /{id} to avoid regex conflict)
    const newRoute = new Route({
      path: `${basePath}/new`,
      regex: new RegExp(`^${basePath}/new$`),
      hasPage: false,
      transpiledCode: "",
      sourcePath: "",
    });
    newRoute.method = "GET";
    newRoute.run = (req: Request) => {
      const session = requestSession.get(req);
      const csrfToken = session?.csrfToken;
      const fields = Object.entries(this.model).map(([key, type]) => ({
        name: key,
        label: key.charAt(0).toUpperCase() + key.slice(1),
        type: this._fieldType(type),
        required: type !== "boolean",
      }));
      const html = renderAdminPage(CrudForm, {
        pluginName: this.name,
        pluginSlug: this.slug,
        fields,
        action: basePath,
        isEdit: false,
        csrfToken,
      });
      return new Response(html, {
        status: 200,
        headers: { "Content-Type": "text/html" },
      });
    };
    this._routes.push(newRoute);

    // GET — edit item form
    const getRoute = new Route({
      path: `${basePath}/[id]`,
      regex: new RegExp(`^${basePath}/([^/]+)$`),
      hasPage: false,
      transpiledCode: "",
      sourcePath: "",
    });
    getRoute.method = "GET";
    getRoute.run = async (
      req: Request,
      ctx?: { params: Record<string, string> },
    ) => {
      const id = ctx?.params?.id;
      if (!id) return new Response("Not found", { status: 404 });
      const item = await this.storage.get(id);
      if (!item) return new Response("Not found", { status: 404 });

      const session = requestSession.get(req);
      const csrfToken = session?.csrfToken;

      const fields = Object.entries(this.model).map(([key, type]) => ({
        name: key,
        label: key.charAt(0).toUpperCase() + key.slice(1),
        type: this._fieldType(type),
        required: type !== "boolean",
      }));

      const values: Record<string, string> = {};
      for (const key of Object.keys(this.model)) {
        const val = item[key];
        if (val !== undefined && val !== null) {
          values[key] = String(val);
        }
      }

      const html = renderAdminPage(CrudForm, {
        pluginName: this.name,
        pluginSlug: this.slug,
        fields,
        values,
        action: `${basePath}/${id}`,
        isEdit: true,
        itemId: id,
        csrfToken,
      });
      return new Response(html, {
        status: 200,
        headers: { "Content-Type": "text/html" },
      });
    };
    this._routes.push(getRoute);

    // POST — update item
    const updateRoute = new Route({
      path: `${basePath}/[id]`,
      regex: new RegExp(`^${basePath}/([^/]+)$`),
      hasPage: false,
      transpiledCode: "",
      sourcePath: "",
    });
    updateRoute.method = "POST";
    updateRoute.run = this._updateItem.bind(this);
    this._routes.push(updateRoute);

    // POST — delete item
    const deleteRoute = new Route({
      path: `${basePath}/[id]/delete`,
      regex: new RegExp(`^${basePath}/([^/]+)/delete$`),
      hasPage: false,
      transpiledCode: "",
      sourcePath: "",
    });
    deleteRoute.method = "POST";
    deleteRoute.run = this._deleteItem.bind(this);
    this._routes.push(deleteRoute);
  }

  /** Build and return the plugin's registered routes. */
  public getRoutes(): Route[] {
    this._addIndexRoute();
    this._addCrudRoutes();
    return this._routes;
  }
}
