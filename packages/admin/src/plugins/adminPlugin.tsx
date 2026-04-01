import { Route } from "@leproj/tennet";
import type { Plugin } from "@leproj/tennet";
import {
  appWithChildren,
  renderAdminPage,
  renderBuilderPage,
} from "../app.tsx";
import { Plugins } from "../components/plugins.tsx";
import { CrudList } from "../components/crud-list.tsx";
import { CrudForm } from "../components/crud-form.tsx";
import type { CrudFormProps } from "../components/crud-form.tsx";
import { Button } from "../components/button.tsx";
import type { FormFieldProps } from "../components/form-field.tsx";
import { requestSession } from "../auth/authMiddleware.ts";
import { createAuthRoutes } from "../auth/loginHandler.ts";
import { InMemoryUserStore, seedDefaultAdmin } from "../auth/userStore.ts";
import { authMiddleware } from "../auth/authMiddleware.ts";
import { InMemorySessionStore } from "../auth/sessionStore.ts";
import { csrfMiddleware } from "../auth/csrfMiddleware.ts";
import { securityHeadersMiddleware } from "../auth/securityHeaders.ts";
import type { Middleware, StorageItem } from "@leproj/tennet";
import type { SidebarNavItem } from "../components/sidebar-nav.tsx";
import {
  BlogRouteRegistry,
  DynamicRouteRegistry,
  renderDynamicPage,
} from "@leproj/tennet";
import { PagePlugin } from "./pagePlugin.ts";
import { PostsPlugin } from "./postsPlugin.ts";
import { CategoriesPlugin } from "./categoriesPlugin.ts";
import { RolesPlugin } from "./rolesPlugin.ts";
import { AUDIT_LOG_TTL, AuditLogPlugin } from "./auditLogPlugin.ts";
import { PermissionsStore } from "../auth/permissionsStore.ts";
import { ROLE_PERMISSIONS } from "../auth/types.ts";
import type { PermissionAction } from "@leproj/tennet";
import { UsersPlugin } from "./usersPlugin.ts";
import {
  registerBuiltinWidgets,
  WidgetAuditLogger,
  WidgetPermissionsStore,
  widgetRegistry,
  WidgetStore,
} from "@leproj/tennet-widgets";
import type {
  PlaceholderMap,
  WidgetInstance,
  WidgetType,
} from "@leproj/tennet-widgets";
import { PageBuilderEditor } from "../components/page-builder-editor.tsx";

