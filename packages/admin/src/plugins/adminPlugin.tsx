import type { Plugin } from "@leproj/tennet";
import type { Middleware } from "@leproj/tennet";
import { BlogRouteRegistry, DynamicRouteRegistry } from "@leproj/tennet";
import { createAuthRoutes } from "../auth/loginHandler.ts";
import { authMiddleware } from "../auth/authMiddleware.ts";
import { csrfMiddleware } from "../auth/csrfMiddleware.ts";
import { securityHeadersMiddleware } from "../auth/securityHeaders.ts";
import { registerBuiltinWidgets } from "@leproj/tennet-widgets";
import { PagePlugin } from "./pagePlugin.ts";
import { PostsPlugin } from "./postsPlugin.ts";
import { CategoriesPlugin } from "./categoriesPlugin.ts";
import type { AdminContext } from "./admin/context.ts";
import { initAdmin } from "./admin/init.ts";
import {
  addDashboardRoute,
  addFaviconRoute,
  addPluginCrudRoutes,
  addPreviewRoute,
} from "./admin/crud.tsx";
import { addBlogRoutes } from "./admin/blog.ts";
import {
  addBuilderPreviewRoute,
  addBuilderUIRoutes,
  addPageBuilderRoutes,
} from "./admin/builder.ts";
import { addMediaRoutes } from "./admin/media.ts";

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
  private _storageMode: "memory" | "kv";
  private _kvPath?: string;
  private _ctx?: AdminContext;

  constructor(options?: AdminPluginOptions) {
    this._pluginConstructors = options?.plugins ?? [];
    this._storageMode = options?.storage ?? "kv";
    this._kvPath = options?.kvPath;
  }

  public async init(): Promise<{
    routes: import("@leproj/tennet").Route[];
    middlewares: Middleware[];
    dynamicRegistry?: DynamicRouteRegistry;
    blogRegistry?: BlogRouteRegistry;
    kv?: Deno.Kv;
  }> {
    // Instantiate content plugins (only on first init; re-init reuses existing instances)
    if (!this._ctx) {
      this._ctx = await initAdmin(
        this._pluginConstructors,
        this._storageMode,
        this._kvPath,
      );
    }
    const ctx = this._ctx;
    const routes: import("@leproj/tennet").Route[] = [];

    // Dashboard route
    addDashboardRoute(ctx, routes);

    // Favicon route
    addFaviconRoute(routes);

    // CRUD routes for each plugin
    for (const plugin of ctx.plugins) {
      addPluginCrudRoutes(ctx, plugin, routes);
    }

    // Preview route for PagePlugin pages
    addPreviewRoute(ctx, routes);

    // Page Builder routes (requires KV storage)
    if (ctx.kv) {
      registerBuiltinWidgets();
      // Preview route registered BEFORE builder UI to avoid regex conflicts
      addBuilderPreviewRoute(ctx, routes);
      // UI route registered BEFORE widget API routes to avoid regex conflicts
      addBuilderUIRoutes(ctx, routes);
      addPageBuilderRoutes(ctx, routes);
    }

    // Media Library routes (admin + rota pública /media/:filename)
    addMediaRoutes(ctx, routes);

    // Auth routes (login/logout)
    routes.push(...createAuthRoutes(ctx.userStore, ctx.sessionStore));

    // Middlewares in execution order
    const middlewares: Middleware[] = [
      securityHeadersMiddleware,
      authMiddleware(ctx.sessionStore, undefined, ctx.kv),
      csrfMiddleware,
    ];

    // Initialize DynamicRouteRegistry with PagePlugin storage
    const pagePlugin = ctx.plugins.find((p) => p instanceof PagePlugin);
    let dynamicRegistry: DynamicRouteRegistry | undefined;
    if (pagePlugin) {
      ctx.dynamicRegistry = new DynamicRouteRegistry();
      ctx.dynamicRegistry.setStorage(pagePlugin.storage);
      await ctx.dynamicRegistry.loadFromStorage();
      dynamicRegistry = ctx.dynamicRegistry;
    }

    // Initialize BlogRouteRegistry with PostsPlugin + CategoriesPlugin storage
    const postsPlugin = ctx.plugins.find((p) => p instanceof PostsPlugin);
    const categoriesPlugin = ctx.plugins.find(
      (p) => p instanceof CategoriesPlugin,
    );
    let blogRegistry: BlogRouteRegistry | undefined;
    if (postsPlugin && categoriesPlugin) {
      ctx.blogRegistry = new BlogRouteRegistry();
      ctx.blogRegistry.setStorage(
        postsPlugin.storage,
        categoriesPlugin.storage,
      );
      await ctx.blogRegistry.loadFromStorage();
      blogRegistry = ctx.blogRegistry;

      // Add public blog routes (no auth required — /blog does not start with /admin)
      addBlogRoutes(ctx, routes);
    }

    return {
      routes,
      middlewares,
      dynamicRegistry,
      blogRegistry,
      kv: ctx.kv ?? undefined,
    };
  }

  /** Get the list of instantiated plugins (available after init). */
  get plugins(): Plugin[] {
    return this._ctx?.plugins ?? [];
  }

  /** Get the DynamicRouteRegistry instance (available after init). */
  get dynamicRegistry(): DynamicRouteRegistry | undefined {
    return this._ctx?.dynamicRegistry;
  }

  /** Get the BlogRouteRegistry instance (available after init). */
  get blogRegistry(): BlogRouteRegistry | undefined {
    return this._ctx?.blogRegistry;
  }
}
