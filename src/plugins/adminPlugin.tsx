import { Route } from "../models/Route.ts";
import type { Plugin } from "../models/Plugin.ts";
import { appWithChildren, renderAdminPage } from "../admin/app.tsx";
import { Plugins } from "../admin/components/plugins.tsx";
import { CrudList } from "../admin/components/crud-list.tsx";
import { CrudForm } from "../admin/components/crud-form.tsx";
import type { FormFieldProps } from "../admin/components/form-field.tsx";
import { requestSession } from "../auth/authMiddleware.ts";
import { createAuthRoutes } from "../auth/loginHandler.ts";
import { InMemoryUserStore, seedDefaultAdmin } from "../auth/userStore.ts";
import { authMiddleware } from "../auth/authMiddleware.ts";
import { InMemorySessionStore } from "../auth/sessionStore.ts";
import { csrfMiddleware } from "../auth/csrfMiddleware.ts";
import { securityHeadersMiddleware } from "../auth/securityHeaders.ts";
import type { Middleware } from "../middleware/middleware.ts";
import type { StorageItem } from "../models/Storage.ts";
import type { SidebarNavItem } from "../admin/components/sidebar-nav.tsx";

/** Configuration for AdminPlugin. */
export interface AdminPluginOptions {
  plugins?: (new () => Plugin)[];
  /** Storage backend: "memory" (default for tests) or "kv" (Deno KV, default). */
  storage?: "memory" | "kv";
  /** Path to the Deno KV database file. Undefined = default path. */
  kvPath?: string;
}

/**
 * AdminPlugin is the orchestrator for the admin panel.
 * It generates all admin routes (dashboard, CRUD, auth, favicon),
 * registers middlewares, and renders admin UI via React SSR.
 */
export class AdminPlugin {
  private _pluginConstructors: (new () => Plugin)[];
  private _plugins: Plugin[] = [];
  private _storageMode: "memory" | "kv";
  private _kvPath?: string;
  private _sessionStore?: import("../auth/sessionStore.ts").SessionStore;
  private _userStore?: import("../auth/userStore.ts").UserStore;

