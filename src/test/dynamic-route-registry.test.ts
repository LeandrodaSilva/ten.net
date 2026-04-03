import { describe, it } from "@std/testing/bdd";
import { assertEquals } from "@std/assert";
import { DynamicRouteRegistry } from "../../src/routing/dynamicRouteRegistry.ts";
import { InMemoryStorage } from "../../src/models/Storage.ts";
import type { StorageItem } from "../../src/models/Storage.ts";

/** Helper: create a published page StorageItem. */
function makePage(
  overrides: Partial<StorageItem> & { id: string; slug: string },
): StorageItem {
  return {
    status: "published",
    title: overrides.slug,
    body: `<p>${overrides.slug}</p>`,
    seo_title: "",
    seo_description: "",
    template: "",
    author_id: "",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("DynamicRouteRegistry", () => {
  describe("register()", () => {
    it("should register a published page and return a DynamicRoute", () => {
      const registry = new DynamicRouteRegistry();
      const page = makePage({ id: "1", slug: "about" });
      const result = registry.register(page);

      assertEquals(result !== null, true);
      assertEquals(result!.slug, "about");
      assertEquals(result!.id, "1");
      assertEquals(registry.size, 1);
    });

    it("should not register a draft page", () => {
      const registry = new DynamicRouteRegistry();
      const page = makePage({ id: "1", slug: "draft-page", status: "draft" });
      const result = registry.register(page);

      assertEquals(result, null);
      assertEquals(registry.size, 0);
    });

    it("should not register a page with empty slug", () => {
      const registry = new DynamicRouteRegistry();
      const page = makePage({ id: "1", slug: "" });
      const result = registry.register(page);

      assertEquals(result, null);
      assertEquals(registry.size, 0);
    });

    it("should register multiple pages", () => {
      const registry = new DynamicRouteRegistry();
      registry.register(makePage({ id: "1", slug: "about" }));
      registry.register(makePage({ id: "2", slug: "contact" }));
      registry.register(makePage({ id: "3", slug: "faq" }));

      assertEquals(registry.size, 3);
    });
  });

  describe("unregister()", () => {
    it("should remove a registered page by ID", () => {
      const registry = new DynamicRouteRegistry();
      registry.register(makePage({ id: "1", slug: "about" }));
      assertEquals(registry.size, 1);

      const removed = registry.unregister("1");
      assertEquals(removed, true);
      assertEquals(registry.size, 0);
    });

    it("should return false for an unknown ID", () => {
      const registry = new DynamicRouteRegistry();
      const removed = registry.unregister("nonexistent");
      assertEquals(removed, false);
    });

    it("should unregister the 404 page by ID", () => {
      const registry = new DynamicRouteRegistry();
      registry.register(makePage({ id: "nf", slug: "404" }));
      assertEquals(registry.notFoundPage !== null, true);

      const removed = registry.unregister("nf");
      assertEquals(removed, true);
      assertEquals(registry.notFoundPage, null);
    });
  });

  describe("match()", () => {
    it("should match a registered slug by pathname", () => {
      const registry = new DynamicRouteRegistry();
      registry.register(makePage({ id: "1", slug: "about" }));

      const matched = registry.match("/about");
      assertEquals(matched !== null, true);
      assertEquals(matched!.slug, "about");
    });

    it("should return null for an unregistered path", () => {
      const registry = new DynamicRouteRegistry();
      registry.register(makePage({ id: "1", slug: "about" }));

      const matched = registry.match("/contact");
      assertEquals(matched, null);
    });

    it("should not match after unregister", () => {
      const registry = new DynamicRouteRegistry();
      registry.register(makePage({ id: "1", slug: "about" }));
      registry.unregister("1");

      const matched = registry.match("/about");
      assertEquals(matched, null);
    });
  });

  describe("notFoundPage (slug '404')", () => {
    it("should store slug '404' as the custom not-found page", () => {
      const registry = new DynamicRouteRegistry();
      registry.register(
        makePage({ id: "nf", slug: "404", body: "<h1>Not Found</h1>" }),
      );

      assertEquals(registry.notFoundPage !== null, true);
      assertEquals(registry.notFoundPage!.slug, "404");
      assertEquals(registry.notFoundPage!.body, "<h1>Not Found</h1>");
    });

    it("should not add slug '404' to regular routes", () => {
      const registry = new DynamicRouteRegistry();
      registry.register(makePage({ id: "nf", slug: "404" }));

      // 404 is not in the regular routes map
      assertEquals(registry.size, 0);
      // But it is accessible as notFoundPage
      assertEquals(registry.notFoundPage !== null, true);
    });

    it("should not match slug '404' via match()", () => {
      const registry = new DynamicRouteRegistry();
      registry.register(makePage({ id: "nf", slug: "404" }));

      const matched = registry.match("/404");
      assertEquals(matched, null);
    });
  });

  describe("loadFromStorage()", () => {
    it("should load published pages from storage", async () => {
      const storage = new InMemoryStorage();
      await storage.set("1", makePage({ id: "1", slug: "about" }));
      await storage.set("2", makePage({ id: "2", slug: "contact" }));
      await storage.set(
        "3",
        makePage({ id: "3", slug: "hidden", status: "draft" }),
      );

      const registry = new DynamicRouteRegistry();
      registry.setStorage(storage);
      await registry.loadFromStorage();

      // Only published pages
      assertEquals(registry.size, 2);
      assertEquals(registry.match("/about") !== null, true);
      assertEquals(registry.match("/contact") !== null, true);
      assertEquals(registry.match("/hidden"), null);
    });

    it("should load the 404 page from storage", async () => {
      const storage = new InMemoryStorage();
      await storage.set(
        "nf",
        makePage({ id: "nf", slug: "404", body: "<h1>Oops</h1>" }),
      );

      const registry = new DynamicRouteRegistry();
      registry.setStorage(storage);
      await registry.loadFromStorage();

      assertEquals(registry.notFoundPage !== null, true);
      assertEquals(registry.notFoundPage!.body, "<h1>Oops</h1>");
    });

    it("should clear existing routes before loading", async () => {
      const storage = new InMemoryStorage();
      await storage.set("1", makePage({ id: "1", slug: "page-a" }));

      const registry = new DynamicRouteRegistry();
      registry.setStorage(storage);

      // Pre-populate with a different page
      registry.register(makePage({ id: "old", slug: "old-page" }));
      assertEquals(registry.size, 1);

      await registry.loadFromStorage();

      // old-page should be gone, only page-a from storage
      assertEquals(registry.size, 1);
      assertEquals(registry.match("/old-page"), null);
      assertEquals(registry.match("/page-a") !== null, true);
    });

    it("should throw if no storage is set", async () => {
      const registry = new DynamicRouteRegistry();
      let error: Error | null = null;
      try {
        await registry.loadFromStorage();
      } catch (e) {
        error = e as Error;
      }
      assertEquals(error !== null, true);
      assertEquals(
        error!.message,
        "DynamicRouteRegistry: no storage set. Call setStorage() first.",
      );
    });
  });

  describe("all()", () => {
    it("should return all registered routes excluding 404", () => {
      const registry = new DynamicRouteRegistry();
      registry.register(makePage({ id: "1", slug: "about" }));
      registry.register(makePage({ id: "2", slug: "contact" }));
      registry.register(makePage({ id: "nf", slug: "404" }));

      const all = registry.all();
      assertEquals(all.length, 2);
      assertEquals(all.some((r) => r.slug === "about"), true);
      assertEquals(all.some((r) => r.slug === "contact"), true);
    });
  });
});