/** Edit form for PagePlugin — extends CrudForm with an optional Page Builder link. */
type PageEditProps = CrudFormProps & { builderHref?: string };
function PagePluginEditPage({ builderHref, ...formProps }: PageEditProps) {
  return (
    <>
      <CrudForm {...(formProps as CrudFormProps)} />
      {builderHref && (
        <div className="mx-auto max-w-2xl flex justify-end pt-2">
          <Button variant="secondary" href={builderHref}>
            Page Builder
          </Button>
        </div>
      )}
    </>
  );
}

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
  private _dynamicRegistry?: DynamicRouteRegistry;
  private _blogRegistry?: BlogRouteRegistry;
  private _kv: Deno.Kv | null = null;
  private _auditLogPlugin?: AuditLogPlugin;

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

  /** Get field-specific config for smart form rendering. */
  private async _getFieldConfig(
    plugin: Plugin,
    fieldName: string,
    fieldType: string,
  ): Promise<Partial<FormFieldProps>> {
    if (plugin instanceof PostsPlugin) {
      switch (fieldName) {
        case "body":
          return { type: "textarea", rows: 10 };
        case "excerpt":
          return { type: "textarea", rows: 3 };
        case "status":
          return {
            type: "select",
            options: [
              { value: "draft", label: "Draft" },
              { value: "published", label: "Published" },
            ],
          };
        case "category_ids": {
          const catPlugin = this._plugins.find(
            (p) => p instanceof CategoriesPlugin,
          );
          const options: { value: string; label: string }[] = [];
          if (catPlugin) {
            const categories = await catPlugin.storage.list({
              page: 1,
              limit: 100,
            });
            for (const cat of categories) {
              options.push({
                value: cat.id,
                label: String(cat.name ?? cat.id),
              });
            }
          }
          return { type: "select", multiple: true, options };
        }
        case "published_at":
          return {
            type: "text",
            readonly: true,
            hint: "Auto-filled on first publish",
          };
      }
    }
    if (plugin instanceof UsersPlugin) {
      switch (fieldName) {
        case "role_id": {
          const rolesPlugin = this._plugins.find(
            (p) => p instanceof RolesPlugin,
          );
          const options: { value: string; label: string }[] = [];
          if (rolesPlugin) {
            const roles = await rolesPlugin.storage.list({
              page: 1,
              limit: 100,
            });
            for (const role of roles) {
              options.push({
                value: role.id,
                label: String(role.name ?? role.id),
              });
            }
          }
          return { type: "select", options };
        }
        case "status":
          return {
            type: "select",
            options: [
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
            ],
          };
      }
    }
    return { type: this._fieldType(fieldType) };
  }

  /** Build form fields for a plugin using _getFieldConfig. */
  private async _buildFormFields(
    plugin: Plugin,
  ): Promise<Omit<FormFieldProps, "error">[]> {
    const fields: Omit<FormFieldProps, "error">[] = [];
    for (const [key, type] of Object.entries(plugin.model)) {
      const config = await this._getFieldConfig(plugin, key, type);
      fields.push({
        name: key,
        label: (key.charAt(0).toUpperCase() + key.slice(1)).replace(/_/g, " "),
        type: this._fieldType(type),
        required: type !== "boolean",
        ...config,
      });
    }
    return fields;
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
      const { faviconBytes } = await import("@leproj/tennet/assets/favicon");
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

  /** Check if a plugin is the AuditLogPlugin (readonly — block writes). */
  private _isReadonlyPlugin(plugin: Plugin): boolean {
    return plugin instanceof AuditLogPlugin;
  }

  /** Generate CRUD routes for a single plugin. */
  private _addPluginCrudRoutes(plugin: Plugin, routes: Route[]): void {
    const slug = plugin.slug;
    const basePath = `/admin/plugins/${slug}`;
    const isReadonly = this._isReadonlyPlugin(plugin);
    const isAuditTarget = !this._isReadonlyPlugin(plugin);

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
        label: (key.charAt(0).toUpperCase() + key.slice(1)).replace(/_/g, " "),
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
      // Block writes for readonly plugins (e.g. AuditLogPlugin)
      if (isReadonly) {
        return new Response("Forbidden", { status: 403 });
      }

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
      // Async validation (e.g. slug uniqueness)
      if ("validateAsync" in plugin) {
        const asyncResult = await (plugin as {
          validateAsync(
            d: Record<string, unknown>,
          ): Promise<{ valid: boolean; errors: Record<string, string> }>;
        }).validateAsync(data);
        if (!asyncResult.valid) {
          return new Response(JSON.stringify({ errors: asyncResult.errors }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
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

      // Hot-registration: register published pages in DynamicRouteRegistry
      if (plugin instanceof PagePlugin && this._dynamicRegistry) {
        if (String(data.status) === "published") {
          this._dynamicRegistry.register(item);
        }
      }

      // Hot-registration: register published posts in BlogRouteRegistry
      if (plugin instanceof PostsPlugin && this._blogRegistry) {
        if (String(data.status) === "published") {
          this._blogRegistry.register(item);
        }
      }

      // Audit log
      if (isAuditTarget) {
        await this._logAudit(
          "create",
          slug,
          id,
          req,
          JSON.stringify({ title: data.title ?? data.name ?? "" }),
        );
      }

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
    newRoute.run = async (req: Request) => {
      const session = requestSession.get(req);
      const csrfToken = session?.csrfToken;
      const fields = await this._buildFormFields(plugin);
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

      const fields = await this._buildFormFields(plugin);

      const values: Record<string, string> = {};
      for (const key of Object.keys(plugin.model)) {
        const val = item[key];
        if (val !== undefined && val !== null) {
          values[key] = String(val);
        }
      }

      let html: string;
      if (plugin instanceof PagePlugin) {
        const builderHref = values.widgets_enabled === "true"
          ? `/admin/pages/${id}/builder`
          : undefined;
        html = renderAdminPage(PagePluginEditPage, {
          pluginName: plugin.name,
          pluginSlug: slug,
          fields,
          values,
          action: `${basePath}/${id}`,
          isEdit: true,
          itemId: id,
          csrfToken,
          builderHref,
        });
      } else {
        html = renderAdminPage(CrudForm, {
          pluginName: plugin.name,
          pluginSlug: slug,
          fields,
          values,
          action: `${basePath}/${id}`,
          isEdit: true,
          itemId: id,
          csrfToken,
        });
      }
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
      // Block writes for readonly plugins (e.g. AuditLogPlugin)
      if (isReadonly) {
        return new Response("Forbidden", { status: 403 });
      }

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
      // Validate before saving
      const { valid: syncValid, errors: syncErrors } = plugin.validate(data);
      if (!syncValid) {
        return new Response(JSON.stringify({ errors: syncErrors }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
      // Async validation (e.g. slug uniqueness, excluding current item)
      if ("validateAsync" in plugin) {
        const asyncResult = await (plugin as {
          validateAsync(
            d: Record<string, unknown>,
            excludeId?: string,
          ): Promise<{ valid: boolean; errors: Record<string, string> }>;
        }).validateAsync(data, id);
        if (!asyncResult.valid) {
          return new Response(JSON.stringify({ errors: asyncResult.errors }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
      }

      data.updated_at = new Date().toISOString();
      await plugin.storage.set(id, data as StorageItem);

      // Hot-registration: update dynamic route on status change
      if (plugin instanceof PagePlugin && this._dynamicRegistry) {
        if (String(data.status) === "published") {
          // Re-register (or register for the first time)
          this._dynamicRegistry.unregister(id);
          this._dynamicRegistry.register(data as StorageItem);
        } else {
          // Unpublished — remove from dynamic routes
          this._dynamicRegistry.unregister(id);
        }
      }

      // Hot-registration: update blog post on status change
      if (plugin instanceof PostsPlugin && this._blogRegistry) {
        if (String(data.status) === "published") {
          this._blogRegistry.unregister(id);
          this._blogRegistry.register(data as StorageItem);
        } else {
          this._blogRegistry.unregister(id);
        }
      }

      // Audit log
      if (isAuditTarget) {
        await this._logAudit(
          "update",
          slug,
          id,
          req,
          JSON.stringify({ title: data.title ?? data.name ?? "" }),
        );
      }

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
      req: Request,
      ctx?: { params: Record<string, string> },
    ) => {
      // Block writes for readonly plugins (e.g. AuditLogPlugin)
      if (isReadonly) {
        return new Response("Forbidden", { status: 403 });
      }

      const id = ctx?.params?.id;
      if (!id) return new Response("Not found", { status: 404 });

      // Prevent deletion of system roles
      if (plugin instanceof RolesPlugin) {
        const item = await plugin.storage.get(id);
        if (item && plugin.isSystemRole(item)) {
          return new Response(null, {
            status: 302,
            headers: {
              Location: `${basePath}?error=Cannot+delete+system+role`,
            },
          });
        }
      }

      await plugin.storage.delete(id);

      // Hot-registration: unregister deleted pages from DynamicRouteRegistry
      if (plugin instanceof PagePlugin && this._dynamicRegistry) {
        this._dynamicRegistry.unregister(id);
      }

      // Hot-registration: unregister deleted posts from BlogRouteRegistry
      if (plugin instanceof PostsPlugin && this._blogRegistry) {
        this._blogRegistry.unregister(id);
      }

      // Audit log
      if (isAuditTarget) {
        await this._logAudit("delete", slug, id, req);
      }

      return new Response(null, {
        status: 302,
        headers: { Location: `${basePath}?success=deleted` },
      });
    };
    routes.push(deleteRoute);
  }

  /** Generate the preview route (GET /admin/preview/[id]). */
  private _addPreviewRoute(routes: Route[]): void {
    const pagePlugin = this._plugins.find((p) => p.slug === "page-plugin");
    if (!pagePlugin) return;

    const previewRoute = new Route({
      path: "/admin/preview/[id]",
      regex: /^\/admin\/preview\/([^/]+)$/,
      hasPage: false,
      transpiledCode: "",
      sourcePath: "",
    });
    previewRoute.method = "GET";
    previewRoute.run = async (
      _req: Request,
      ctx?: { params: Record<string, string> },
    ) => {
      const id = ctx?.params?.id;
      if (!id) return new Response("Not found", { status: 404 });

      const item = await pagePlugin.storage.get(id);
      if (!item) return new Response("Not found", { status: 404 });

      let html = await renderDynamicPage(item, "./app", this._kv ?? undefined);

      // Inject preview banner at the top of <body>
      const banner =
        `<div style="background:#f59e0b;color:#000;padding:8px 16px;text-align:center;font-family:sans-serif;font-size:14px;font-weight:600;position:sticky;top:0;z-index:9999;">Preview Mode — This page is not published</div>`;
      html = html.replace(
        /(<body[^>]*>)/i,
        `$1${banner}`,
      );

      return new Response(html, {
        status: 200,
        headers: {
          "Content-Type": "text/html",
          "X-Robots-Tag": "noindex",
          "X-Frame-Options": "SAMEORIGIN",
          "Cache-Control": "no-store",
        },
      });
    };
    routes.push(previewRoute);
  }

  /** Render a friendly 404 page for public blog routes. */
  private async _blog404(title: string): Promise<Response> {
    const bodyHtml = `<div class="max-w-3xl mx-auto text-center py-16">
  <h1 class="text-4xl font-bold text-gray-900 mb-4">${escapeHtml(title)}</h1>
  <p class="text-gray-500 mb-8">The page you are looking for does not exist or has been removed.</p>
  <a href="/blog" class="inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Back to Blog</a>
</div>`;
    const html = await renderDynamicPage(
      {
        id: "blog-404",
        body: bodyHtml,
        title,
        seo_title: title,
        seo_description: "Page not found",
        template: "blog-404",
      },
      "./app",
    );
    return new Response(html, {
      status: 404,
      headers: { "Content-Type": "text/html" },
    });
  }

  /** Generate public blog routes (GET /blog and GET /blog/{slug}). */
  private _addBlogRoutes(routes: Route[]): void {
    if (!this._blogRegistry) return;
    const registry = this._blogRegistry;

    // GET /blog — paginated listing
    const blogListRoute = new Route({
      path: "/blog",
      regex: /^\/blog$/,
      hasPage: false,
      transpiledCode: "",
      sourcePath: "",
    });
    blogListRoute.method = "GET";
    blogListRoute.run = async (req: Request) => {
      const url = new URL(req.url);
      const page = Math.max(
        1,
        parseInt(url.searchParams.get("page") ?? "1", 10) || 1,
      );
      const { posts, total, totalPages } = registry.listPublished({
        page,
        limit: 10,
      });

      const postItems = await Promise.all(
        posts.map(async (post) => {
          const categories = await registry.getCategories(post.category_ids);
          return `<article class="mb-8 pb-8 border-b border-gray-200">
  <h2><a href="/blog/${
            escapeAttrValue(post.slug)
          }" class="text-xl font-semibold text-indigo-600 hover:text-indigo-800">${
            escapeHtml(post.title)
          }</a></h2>
  ${
            post.cover_image
              ? `<img src="${escapeAttrValue(post.cover_image)}" alt="${
                escapeAttrValue(post.title)
              }" class="w-full h-48 object-cover rounded-lg mb-4" />`
              : ""
          }
  <p class="text-gray-700 mb-2">${escapeHtml(post.excerpt)}</p>
  <div class="text-sm text-gray-500 mb-2">
    <time datetime="${escapeAttrValue(post.published_at ?? "")}">${
            post.published_at
              ? new Date(post.published_at).toLocaleDateString()
              : ""
          }</time>
    ${
            categories.length > 0
              ? `<span class="flex gap-2 inline-flex">${
                categories.map((c) =>
                  `<a href="/blog/category/${
                    escapeAttrValue(c.slug)
                  }" class="text-indigo-600 hover:text-indigo-800">${
                    escapeHtml(c.name)
                  }</a>`
                ).join(", ")
              }</span>`
              : ""
          }
  </div>
</article>`;
        }),
      );

      const prevLink = page > 1
        ? `<a href="/blog?page=${
          page - 1
        }" class="text-indigo-600 hover:text-indigo-800" aria-label="Previous page">Previous</a>`
        : "";
      const nextLink = page < totalPages
        ? `<a href="/blog?page=${
          page + 1
        }" class="text-indigo-600 hover:text-indigo-800" aria-label="Next page">Next</a>`
        : "";

      const bodyHtml = `<div class="max-w-3xl mx-auto">
  <h1 class="text-3xl font-bold text-gray-900 mb-8">Blog</h1>
  ${postItems.join("\n")}
  ${total === 0 ? '<p class="text-gray-500">No posts yet.</p>' : ""}
  <nav class="flex justify-between mt-8" aria-label="Blog pagination">${prevLink} ${nextLink}</nav>
</div>`;

      let html = await renderDynamicPage(
        {
          id: "blog-list",
          body: bodyHtml,
          title: "Blog",
          seo_title: "Blog",
          seo_description: "Blog posts",
          template: "blog-list",
        },
        "./app",
      );
      html = injectHeadTags(html, RSS_DISCOVERY_TAG);

      return new Response(html, {
        status: 200,
        headers: { "Content-Type": "text/html" },
      });
    };
    routes.push(blogListRoute);

    // GET /blog/rss.xml — RSS 2.0 feed
    const rssRoute = new Route({
      path: "/blog/rss.xml",
      regex: /^\/blog\/rss\.xml$/,
      hasPage: false,
      transpiledCode: "",
      sourcePath: "",
    });
    rssRoute.method = "GET";
    rssRoute.run = (req: Request) => {
      const url = new URL(req.url);
      const siteUrl = `${url.protocol}//${url.host}`;
      const xml = registry.generateRSS("Blog", siteUrl);
      return new Response(xml, {
        status: 200,
        headers: {
          "Content-Type": "application/rss+xml; charset=utf-8",
        },
      });
    };
    routes.push(rssRoute);

    // GET /blog/category/{slug} — posts filtered by category
    const categoryRoute = new Route({
      path: "/blog/category/[slug]",
      regex: /^\/blog\/category\/([^/]+)$/,
      hasPage: false,
      transpiledCode: "",
      sourcePath: "",
    });
    categoryRoute.method = "GET";
    categoryRoute.run = async (
      req: Request,
      ctx?: { params: Record<string, string> },
    ) => {
      const catSlug = ctx?.params?.slug;
      if (!catSlug) return await this._blog404("Category Not Found");

      // Resolve category slug to category object
      const catPlugin = this._plugins.find(
        (p) => p instanceof CategoriesPlugin,
      );
      if (!catPlugin) return await this._blog404("Category Not Found");

      // Find category by slug (capped at 100; paginate if more categories needed)
      const allCategories = await catPlugin.storage.list({
        page: 1,
        limit: 100,
      });
      const category = allCategories.find(
        (c) => String(c.slug) === catSlug,
      );
      if (!category) return await this._blog404("Category Not Found");

      const url = new URL(req.url);
      const page = Math.max(
        1,
        parseInt(url.searchParams.get("page") ?? "1", 10) || 1,
      );
      const { posts, total, totalPages } = registry.listPublished({
        page,
        limit: 10,
        categoryId: category.id,
      });

      const categoryName = String(category.name ?? catSlug);

      const postItems = await Promise.all(
        posts.map(async (post) => {
          const categories = await registry.getCategories(post.category_ids);
          return `<article class="mb-8 pb-8 border-b border-gray-200">
  <h2><a href="/blog/${escapeAttrValue(post.slug)}">${
            escapeHtml(post.title)
          }</a></h2>
  ${
            post.cover_image
              ? `<img src="${escapeAttrValue(post.cover_image)}" alt="${
                escapeAttrValue(post.title)
              }" class="w-full h-48 object-cover rounded-lg mb-4" />`
              : ""
          }
  <p>${escapeHtml(post.excerpt)}</p>
  <div class="text-sm text-gray-500 mb-2">
    <time datetime="${escapeAttrValue(post.published_at ?? "")}">${
            post.published_at
              ? new Date(post.published_at).toLocaleDateString()
              : ""
          }</time>
    ${
            categories.length > 0
              ? `<span class="flex gap-2 inline-flex">${
                categories.map((c) =>
                  `<a href="/blog/category/${escapeAttrValue(c.slug)}">${
                    escapeHtml(c.name)
                  }</a>`
                ).join(", ")
              }</span>`
              : ""
          }
  </div>
</article>`;
        }),
      );

      const prevLink = page > 1
        ? `<a href="/blog/category/${escapeAttrValue(catSlug)}?page=${
          page - 1
        }" aria-label="Previous page">Previous</a>`
        : "";
      const nextLink = page < totalPages
        ? `<a href="/blog/category/${escapeAttrValue(catSlug)}?page=${
          page + 1
        }" aria-label="Next page">Next</a>`
        : "";

      const bodyHtml = `<div class="max-w-3xl mx-auto">
  <h1>Blog — ${escapeHtml(categoryName)}</h1>
  ${postItems.join("\n")}
  ${total === 0 ? "<p>No posts in this category.</p>" : ""}
  <nav class="flex justify-between mt-8" aria-label="Category pagination">${prevLink} ${nextLink}</nav>
</div>`;

      let html = await renderDynamicPage(
        {
          id: `blog-category-${catSlug}`,
          body: bodyHtml,
          title: `Blog — ${categoryName}`,
          seo_title: `Blog — ${categoryName}`,
          seo_description: `Posts in category: ${categoryName}`,
          template: "blog-list",
        },
        "./app",
      );
      html = injectHeadTags(html, RSS_DISCOVERY_TAG);

      return new Response(html, {
        status: 200,
        headers: { "Content-Type": "text/html" },
      });
    };
    routes.push(categoryRoute);

    // GET /blog/{slug} — single post
    const blogPostRoute = new Route({
      path: "/blog/[slug]",
      regex: /^\/blog\/([^/]+)$/,
      hasPage: false,
      transpiledCode: "",
      sourcePath: "",
    });
    blogPostRoute.method = "GET";
    blogPostRoute.run = async (
      _req: Request,
      ctx?: { params: Record<string, string> },
    ) => {
      const slug = ctx?.params?.slug;
      if (!slug) return await this._blog404("Post Not Found");

      const post = registry.match(`/blog/${slug}`);
      if (!post) return await this._blog404("Post Not Found");

      const categories = await registry.getCategories(post.category_ids);

      const categoryHtml = categories.length > 0
        ? `<div class="flex gap-2 inline-flex">${
          categories.map((c) =>
            `<a href="/blog/category/${
              escapeAttrValue(c.slug)
            }" class="text-indigo-600 hover:text-indigo-800">${
              escapeHtml(c.name)
            }</a>`
          ).join(", ")
        }</div>`
        : "";

      const bodyHtml = `<article class="max-w-3xl mx-auto">
  <h1 class="text-3xl font-bold text-gray-900 mb-4">${
        escapeHtml(post.title)
      }</h1>
  ${
        post.cover_image
          ? `<img src="${escapeAttrValue(post.cover_image)}" alt="${
            escapeAttrValue(post.title)
          }" class="w-full h-48 object-cover rounded-lg mb-4" />`
          : ""
      }
  <div class="text-sm text-gray-500 mb-2">
    <time datetime="${escapeAttrValue(post.published_at ?? "")}">${
        post.published_at
          ? new Date(post.published_at).toLocaleDateString()
          : ""
      }</time>
    ${categoryHtml}
  </div>
  <div class="mt-6 leading-relaxed text-gray-800 [&>h1]:text-2xl [&>h1]:font-bold [&>h1]:mb-4 [&>h2]:text-xl [&>h2]:font-semibold [&>h2]:mb-3 [&>h3]:text-lg [&>h3]:font-medium [&>h3]:mb-2 [&>p]:mb-4 [&>ul]:list-disc [&>ul]:pl-6 [&>ul]:mb-4 [&>ol]:list-decimal [&>ol]:pl-6 [&>ol]:mb-4 [&>blockquote]:border-l-4 [&>blockquote]:border-gray-300 [&>blockquote]:pl-4 [&>blockquote]:italic">${
        sanitizeHtml(post.body)
      }</div>
</article>`;

      const seoDescription = post.excerpt || post.title;

      let html = await renderDynamicPage(
        {
          id: post.id,
          body: bodyHtml,
          title: post.title,
          seo_title: post.title,
          seo_description: seoDescription,
          template: "blog-post",
        },
        "./app",
      );
      let headTags = RSS_DISCOVERY_TAG;
      if (post.cover_image) {
        headTags += `\n<meta property="og:image" content="${
          escapeAttrValue(post.cover_image)
        }">`;
      }
      html = injectHeadTags(html, headTags);

      return new Response(html, {
        status: 200,
        headers: { "Content-Type": "text/html" },
      });
    };
    routes.push(blogPostRoute);
  }

  /**
   * Generate the builder preview route.
   *
   * Route:
   *   GET /admin/pages/[id]/builder/preview — renders the page as it would appear publicly
   *
   * Registered BEFORE /builder to avoid regex conflicts.
   * Requires KV storage — only called when this._kv is set.
   */
  private _addBuilderPreviewRoute(routes: Route[]): void {
    const pagePlugin = this._plugins.find((p) => p instanceof PagePlugin);
    if (!pagePlugin) return;

    const appPath = "./app";
    const kv = this._kv ?? undefined;

    const previewRoute = new Route({
      path: "/admin/pages/[id]/builder/preview",
      regex: /^\/admin\/pages\/([^/]+)\/builder\/preview$/,
      hasPage: false,
      transpiledCode: "",
      sourcePath: "",
    });
    previewRoute.method = "GET";
    previewRoute.run = async (
      _req: Request,
      ctx?: { params: Record<string, string> },
    ) => {
      const id = ctx?.params?.id;
      if (!id) return new Response("Not found", { status: 404 });

      const page = await pagePlugin.storage.get(id);
      if (!page) return new Response("Not found", { status: 404 });

      const html = await renderDynamicPage(page, appPath, kv);

      return new Response(html, {
        status: 200,
        headers: {
          "Content-Type": "text/html",
          "X-Frame-Options": "SAMEORIGIN",
          "Cache-Control": "no-store",
        },
      });
    };
    routes.push(previewRoute);
  }

  /**
   * Generate the Page Builder UI route.
   *
   * Route:
   *   GET /admin/pages/[id]/builder — renders the drag-and-drop page builder
   *
   * Registered BEFORE /[wid] routes to avoid regex conflicts.
   * Requires KV storage — only called when this._kv is set.
   */
  private _addBuilderUIRoutes(routes: Route[]): void {
    const kv = this._kv!;

    const builderRoute = new Route({
      path: "/admin/pages/[id]/builder",
      regex: /^\/admin\/pages\/([^/]+)\/builder$/,
      hasPage: false,
      transpiledCode: "",
      sourcePath: "",
    });
    builderRoute.method = "GET";
    builderRoute.run = async (
      req: Request,
      ctx?: { params: Record<string, string> },
    ) => {
      const id = ctx?.params?.id;
      if (!id) return new Response("Not found", { status: 404 });

      const pagePlugin = this._plugins.find((p) => p instanceof PagePlugin);
      if (!pagePlugin) return new Response("Not found", { status: 404 });

      const page = await pagePlugin.storage.get(id);
      if (!page) return new Response("Not found", { status: 404 });

      const store = new WidgetStore(kv);
      const instances = await store.loadForPage(id);

      // Detect placeholders declared in the page body (e.g. {{widgets:main}})
      const body = typeof page.body === "string" ? page.body : "";
      const bodyMatches = [...body.matchAll(/\{\{widgets:(\w+)\}\}/g)];
      const declaredPlaceholders = bodyMatches.length > 0
        ? bodyMatches.map((m) => m[1])
        : ["main"];

      // Group instances into PlaceholderMap, sorted by order
      const placeholders: PlaceholderMap = {};
      // Seed declared placeholders so the canvas always shows them
      for (const name of declaredPlaceholders) {
        placeholders[name] = [];
      }
      for (const w of instances) {
        if (!placeholders[w.placeholder]) {
          placeholders[w.placeholder] = [];
        }
        placeholders[w.placeholder].push(w);
      }
      for (const arr of Object.values(placeholders)) {
        arr.sort((a, b) => a.order - b.order);
      }

      const session = requestSession.get(req);
      const csrfToken = session?.csrfToken;

      const permissionsStore = new WidgetPermissionsStore(kv);
      const role = session?.role ?? "viewer";
      const availableWidgets = await permissionsStore.getAllowedWidgets(role);

      const url = new URL(req.url);
      const editWidgetId = url.searchParams.get("edit") ?? undefined;
      const editingWidget = editWidgetId
        ? instances.find((w) => w.id === editWidgetId)
        : undefined;
      const editingDefinition = editingWidget
        ? (widgetRegistry.get(editingWidget.type) ?? undefined)
        : undefined;

      const html = renderBuilderPage(PageBuilderEditor, {
        pageId: id,
        pageTitle: String(page.title ?? id),
        placeholders,
        availableWidgets,
        editingWidget,
        editingDefinition,
        csrfToken,
      });

      return new Response(html, {
        status: 200,
        headers: { "Content-Type": "text/html" },
      });
    };
    routes.push(builderRoute);
  }

  /**
   * Generate Page Builder routes for managing widgets on pages.
   *
   * Routes:
   *   GET  /admin/pages/[id]/widgets                    — list widgets for a page
   *   POST /admin/pages/[id]/widgets                    — create a widget
   *   POST /admin/pages/[id]/widgets/[wid]              — update a widget
   *   POST /admin/pages/[id]/widgets/[wid]/delete       — delete a widget
   *   POST /admin/pages/[id]/widgets/[wid]/duplicate    — duplicate a widget
   *   POST /admin/pages/[id]/widgets/reorder            — reorder widgets
   *
   * Requires KV storage — only called when this._kv is set.
   */
  private _addPageBuilderRoutes(routes: Route[]): void {
    const kv = this._kv!;
    const basePath = "/admin/pages";
    const auditLogger = this._auditLogPlugin
      ? new WidgetAuditLogger(this._auditLogPlugin)
      : null;

    // GET /admin/pages/[id]/widgets — list widgets
    const listRoute = new Route({
      path: `${basePath}/[id]/widgets`,
      regex: new RegExp(`^${basePath}/([^/]+)/widgets$`),
      hasPage: false,
      transpiledCode: "",
      sourcePath: "",
    });
    listRoute.method = "GET";
    listRoute.run = async (
      _req: Request,
      ctx?: { params: Record<string, string> },
    ) => {
      const pageId = ctx?.params?.id;
      if (!pageId) return new Response("Not found", { status: 404 });

      const store = new WidgetStore(kv);
      const instances = await store.loadForPage(pageId);
      return new Response(JSON.stringify(instances), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };
    routes.push(listRoute);

    // POST /admin/pages/[id]/widgets — create widget
    const createRoute = new Route({
      path: `${basePath}/[id]/widgets`,
      regex: new RegExp(`^${basePath}/([^/]+)/widgets$`),
      hasPage: false,
      transpiledCode: "",
      sourcePath: "",
    });
    createRoute.method = "POST";
    createRoute.run = async (
      req: Request,
      ctx?: { params: Record<string, string> },
    ) => {
      const pageId = ctx?.params?.id;
      if (!pageId) return new Response("Not found", { status: 404 });

      let body: Record<string, unknown>;
      try {
        body = await req.json() as Record<string, unknown>;
      } catch {
        return new Response(
          JSON.stringify({ error: "Invalid JSON body" }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }

      const type = body.type as WidgetType | undefined;
      const placeholder = typeof body.placeholder === "string"
        ? body.placeholder
        : "main";
      const order = typeof body.order === "number" ? body.order : 0;
      const data = (typeof body.data === "object" && body.data !== null)
        ? body.data as Record<string, unknown>
        : {};

      if (!type) {
        return new Response(
          JSON.stringify({ error: "type is required" }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }

      // [Fix 1] Permission check: verify role is allowed to use this widget type
      const session = requestSession.get(req);
      const permissionsStore = new WidgetPermissionsStore(kv);
      const canUse = await permissionsStore.canUse(
        session?.role ?? "viewer",
        type,
      );
      if (!canUse) {
        return new Response(
          JSON.stringify({ error: "Permission denied for widget type" }),
          { status: 403, headers: { "Content-Type": "application/json" } },
        );
      }

      // Prevent columns nested inside columns: placeholder must not start with "columns:"
      if (type === "columns" && placeholder.startsWith("columns:")) {
        return new Response(
          JSON.stringify({
            error:
              "columns widget cannot be nested inside another columns widget",
          }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }

      const store = new WidgetStore(kv);
      const instance = await store.create(pageId, {
        type,
        placeholder,
        order,
        data,
      });

      if (auditLogger) {
        await auditLogger.logCreate(
          pageId,
          instance.id,
          String(type),
          session?.userId ?? "unknown",
          session?.username ?? "unknown",
        );
      }

      return new Response(JSON.stringify(instance), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    };
    routes.push(createRoute);

    // POST /admin/pages/[id]/widgets/reorder — must be before /[wid]
    const reorderRoute = new Route({
      path: `${basePath}/[id]/widgets/reorder`,
      regex: new RegExp(`^${basePath}/([^/]+)/widgets/reorder$`),
      hasPage: false,
      transpiledCode: "",
      sourcePath: "",
    });
    reorderRoute.method = "POST";
    reorderRoute.run = async (
      req: Request,
      ctx?: { params: Record<string, string> },
    ) => {
      const pageId = ctx?.params?.id;
      if (!pageId) return new Response("Not found", { status: 404 });

      let body: unknown;
      try {
        body = await req.json();
      } catch {
        return new Response(
          JSON.stringify({ error: "Invalid JSON body" }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }

      if (!Array.isArray(body)) {
        return new Response(
          JSON.stringify({ error: "Expected array of {widgetId, order}" }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }

      const order = (body as Array<{ widgetId: string; order: number }>).filter(
        (item) =>
          typeof item.widgetId === "string" && typeof item.order === "number",
      );

      const store = new WidgetStore(kv);
      await store.reorder(pageId, order);

      if (auditLogger) {
        const session = requestSession.get(req);
        await auditLogger.logReorder(
          pageId,
          session?.userId ?? "unknown",
          session?.username ?? "unknown",
        );
      }

      return new Response(null, { status: 204 });
    };
    routes.push(reorderRoute);

    // POST /admin/pages/[id]/widgets/[wid] — update widget
    const updateRoute = new Route({
      path: `${basePath}/[id]/widgets/[wid]`,
      regex: new RegExp(`^${basePath}/([^/]+)/widgets/([^/]+)$`),
      hasPage: false,
      transpiledCode: "",
      sourcePath: "",
    });
    updateRoute.method = "POST";
    updateRoute.run = async (
      req: Request,
      ctx?: { params: Record<string, string> },
    ) => {
      const pageId = ctx?.params?.id;
      const widgetId = ctx?.params?.wid;
      if (!pageId || !widgetId) {
        return new Response("Not found", { status: 404 });
      }

      let body: Record<string, unknown>;
      try {
        body = await req.json() as Record<string, unknown>;
      } catch {
        return new Response(
          JSON.stringify({ error: "Invalid JSON body" }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }

      const patch: Partial<
        Pick<
          WidgetInstance,
          "type" | "placeholder" | "order" | "data"
        >
      > = {};
      if (typeof body.type === "string") patch.type = body.type as WidgetType;
      if (typeof body.placeholder === "string") {
        patch.placeholder = body.placeholder;
      }
      if (typeof body.order === "number") patch.order = body.order;
      if (typeof body.data === "object" && body.data !== null) {
        patch.data = body.data as Record<string, unknown>;
      }

      // [Fix 2] Permission check: verify role is allowed to use the new widget type
      if (patch.type !== undefined) {
        const session = requestSession.get(req);
        const permissionsStore = new WidgetPermissionsStore(kv);
        const canUse = await permissionsStore.canUse(
          session?.role ?? "viewer",
          patch.type,
        );
        if (!canUse) {
          return new Response(
            JSON.stringify({ error: "Permission denied for widget type" }),
            { status: 403, headers: { "Content-Type": "application/json" } },
          );
        }
      }

      // [Fix 4] Prevent moving/changing a columns widget into a nested columns placeholder
      if (patch.type !== undefined || patch.placeholder !== undefined) {
        const existing = await kv.get<
          WidgetInstance
        >(["widgets", pageId, "instance", widgetId]);
        if (existing.value) {
          const effectiveType = patch.type ?? existing.value.type;
          const effectivePlaceholder = patch.placeholder ??
            existing.value.placeholder;
          if (
            effectiveType === "columns" &&
            effectivePlaceholder.startsWith("columns:")
          ) {
            return new Response(
              JSON.stringify({
                error:
                  "columns widget cannot be nested inside another columns widget",
              }),
              { status: 422, headers: { "Content-Type": "application/json" } },
            );
          }
        }
      }

      const store = new WidgetStore(kv);
      try {
        const updated = await store.update(pageId, widgetId, patch);

        if (auditLogger) {
          const session = requestSession.get(req);
          await auditLogger.logUpdate(
            pageId,
            widgetId,
            session?.userId ?? "unknown",
            session?.username ?? "unknown",
          );
        }

        return new Response(JSON.stringify(updated), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } catch {
        return new Response("Not found", { status: 404 });
      }
    };
    routes.push(updateRoute);

    // POST /admin/pages/[id]/widgets/[wid]/delete — delete widget
    const deleteRoute = new Route({
      path: `${basePath}/[id]/widgets/[wid]/delete`,
      regex: new RegExp(`^${basePath}/([^/]+)/widgets/([^/]+)/delete$`),
      hasPage: false,
      transpiledCode: "",
      sourcePath: "",
    });
    deleteRoute.method = "POST";
    deleteRoute.run = async (
      req: Request,
      ctx?: { params: Record<string, string> },
    ) => {
      const pageId = ctx?.params?.id;
      const widgetId = ctx?.params?.wid;
      if (!pageId || !widgetId) {
        return new Response("Not found", { status: 404 });
      }

      const store = new WidgetStore(kv);
      const deleted = await store.delete(pageId, widgetId);
      if (!deleted) return new Response("Not found", { status: 404 });

      if (auditLogger) {
        const session = requestSession.get(req);
        await auditLogger.logDelete(
          pageId,
          widgetId,
          session?.userId ?? "unknown",
          session?.username ?? "unknown",
        );
      }

      return new Response(null, { status: 204 });
    };
    routes.push(deleteRoute);

    // POST /admin/pages/[id]/widgets/[wid]/duplicate — duplicate widget
    const duplicateRoute = new Route({
      path: `${basePath}/[id]/widgets/[wid]/duplicate`,
      regex: new RegExp(`^${basePath}/([^/]+)/widgets/([^/]+)/duplicate$`),
      hasPage: false,
      transpiledCode: "",
      sourcePath: "",
    });
    duplicateRoute.method = "POST";
    duplicateRoute.run = async (
      req: Request,
      ctx?: { params: Record<string, string> },
    ) => {
      const pageId = ctx?.params?.id;
      const widgetId = ctx?.params?.wid;
      if (!pageId || !widgetId) {
        return new Response("Not found", { status: 404 });
      }

      const store = new WidgetStore(kv);

      // Load the source widget
      const existing = await kv.get<
        WidgetInstance
      >(["widgets", pageId, "instance", widgetId]);
      if (!existing.value) {
        return new Response("Not found", { status: 404 });
      }

      const source = existing.value;

      // [Fix 3] Permission check: verify role is allowed to duplicate this widget type
      const dupSession = requestSession.get(req);
      const dupPermissionsStore = new WidgetPermissionsStore(kv);
      const canDuplicate = await dupPermissionsStore.canUse(
        dupSession?.role ?? "viewer",
        source.type,
      );
      if (!canDuplicate) {
        return new Response(
          JSON.stringify({ error: "Permission denied for widget type" }),
          { status: 403, headers: { "Content-Type": "application/json" } },
        );
      }

      const duplicate = await store.create(pageId, {
        type: source.type,
        placeholder: source.placeholder,
        order: source.order + 1,
        data: { ...source.data },
      });

      if (auditLogger) {
        const session = requestSession.get(req);
        await auditLogger.logDuplicate(
          pageId,
          widgetId,
          duplicate.id,
          session?.userId ?? "unknown",
          session?.username ?? "unknown",
        );
      }

      return new Response(JSON.stringify(duplicate), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    };
    routes.push(duplicateRoute);
  }

  /**
   * Initialize the admin panel. Instantiates plugins, generates all routes
   * (dashboard, CRUD, auth, favicon), and returns routes + middlewares.
   */
  /** Log an audit entry if AuditLogPlugin is registered. */
  private async _logAudit(
    action: "create" | "update" | "delete",
    resource: string,
    resourceId: string,
    req: Request,
    details?: string,
  ): Promise<void> {
    if (!this._auditLogPlugin) return;

    try {
      const session = requestSession.get(req);
      const entry = this._auditLogPlugin.log({
        action,
        resource,
        resource_id: resourceId,
        user_id: session?.userId ?? "unknown",
        username: session?.username ?? "unknown",
        details,
      });

      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      const item: StorageItem = {
        id,
        ...entry,
        created_at: now,
        updated_at: now,
      };

      if (this._kv) {
        // Write directly to KV with TTL
        const key = [
          "plugins",
          this._auditLogPlugin.slug,
          "items",
          id,
        ];
        await this._kv.set(key, item, { expireIn: AUDIT_LOG_TTL });

        // Write indexes for action, resource, user_id
        await this._kv.set(
          [
            "plugins",
            this._auditLogPlugin.slug,
            "index",
            "action",
            entry.action,
            id,
          ],
          id,
          { expireIn: AUDIT_LOG_TTL },
        );
        await this._kv.set(
          [
            "plugins",
            this._auditLogPlugin.slug,
            "index",
            "resource",
            entry.resource,
            id,
          ],
          id,
          { expireIn: AUDIT_LOG_TTL },
        );
        await this._kv.set(
          [
            "plugins",
            this._auditLogPlugin.slug,
            "index",
            "user_id",
            entry.user_id,
            id,
          ],
          id,
          { expireIn: AUDIT_LOG_TTL },
        );
      } else {
        await this._auditLogPlugin.storage.set(id, item);
      }
    } catch {
      // Audit failure must not block the CRUD operation
    }
  }

  /** Seed built-in roles and their permissions on first init. */
  private async _seedBuiltInRoles(): Promise<void> {
    const rolesPlugin = this._plugins.find(
      (p) => p instanceof RolesPlugin,
    ) as RolesPlugin | undefined;
    if (!rolesPlugin) return;

    // Check if roles already exist
    const existingCount = await rolesPlugin.storage.count({});
    if (existingCount > 0) return;

    const builtInRoles = [
      {
        name: "Admin",
        slug: "admin",
        description: "Full access to all resources",
        is_system: "true",
      },
      {
        name: "Editor",
        slug: "editor",
        description: "Create and edit content",
        is_system: "true",
      },
      {
        name: "Viewer",
        slug: "viewer",
        description: "Read-only access",
        is_system: "true",
      },
    ];

    for (const role of builtInRoles) {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      const item: StorageItem = {
        id,
        ...role,
        created_at: now,
        updated_at: now,
      };
      await rolesPlugin.storage.set(id, item);
    }

    // Seed permissions from ROLE_PERMISSIONS hardcoded
    if (this._kv) {
      const permissionsStore = new PermissionsStore(this._kv);
      for (
        const [roleSlug, resources] of Object.entries(ROLE_PERMISSIONS)
      ) {
        for (const [resource, perms] of Object.entries(resources)) {
          await permissionsStore.set(
            roleSlug,
            resource,
            perms as PermissionAction[],
          );
        }
      }
    }
  }

  public async init(): Promise<{
    routes: Route[];
    middlewares: Middleware[];
    dynamicRegistry?: DynamicRouteRegistry;
    blogRegistry?: BlogRouteRegistry;
    kv?: Deno.Kv;
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
        this._kv = kv;
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

      // Detect AuditLogPlugin
      this._auditLogPlugin = this._plugins.find(
        (p) => p instanceof AuditLogPlugin,
      ) as AuditLogPlugin | undefined;

      // Seed built-in roles and permissions
      await this._seedBuiltInRoles();
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

    // Preview route for PagePlugin pages
    this._addPreviewRoute(routes);

    // Page Builder routes (requires KV storage)
    if (this._kv) {
      registerBuiltinWidgets();
      // Preview route registered BEFORE builder UI to avoid regex conflicts
      this._addBuilderPreviewRoute(routes);
      // UI route registered BEFORE widget API routes to avoid regex conflicts
      this._addBuilderUIRoutes(routes);
      this._addPageBuilderRoutes(routes);
    }

    // Auth routes (login/logout)
    routes.push(...createAuthRoutes(this._userStore!, this._sessionStore!));

    // Middlewares in execution order
    const middlewares: Middleware[] = [
      securityHeadersMiddleware,
      authMiddleware(this._sessionStore!, undefined, this._kv),
      csrfMiddleware,
    ];

    // Initialize DynamicRouteRegistry with PagePlugin storage
    const pagePlugin = this._plugins.find((p) => p instanceof PagePlugin);
    let dynamicRegistry: DynamicRouteRegistry | undefined;
    if (pagePlugin) {
      this._dynamicRegistry = new DynamicRouteRegistry();
      this._dynamicRegistry.setStorage(pagePlugin.storage);
      await this._dynamicRegistry.loadFromStorage();
      dynamicRegistry = this._dynamicRegistry;
    }

    // Initialize BlogRouteRegistry with PostsPlugin + CategoriesPlugin storage
    const postsPlugin = this._plugins.find((p) => p instanceof PostsPlugin);
    const categoriesPlugin = this._plugins.find(
      (p) => p instanceof CategoriesPlugin,
    );
    let blogRegistry: BlogRouteRegistry | undefined;
    if (postsPlugin && categoriesPlugin) {
      this._blogRegistry = new BlogRouteRegistry();
      this._blogRegistry.setStorage(
        postsPlugin.storage,
        categoriesPlugin.storage,
      );
      await this._blogRegistry.loadFromStorage();
      blogRegistry = this._blogRegistry;

      // Add public blog routes (no auth required — /blog does not start with /admin)
      this._addBlogRoutes(routes);
    }

    return {
      routes,
      middlewares,
      dynamicRegistry,
      blogRegistry,
      kv: this._kv ?? undefined,
    };
  }

  /** Get the list of instantiated plugins (available after init). */
  get plugins(): Plugin[] {
    return this._plugins;
  }

  /** Get the DynamicRouteRegistry instance (available after init). */
  get dynamicRegistry(): DynamicRouteRegistry | undefined {
    return this._dynamicRegistry;
  }

  /** Get the BlogRouteRegistry instance (available after init). */
  get blogRegistry(): BlogRouteRegistry | undefined {
    return this._blogRegistry;
  }
}

/** RSS auto-discovery link tag for blog pages. */
const RSS_DISCOVERY_TAG =
  `<link rel="alternate" type="application/rss+xml" title="Blog" href="/blog/rss.xml">`;

/** Inject extra tags into the <head> of an HTML string (before </head>). */
function injectHeadTags(html: string, tags: string): string {
  return html.replace("</head>", `${tags}\n</head>`);
}

/** Escape a string for safe HTML text content. */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Escape a string for use in an HTML attribute value. */
function escapeAttrValue(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Sanitize rich HTML content by stripping dangerous elements.
 * Removes <script>, <iframe>, <object>, <embed>, <form>, <base>, <link>, <style>,
 * <meta>, <svg> (can contain scripts), <math> tags, on* event handler attributes,
 * and javascript:/data:/vbscript: URLs in href/src/action attributes.
 *
 * NOTE: Regex-based sanitization is inherently imperfect. For untrusted user input,
 * a DOM-based sanitizer (e.g. DOMPurify) should be used instead. This function
 * is a defense-in-depth layer for admin-authored content.
 */
function sanitizeHtml(s: string): string {
  return s
    // Remove matched open+close tag pairs for dangerous elements
    .replace(
      /<\s*(script|iframe|object|embed|form|base|link|style|meta|svg|math)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi,
      "",
    )
    // Remove self-closing or unclosed dangerous tags
    .replace(
      /<\s*(script|iframe|object|embed|form|base|link|style|meta|svg|math)\b[^>]*\/?>/gi,
      "",
    )
    // Remove on* event handlers (onclick, onerror, onload, etc.)
    .replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    // Remove javascript:/vbscript:/data: in href, src, action attributes
    .replace(
      /(href|src|action)\s*=\s*(?:"[^"]*(?:javascript|vbscript|data)\s*:[^"]*"|'[^']*(?:javascript|vbscript|data)\s*:[^']*')/gi,
      "",
    );
}
