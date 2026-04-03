import { Route } from "@leproj/tennet";
import { renderDynamicPage } from "@leproj/tennet";
import { renderBuilderPage } from "../../app.tsx";
import {
  WidgetPermissionsStore,
  widgetRegistry,
  WidgetStore,
} from "@leproj/tennet-widgets";
import { WidgetAuditLogger } from "./widgetAuditLogger.ts";
import type {
  PlaceholderMap,
  WidgetInstance,
  WidgetType,
} from "@leproj/tennet-widgets";
import { PageBuilderEditor } from "../../components/page-builder-editor.tsx";
import { requestSession } from "../../auth/authMiddleware.ts";
import { PagePlugin } from "../pagePlugin.ts";
import type { AdminContext } from "./context.ts";

/**
 * Generate the builder preview route.
 *
 * Route:
 *   GET /admin/pages/[id]/builder/preview — renders the page as it would appear publicly
 *
 * Registered BEFORE /builder to avoid regex conflicts.
 * Requires KV storage — only called when ctx.kv is set.
 */
export function addBuilderPreviewRoute(
  ctx: AdminContext,
  routes: Route[],
): void {
  const pagePlugin = ctx.plugins.find((p) => p instanceof PagePlugin);
  if (!pagePlugin) return;

  const kv = ctx.kv ?? undefined;

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
    routeCtx?: { params: Record<string, string> },
  ) => {
    const id = routeCtx?.params?.id;
    if (!id) return new Response("Not found", { status: 404 });

    const page = await pagePlugin.storage.get(id);
    if (!page) return new Response("Not found", { status: 404 });

    const html = await renderDynamicPage(
      page,
      ctx.appPath,
      kv,
      undefined,
      ctx.widgetRenderer,
    );

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
 * Requires KV storage — only called when ctx.kv is set.
 */
export function addBuilderUIRoutes(ctx: AdminContext, routes: Route[]): void {
  const kv = ctx.kv!;

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
    routeCtx?: { params: Record<string, string> },
  ) => {
    const id = routeCtx?.params?.id;
    if (!id) return new Response("Not found", { status: 404 });

    const pagePlugin = ctx.plugins.find((p) => p instanceof PagePlugin);
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
 * Requires KV storage — only called when ctx.kv is set.
 */
export function addPageBuilderRoutes(
  ctx: AdminContext,
  routes: Route[],
): void {
  const kv = ctx.kv!;
  const basePath = "/admin/pages";
  const auditLogger = ctx.auditLogPlugin
    ? new WidgetAuditLogger(ctx.auditLogPlugin)
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
    routeCtx?: { params: Record<string, string> },
  ) => {
    const pageId = routeCtx?.params?.id;
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
    routeCtx?: { params: Record<string, string> },
  ) => {
    const pageId = routeCtx?.params?.id;
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
    routeCtx?: { params: Record<string, string> },
  ) => {
    const pageId = routeCtx?.params?.id;
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
    routeCtx?: { params: Record<string, string> },
  ) => {
    const pageId = routeCtx?.params?.id;
    const widgetId = routeCtx?.params?.wid;
    if (!pageId || !widgetId) {
      return new Response("Not found", { status: 404 });
    }

    let body: Record<string, unknown>;
    const contentType = req.headers.get("content-type") ?? "";
    try {
      if (contentType.includes("application/json")) {
        body = await req.json() as Record<string, unknown>;
      } else {
        // Parse form-encoded data (from HTML form submit)
        const formData = await req.formData();
        const widgetData: Record<string, unknown> = {};
        body = {};
        for (const [key, value] of formData.entries()) {
          if (key.startsWith("data.")) {
            widgetData[key.slice(5)] = value;
          } else if (key !== "_csrf" && key !== "_method") {
            body[key] = value;
          }
        }
        if (Object.keys(widgetData).length > 0) {
          body.data = widgetData;
        }
      }
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid request body" }),
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
    if (
      body.data !== undefined && typeof body.data === "object" &&
      body.data !== null
    ) {
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

      if (contentType.includes("application/json")) {
        return new Response(JSON.stringify(updated), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      // Form submit: redirect back to builder
      return new Response(null, {
        status: 302,
        headers: { Location: `${basePath}/${pageId}/builder` },
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
    routeCtx?: { params: Record<string, string> },
  ) => {
    const pageId = routeCtx?.params?.id;
    const widgetId = routeCtx?.params?.wid;
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
    routeCtx?: { params: Record<string, string> },
  ) => {
    const pageId = routeCtx?.params?.id;
    const widgetId = routeCtx?.params?.wid;
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
