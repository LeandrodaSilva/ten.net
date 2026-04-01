import { Route } from "../models/Route.ts";
import type { Storage, StorageItem } from "../models/Storage.ts";
import { getRegexRoute } from "../utils/getRegexRoute.ts";

/** Shape of a dynamic route stored in memory. */
export interface DynamicRoute {
  id: string;
  slug: string;
  title: string;
  body: string;
  status: "draft" | "published";
  seo_title: string;
  seo_description: string;
  template: string;
  widgets_enabled?: string;
  route: Route;
}

/**
 * Registry that keeps dynamic routes (created via admin PagePlugin) in memory,
 * synchronized with the underlying Storage backend.
 *
 * Only published pages are registered as routes.
 * Slug "404" is treated as a special not-found page.
 */
export class DynamicRouteRegistry {
  private _routes = new Map<string, DynamicRoute>();
  private _notFoundPage: DynamicRoute | null = null;
  private _storage: Storage | null = null;

  /** Bind a Storage instance so loadFromStorage works. */
  setStorage(storage: Storage): void {
    this._storage = storage;
  }

  /** Get the bound storage (or null). */
  getStorage(): Storage | null {
    return this._storage;
  }

  /**
   * Register a page as a dynamic route.
   * Only published pages are registered.
   * Slug "404" is stored as the custom not-found page.
   */
  register(page: StorageItem): DynamicRoute | null {
    const slug = String(page.slug ?? "");
    const status = String(page.status ?? "draft");

    if (status !== "published" || !slug) return null;

    const path = `/${slug}`;
    const route = new Route({
      path,
      regex: getRegexRoute(path),
      hasPage: false,
      transpiledCode: "",
      sourcePath: "",
    });
    route.method = "GET";

    const dynamicRoute: DynamicRoute = {
      id: page.id,
      slug,
      title: String(page.title ?? ""),
      body: String(page.body ?? ""),
      status: "published",
      seo_title: String(page.seo_title ?? ""),
      seo_description: String(page.seo_description ?? ""),
      template: String(page.template ?? ""),
      widgets_enabled: page.widgets_enabled !== undefined
        ? String(page.widgets_enabled)
        : undefined,
      route,
    };

    // Slug "404" is the custom not-found page
    if (slug === "404") {
      this._notFoundPage = dynamicRoute;
      // Don't add to regular routes map — it's matched specially
      return dynamicRoute;
    }

    this._routes.set(page.id, dynamicRoute);
    return dynamicRoute;
  }

  /** Remove a dynamic route by its storage item ID. Returns true if found. */
  unregister(id: string): boolean {
    // Check if it's the 404 page
    if (this._notFoundPage?.id === id) {
      this._notFoundPage = null;
      return true;
    }
    return this._routes.delete(id);
  }

  /**
   * Match a URL pathname against all registered dynamic routes.
   * Returns the matched DynamicRoute or null.
   */
  match(pathname: string): DynamicRoute | null {
    for (const dr of this._routes.values()) {
      if (dr.route.regex.test(pathname)) {
        return dr;
      }
    }
    return null;
  }

  /**
   * Load all published pages from the bound Storage and register them.
   * Clears existing dynamic routes before loading.
   * Requires setStorage() to have been called first.
   */
  async loadFromStorage(): Promise<void> {
    if (!this._storage) {
      throw new Error(
        "DynamicRouteRegistry: no storage set. Call setStorage() first.",
      );
    }

    this._routes.clear();
    this._notFoundPage = null;

    const total = await this._storage.count();
    const pageSize = 100;
    const totalPages = Math.ceil(total / pageSize) || 1;

    for (let page = 1; page <= totalPages; page++) {
      const items = await this._storage.list({ page, limit: pageSize });
      for (const item of items) {
        // Only register published pages
        if (String(item.status) === "published" && item.slug) {
          this.register(item);
        }
      }
    }
  }

  /** Get the custom 404 page, or null if none is set. */
  get notFoundPage(): DynamicRoute | null {
    return this._notFoundPage;
  }

  /** Get all registered dynamic routes (excluding 404). */
  all(): DynamicRoute[] {
    return Array.from(this._routes.values());
  }

  /** Get the number of registered dynamic routes (excluding 404). */
  get size(): number {
    return this._routes.size;
  }
}
