import { Route } from "@leproj/tennet";
import type { Plugin, StorageItem } from "@leproj/tennet";
import { renderAdminPage } from "../../app.tsx";
import { HomeDashboard } from "../../components/home-dashboard.tsx";
import type { HomeDashboardStats } from "../../components/home-dashboard.tsx";
import type { AuditLogEntry } from "../../components/logs.tsx";
import type { SidebarNavItem } from "../../components/sidebar-nav.tsx";
import { CrudList } from "../../components/crud-list.tsx";
import { CrudForm } from "../../components/crud-form.tsx";
import { requestSession } from "../../auth/authMiddleware.ts";
import { ROLE_PERMISSIONS } from "../../auth/types.ts";
import { renderDynamicPage } from "@leproj/tennet";
import { PagePlugin } from "../pagePlugin.ts";
import { PostsPlugin } from "../postsPlugin.ts";
import { RolesPlugin } from "../rolesPlugin.ts";
import { AuditLogPlugin } from "../auditLogPlugin.ts";
import type { AdminContext } from "./context.ts";
import { buildFormFields } from "./forms.tsx";
import { logAudit } from "./audit.ts";
import { PagePluginEditPage } from "./forms.tsx";

/** Handle listing items with pagination for a plugin. */
export async function listItems(
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
export function isReadonlyPlugin(plugin: Plugin): boolean {
  return plugin instanceof AuditLogPlugin;
}

/** Map plugin slug to RBAC resource name. */
const SLUG_TO_RESOURCE: Record<string, string> = {
  "page-plugin": "pages",
  "post-plugin": "posts",
  "category-plugin": "categories",
  "group-plugin": "groups",
  "user-plugin": "users",
  "settings-plugin": "settings",
  "media-plugin": "media",
};

/** Get user's permissions for a plugin based on their role. */
function getPluginPermissions(
  role: string | undefined,
  pluginSlug: string,
): string[] {
  const rolePerms = ROLE_PERMISSIONS[role ?? ""];
  if (!rolePerms) return [];
  const resource = SLUG_TO_RESOURCE[pluginSlug] ?? pluginSlug;
  return rolePerms[resource] ?? [];
}

const pluginNavIcon = (
  <svg
    aria-hidden="true"
    className="size-6 shrink-0"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959v0a.64.64 0 0 1-.657.643 48.39 48.39 0 0 1-4.163-.3c.186 1.613.293 3.25.315 4.907a.656.656 0 0 1-.658.663v0c-.355 0-.676-.186-.959-.401a1.647 1.647 0 0 0-1.003-.349c-1.036 0-1.875 1.007-1.875 2.25s.84 2.25 1.875 2.25c.369 0 .713-.128 1.003-.349.283-.215.604-.401.959-.401v0c.31 0 .555.26.532.57a48.039 48.039 0 0 1-.642 5.056c1.518.19 3.058.309 4.616.354a.64.64 0 0 0 .657-.643v0c0-.355-.186-.676-.401-.959a1.647 1.647 0 0 1-.349-1.003c0-1.035 1.008-1.875 2.25-1.875 1.243 0 2.25.84 2.25 1.875 0 .369-.128.713-.349 1.003-.215.283-.4.604-.4.959v0c0 .333.277.599.61.58a48.1 48.1 0 0 0 5.427-.63 48.05 48.05 0 0 0 .582-4.717.532.532 0 0 0-.533-.57v0c-.355 0-.676.186-.959.401-.29.221-.634.349-1.003.349-1.035 0-1.875-1.007-1.875-2.25s.84-2.25 1.875-2.25c.37 0 .713.128 1.003.349.283.215.604.401.96.401v0a.656.656 0 0 0 .657-.663 48.422 48.422 0 0 0-.37-5.36c-1.886.342-3.81.574-5.766.689a.578.578 0 0 1-.61-.58v0Z"
    />
  </svg>
);

/** Build sidebar nav items from registered plugins, marking active by current URL. */
function buildNavItems(
  plugins: Plugin[],
  currentUrl?: string,
): SidebarNavItem[] {
  return plugins
    .filter((p) => !(p instanceof AuditLogPlugin))
    .map((p) => ({
      label: p.name.replace(/Plugin$/, ""),
      href: `/admin/plugins/${p.slug}`,
      icon: pluginNavIcon,
      active: currentUrl?.startsWith(`/admin/plugins/${p.slug}`) ?? false,
    }));
}

/** Generate the dashboard route (GET /admin). */
export function addDashboardRoute(ctx: AdminContext, routes: Route[]): void {
  const route = new Route({
    path: "/admin",
    regex: /^\/admin$/,
    hasPage: false,
    transpiledCode: "",
    sourcePath: "",
  });
  route.method = "GET";
  route.run = async (req: Request) => {
    const session = requestSession.get(req);
    const userName = session?.username;
    const navItems = buildNavItems(ctx.plugins, "/admin");

    // Fetch stats via parallel count queries
    const statSlugs: Record<keyof HomeDashboardStats, string> = {
      pages: "page-plugin",
      posts: "post-plugin",
      media: "media-plugin",
      users: "user-plugin",
    };
    const stats: HomeDashboardStats = {
      pages: 0,
      posts: 0,
      media: 0,
      users: 0,
    };
    await Promise.all(
      (Object.entries(statSlugs) as [keyof HomeDashboardStats, string][]).map(
        async ([key, slug]) => {
          const plugin = ctx.plugins.find((p) => p.slug === slug);
          if (plugin) stats[key] = await plugin.storage.count();
        },
      ),
    );

    // Fetch last 5 audit log entries
    const auditPlugin = ctx.plugins.find((p) => p instanceof AuditLogPlugin);
    const recentActivity = auditPlugin
      ? (await auditPlugin.storage.list({
        page: 1,
        limit: 5,
      })) as unknown as AuditLogEntry[]
      : [];

    const pluginCards = ctx.plugins
      .filter((p) => !(p instanceof AuditLogPlugin))
      .map((p) => ({
        name: p.name,
        slug: p.slug,
        description: p.description,
      }));

    const html = renderAdminPage(
      HomeDashboard,
      { stats, plugins: pluginCards, recentActivity },
      navItems,
      userName,
    );
    return new Response(html, {
      status: 200,
      headers: { "Content-Type": "text/html" },
    });
  };

  routes.push(route);
}

/** Generate the favicon route. */
export function addFaviconRoute(routes: Route[]): void {
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

/** Generate CRUD routes for a single plugin. */
export function addPluginCrudRoutes(
  ctx: AdminContext,
  plugin: Plugin,
  routes: Route[],
): void {
  const slug = plugin.slug;
  const basePath = `/admin/plugins/${slug}`;
  const readonly = isReadonlyPlugin(plugin);
  const isAuditTarget = !readonly;

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
    const data = await listItems(plugin, req);
    const url = new URL(req.url);

    const columns = Object.keys(plugin.model).map((key) => ({
      key,
      label: (key.charAt(0).toUpperCase() + key.slice(1)).replace(/_/g, " "),
    }));

    const session = requestSession.get(req);
    const csrfToken = session?.csrfToken;
    const navItems = buildNavItems(ctx.plugins, url.pathname);
    const perms = getPluginPermissions(session?.role, slug);
    const canCreate = perms.includes("create") && !readonly;
    const canDelete = perms.includes("delete") && !readonly;

    const html = renderAdminPage(
      CrudList,
      {
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
        canCreate,
        canDelete,
      },
      navItems,
      session?.username,
    );

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
    if (readonly) {
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
    if (plugin instanceof PagePlugin && ctx.dynamicRegistry) {
      if (String(data.status) === "published") {
        ctx.dynamicRegistry.register(item);
      }
    }

    // Hot-registration: register published posts in BlogRouteRegistry
    if (plugin instanceof PostsPlugin && ctx.blogRegistry) {
      if (String(data.status) === "published") {
        ctx.blogRegistry.register(item);
      }
    }

    // Audit log
    if (isAuditTarget) {
      await logAudit(
        ctx,
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
    const fields = await buildFormFields(plugin, ctx.plugins);
    const navItems = buildNavItems(ctx.plugins, basePath);
    const html = renderAdminPage(
      CrudForm,
      {
        pluginName: plugin.name,
        pluginSlug: slug,
        fields,
        action: basePath,
        isEdit: false,
        csrfToken,
      },
      navItems,
      session?.username,
    );
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
    routeCtx?: { params: Record<string, string> },
  ) => {
    const id = routeCtx?.params?.id;
    if (!id) return new Response("Not found", { status: 404 });
    const item = await plugin.storage.get(id);
    if (!item) return new Response("Not found", { status: 404 });

    const session = requestSession.get(req);
    const csrfToken = session?.csrfToken;

    const fields = await buildFormFields(plugin, ctx.plugins);

    const values: Record<string, string> = {};
    for (const key of Object.keys(plugin.model)) {
      const val = item[key];
      if (val !== undefined && val !== null) {
        values[key] = String(val);
      }
    }

    const navItems = buildNavItems(ctx.plugins, basePath);
    let html: string;
    if (plugin instanceof PagePlugin) {
      const builderHref = values.widgets_enabled === "true"
        ? `/admin/pages/${id}/builder`
        : undefined;
      html = renderAdminPage(
        PagePluginEditPage,
        {
          pluginName: plugin.name,
          pluginSlug: slug,
          fields,
          values,
          action: `${basePath}/${id}`,
          isEdit: true,
          itemId: id,
          csrfToken,
          builderHref,
        },
        navItems,
        session?.username,
      );
    } else {
      html = renderAdminPage(
        CrudForm,
        {
          pluginName: plugin.name,
          pluginSlug: slug,
          fields,
          values,
          action: `${basePath}/${id}`,
          isEdit: true,
          itemId: id,
          csrfToken,
        },
        navItems,
        session?.username,
      );
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
    routeCtx?: { params: Record<string, string> },
  ) => {
    // Block writes for readonly plugins (e.g. AuditLogPlugin)
    if (readonly) {
      return new Response("Forbidden", { status: 403 });
    }

    const id = routeCtx?.params?.id;
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
    if (plugin instanceof PagePlugin && ctx.dynamicRegistry) {
      if (String(data.status) === "published") {
        // Re-register (or register for the first time)
        ctx.dynamicRegistry.unregister(id);
        ctx.dynamicRegistry.register(data as StorageItem);
      } else {
        // Unpublished — remove from dynamic routes
        ctx.dynamicRegistry.unregister(id);
      }
    }

    // Hot-registration: update blog post on status change
    if (plugin instanceof PostsPlugin && ctx.blogRegistry) {
      if (String(data.status) === "published") {
        ctx.blogRegistry.unregister(id);
        ctx.blogRegistry.register(data as StorageItem);
      } else {
        ctx.blogRegistry.unregister(id);
      }
    }

    // Audit log
    if (isAuditTarget) {
      await logAudit(
        ctx,
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
    routeCtx?: { params: Record<string, string> },
  ) => {
    // Block writes for readonly plugins (e.g. AuditLogPlugin)
    if (readonly) {
      return new Response("Forbidden", { status: 403 });
    }

    const id = routeCtx?.params?.id;
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
    if (plugin instanceof PagePlugin && ctx.dynamicRegistry) {
      ctx.dynamicRegistry.unregister(id);
    }

    // Hot-registration: unregister deleted posts from BlogRouteRegistry
    if (plugin instanceof PostsPlugin && ctx.blogRegistry) {
      ctx.blogRegistry.unregister(id);
    }

    // Audit log
    if (isAuditTarget) {
      await logAudit(ctx, "delete", slug, id, req);
    }

    return new Response(null, {
      status: 302,
      headers: { Location: `${basePath}?success=deleted` },
    });
  };
  routes.push(deleteRoute);
}

/** Generate the preview route (GET /admin/preview/[id]). */
export function addPreviewRoute(ctx: AdminContext, routes: Route[]): void {
  const pagePlugin = ctx.plugins.find((p) => p.slug === "page-plugin");
  if (!pagePlugin) return;

  const kv = ctx.kv ?? undefined;

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
    routeCtx?: { params: Record<string, string> },
  ) => {
    const id = routeCtx?.params?.id;
    if (!id) return new Response("Not found", { status: 404 });

    const item = await pagePlugin.storage.get(id);
    if (!item) return new Response("Not found", { status: 404 });

    let html = await renderDynamicPage(item, ctx.appPath, kv);

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