  constructor(options?: AdminPluginOptions) {
    this._pluginConstructors = options?.plugins ?? [];
    this._storageMode = options?.storage ?? "kv";
    this._kvPath = options?.kvPath;
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

  /** Build nav items from registered plugins. */
  private _buildNavItems(activeSlug?: string): SidebarNavItem[] {
    const puzzleIcon = (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        aria-hidden="true"
        className="size-5 shrink-0 text-gray-400 group-hover:text-indigo-600"
      >
        <path
          d="M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959v0a.64.64 0 0 1-.657.643 48.39 48.39 0 0 1-4.163-.3c.186 1.613.293 3.25.315 4.907a.656.656 0 0 1-.658.663v0c-.355 0-.676-.186-.959-.401a1.647 1.647 0 0 0-1.003-.349c-1.036 0-1.875 1.007-1.875 2.25s.84 2.25 1.875 2.25c.369 0 .713-.128 1.003-.349.283-.215.604-.401.959-.401v0c.31 0 .555.26.532.57a48.039 48.039 0 0 1-.642 5.056c1.518.19 3.058.309 4.616.354a.64.64 0 0 0 .657-.643v0c0-.355-.186-.676-.401-.959a1.647 1.647 0 0 1-.349-1.003c0-1.035 1.008-1.875 2.25-1.875 1.243 0 2.25.84 2.25 1.875 0 .369-.128.713-.349 1.003-.215.283-.4.604-.4.959v0c0 .333.277.599.61.58a48.1 48.1 0 0 0 5.427-.63 48.05 48.05 0 0 0 .582-4.717.532.532 0 0 0-.533-.57v0c-.355 0-.676.186-.959.401-.29.221-.634.349-1.003.349-1.035 0-1.875-1.007-1.875-2.25s.84-2.25 1.875-2.25c.37 0 .713.128 1.003.349.283.215.604.401.96.401v0a.656.656 0 0 0 .657-.663 48.422 48.422 0 0 0-.37-5.36c-1.886.342-3.81.574-5.766.689a.578.578 0 0 1-.61-.58v0Z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );

    return this._plugins.map((p) => ({
      label: p.name.replace("Plugin", ""),
      href: `/admin/plugins/${p.slug}`,
      icon: puzzleIcon,
      active: p.slug === activeSlug,
    }));
  }

  /** Generate the dashboard route (GET /admin). */
  private _addDashboardRoute(routes: Route[]): void {
    const route = new Route({
      path: "/admin",
      regex: /^\/admin$/,
      hasPage: true,
      transpiledCode: "",
      sourcePath: "",
    });
    route.method = "GET";
    route.run = (_req: Request) => {
      return new Response(
        JSON.stringify({
          plugin: "AdminPlugin",
          description: "Admin Dashboard",
          plugins: this._plugins.map((p) => ({
            name: p.name,
            slug: p.slug,
            description: p.description,
          })),
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    };

    const pluginCards = this._plugins.map((p) => ({
      name: p.name,
      slug: p.slug,
      description: p.description,
    }));

    route.page = appWithChildren(
      (() => <Plugins plugins={pluginCards} />) as () => React.ReactElement,
    );

    routes.push(route);
  }

  /** Generate the favicon route. */
  private _addFaviconRoute(routes: Route[]): void {
    const faviconRoute = new Route({
      path: "/admin/favicon.ico",
      regex: /^\/admin\/favicon\.ico$/,
      hasPage: false,
      transpiledCode: "",
      sourcePath: "",
    });
    faviconRoute.method = "GET";
    faviconRoute.run = async (_req: Request) => {
      const { faviconBytes } = await import("../assets/faviconData.ts");
      return new Response(faviconBytes.buffer as ArrayBuffer, {
        headers: { "Content-Type": "image/x-icon" },
      });
    };
    routes.push(faviconRoute);
  }

  /** Handle listing items with pagination for a plugin. */
  private async _listItems(
    plugin: Plugin,
    req: Request,
  ): Promise<{
    items: StorageItem[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") ?? "1", 10);
    const search = url.searchParams.get("q") ?? undefined;
    const searchFields = Object.keys(plugin.model).filter((k) =>
      plugin.model[k] === "string"
    );
    const items = await plugin.storage.list({
      page,
      limit: 20,
      search,
      searchFields,
    });
    const total = await plugin.storage.count({ search, searchFields });
    return { items, total, page, totalPages: Math.ceil(total / 20) };
  }

  /** Generate CRUD routes for a single plugin. */
  private _addPluginCrudRoutes(plugin: Plugin, routes: Route[]): void {
    const slug = plugin.slug;
    const basePath = `/admin/plugins/${slug}`;

    // GET — list items (index)
    const indexRoute = new Route({
      path: basePath,
      regex: new RegExp(`^${basePath}$`),
      hasPage: false,
      transpiledCode: "",
      sourcePath: "",
    });
    indexRoute.method = "GET";
    indexRoute.run = async (req: Request) => {
      const data = await this._listItems(plugin, req);
      const url = new URL(req.url);

      const columns = Object.keys(plugin.model).map((key) => ({
        key,
        label: key.charAt(0).toUpperCase() + key.slice(1),
      }));

      const session = requestSession.get(req);
      const csrfToken = session?.csrfToken;

      const html = renderAdminPage(CrudList, {
        pluginName: plugin.name,
        pluginSlug: slug,
        columns,
        rows: data.items as Record<string, unknown>[],
        total: data.total,
        page: data.page,
        totalPages: data.totalPages,
        success: url.searchParams.get("success") ?? undefined,
        error: url.searchParams.get("error") ?? undefined,
        csrfToken,
      });

      return new Response(html, {
        status: 200,
        headers: { "Content-Type": "text/html" },
      });
    };
    routes.push(indexRoute);

    // POST — create item
    const createRoute = new Route({
      path: basePath,
      regex: new RegExp(`^${basePath}$`),
      hasPage: false,
      transpiledCode: "",
      sourcePath: "",
    });
    createRoute.method = "POST";
    createRoute.run = async (req: Request) => {
      const formData = await req.formData();
      const data: Record<string, unknown> = {};
      for (const key of Object.keys(plugin.model)) {
        data[key] = formData.get(key)?.toString() ?? "";
      }
      const { valid, errors } = plugin.validate(data);
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
      await plugin.storage.set(id, item);
      return new Response(null, {
        status: 302,
        headers: { Location: `${basePath}?success=created` },
      });
    };
    routes.push(createRoute);

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
      const fields = Object.entries(plugin.model).map(([key, type]) => ({
        name: key,
        label: key.charAt(0).toUpperCase() + key.slice(1),
        type: this._fieldType(type),
        required: type !== "boolean",
      }));
      const html = renderAdminPage(CrudForm, {
        pluginName: plugin.name,
        pluginSlug: slug,
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
    routes.push(newRoute);

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
      const item = await plugin.storage.get(id);
      if (!item) return new Response("Not found", { status: 404 });

      const session = requestSession.get(req);
      const csrfToken = session?.csrfToken;

      const fields = Object.entries(plugin.model).map(([key, type]) => ({
        name: key,
        label: key.charAt(0).toUpperCase() + key.slice(1),
        type: this._fieldType(type),
        required: type !== "boolean",
      }));

      const values: Record<string, string> = {};
      for (const key of Object.keys(plugin.model)) {
        const val = item[key];
        if (val !== undefined && val !== null) {
          values[key] = String(val);
        }
      }

      const html = renderAdminPage(CrudForm, {
        pluginName: plugin.name,
        pluginSlug: slug,
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
    routes.push(getRoute);

    // POST — update item
    const updateRoute = new Route({
      path: `${basePath}/[id]`,
      regex: new RegExp(`^${basePath}/([^/]+)$`),
      hasPage: false,
      transpiledCode: "",
      sourcePath: "",
    });
    updateRoute.method = "POST";
    updateRoute.run = async (
      req: Request,
      ctx?: { params: Record<string, string> },
    ) => {
      const id = ctx?.params?.id;
      if (!id) return new Response("Not found", { status: 404 });
      const existing = await plugin.storage.get(id);
      if (!existing) return new Response("Not found", { status: 404 });
      const formData = await req.formData();
      const data: Record<string, unknown> = { ...existing };
      for (const key of Object.keys(plugin.model)) {
        const val = formData.get(key);
        if (val !== null) data[key] = val.toString();
      }
      data.updated_at = new Date().toISOString();
      await plugin.storage.set(id, data as StorageItem);
      return new Response(null, {
        status: 302,
        headers: { Location: `${basePath}?success=updated` },
      });
    };
    routes.push(updateRoute);

    // POST — delete item
    const deleteRoute = new Route({
      path: `${basePath}/[id]/delete`,
      regex: new RegExp(`^${basePath}/([^/]+)/delete$`),
      hasPage: false,
      transpiledCode: "",
      sourcePath: "",
    });
    deleteRoute.method = "POST";
    deleteRoute.run = async (
      _req: Request,
      ctx?: { params: Record<string, string> },
    ) => {
      const id = ctx?.params?.id;
      if (!id) return new Response("Not found", { status: 404 });
      await plugin.storage.delete(id);
      return new Response(null, {
        status: 302,
        headers: { Location: `${basePath}?success=deleted` },
      });
    };
    routes.push(deleteRoute);
  }

  /**
   * Initialize the admin panel. Instantiates plugins, generates all routes
   * (dashboard, CRUD, auth, favicon), and returns routes + middlewares.
   */
  public async init(): Promise<{
    routes: Route[];
    middlewares: Middleware[];
  }> {
    // Instantiate content plugins (only on first init; re-init reuses existing instances)
    if (this._plugins.length === 0) {
      this._plugins = this._pluginConstructors.map((Ctor) => new Ctor());

      // Inject storage backends
      if (this._storageMode === "kv") {
        const { DenoKvStorage } = await import(
          "../storage/denoKvStorage.ts"
        );
        const { DenoKvSessionStore } = await import(
          "../storage/denoKvSessionStore.ts"
        );
        const { DenoKvUserStore } = await import(
          "../storage/denoKvUserStore.ts"
        );
        const { runMigrations } = await import("../storage/schema.ts");

        const kv = await Deno.openKv(this._kvPath);
        await runMigrations(kv);

        for (const plugin of this._plugins) {
          plugin.storage = new DenoKvStorage(kv, plugin.slug, plugin.model);
        }

        this._sessionStore = new DenoKvSessionStore(kv);
        this._userStore = new DenoKvUserStore(kv);
      } else {
        this._sessionStore = new InMemorySessionStore();
        this._userStore = new InMemoryUserStore();
      }
      await seedDefaultAdmin(this._userStore!);
    }

    const routes: Route[] = [];

    // Dashboard route
    this._addDashboardRoute(routes);

    // Favicon route
    this._addFaviconRoute(routes);

    // CRUD routes for each plugin
    for (const plugin of this._plugins) {
      this._addPluginCrudRoutes(plugin, routes);
    }

    // Auth routes (login/logout)
    routes.push(...createAuthRoutes(this._userStore!, this._sessionStore!));

    // Middlewares in execution order
    const middlewares: Middleware[] = [
      securityHeadersMiddleware,
      authMiddleware(this._sessionStore!),
      csrfMiddleware,
    ];

    return { routes, middlewares };
  }

  /** Get the list of instantiated plugins (available after init). */
  get plugins(): Plugin[] {
    return this._plugins;
  }
}
