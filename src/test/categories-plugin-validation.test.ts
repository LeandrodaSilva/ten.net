import { describe, it } from "@std/testing/bdd";
import { assertEquals } from "@std/assert";
import { CategoriesPlugin } from "../plugins/categoriesPlugin.ts";
import { InMemoryStorage } from "../models/Storage.ts";
import type { StorageItem } from "../models/Storage.ts";

/** InMemoryStorage with listByIndex support for slug uniqueness tests. */
class IndexedInMemoryStorage extends InMemoryStorage {
  async listByIndex(field: string, value: string): Promise<StorageItem[]> {
    const all = await this.list({ page: 1, limit: 1000 });
    return all.filter((item) => String(item[field] ?? "") === value);
  }
}

/** Helper: create valid category data with overrides. */
function categoryData(
  overrides?: Record<string, unknown>,
): Record<string, unknown> {
  return {
    name: "Technology",
    slug: "technology",
    description: "",
    ...overrides,
  };
}

describe("CategoriesPlugin validation", () => {
  describe("slug format validation", () => {
    it("should accept lowercase alphanumeric slugs", () => {
      const plugin = new CategoriesPlugin();
      const result = plugin.validate(categoryData({ slug: "tech" }));
      assertEquals(result.errors.slug, undefined);
    });

    it("should accept multi-segment slugs", () => {
      const plugin = new CategoriesPlugin();
      const result = plugin.validate(
        categoryData({ slug: "web-development" }),
      );
      assertEquals(result.errors.slug, undefined);
    });

    it("should reject slugs with uppercase letters", () => {
      const plugin = new CategoriesPlugin();
      const result = plugin.validate(categoryData({ slug: "Tech" }));
      assertEquals(result.valid, false);
      assertEquals(
        result.errors.slug,
        "slug must be lowercase alphanumeric with hyphens (e.g. my-category)",
      );
    });

    it("should reject slugs with spaces", () => {
      const plugin = new CategoriesPlugin();
      const result = plugin.validate(categoryData({ slug: "my category" }));
      assertEquals(result.valid, false);
      assertEquals(result.errors.slug !== undefined, true);
    });

    it("should reject slugs with special characters", () => {
      const plugin = new CategoriesPlugin();
      const result = plugin.validate(categoryData({ slug: "cat@123!" }));
      assertEquals(result.valid, false);
      assertEquals(result.errors.slug !== undefined, true);
    });

    it("should reject slugs with leading hyphen", () => {
      const plugin = new CategoriesPlugin();
      const result = plugin.validate(categoryData({ slug: "-leading" }));
      assertEquals(result.valid, false);
      assertEquals(result.errors.slug !== undefined, true);
    });

    it("should reject slugs with trailing hyphen", () => {
      const plugin = new CategoriesPlugin();
      const result = plugin.validate(categoryData({ slug: "trailing-" }));
      assertEquals(result.valid, false);
      assertEquals(result.errors.slug !== undefined, true);
    });

    it("should reject slugs with consecutive hyphens", () => {
      const plugin = new CategoriesPlugin();
      const result = plugin.validate(
        categoryData({ slug: "double--hyphen" }),
      );
      assertEquals(result.valid, false);
      assertEquals(result.errors.slug !== undefined, true);
    });
  });

  describe("name validation", () => {
    it("should require name", () => {
      const plugin = new CategoriesPlugin();
      const result = plugin.validate(categoryData({ name: "" }));
      assertEquals(result.valid, false);
      assertEquals(result.errors.name !== undefined, true);
    });

    it("should accept a valid name", () => {
      const plugin = new CategoriesPlugin();
      const result = plugin.validate(categoryData({ name: "Technology" }));
      assertEquals(result.errors.name, undefined);
    });
  });

  describe("optional fields", () => {
    it("should accept empty description", () => {
      const plugin = new CategoriesPlugin();
      const result = plugin.validate(categoryData({ description: "" }));
      assertEquals(result.errors.description, undefined);
    });

    it("should accept description with content", () => {
      const plugin = new CategoriesPlugin();
      const result = plugin.validate(
        categoryData({ description: "All about tech" }),
      );
      assertEquals(result.errors.description, undefined);
    });
  });

  describe("validateAsync() — slug uniqueness", () => {
    it("should pass when slug is unique", async () => {
      const plugin = new CategoriesPlugin();
      const storage = new IndexedInMemoryStorage();
      plugin.storage = storage;

      const result = await plugin.validateAsync(
        categoryData({ slug: "unique-cat" }),
      );
      assertEquals(result.valid, true);
    });

    it("should reject duplicate slug", async () => {
      const plugin = new CategoriesPlugin();
      const storage = new IndexedInMemoryStorage();
      plugin.storage = storage;

      await storage.set("cat-1", {
        id: "cat-1",
        name: "Technology",
        slug: "tech",
        description: "",
      });

      const result = await plugin.validateAsync(
        categoryData({ slug: "tech" }),
      );
      assertEquals(result.valid, false);
      assertEquals(result.errors.slug, 'slug "tech" is already in use');
    });

    it("should accept duplicate slug with excludeId", async () => {
      const plugin = new CategoriesPlugin();
      const storage = new IndexedInMemoryStorage();
      plugin.storage = storage;

      await storage.set("cat-1", {
        id: "cat-1",
        name: "Technology",
        slug: "tech",
        description: "",
      });

      const result = await plugin.validateAsync(
        categoryData({ slug: "tech" }),
        "cat-1",
      );
      assertEquals(result.valid, true);
    });

    it("should still fail synchronous checks in async", async () => {
      const plugin = new CategoriesPlugin();
      const storage = new IndexedInMemoryStorage();
      plugin.storage = storage;

      const result = await plugin.validateAsync(
        categoryData({ slug: "Invalid!" }),
      );
      assertEquals(result.valid, false);
      assertEquals(result.errors.slug !== undefined, true);
    });
  });

  describe("complete valid form", () => {
    it("should validate a fully populated category", () => {
      const plugin = new CategoriesPlugin();
      const result = plugin.validate({
        name: "Technology",
        slug: "technology",
        description: "Posts about tech and programming",
      });
      assertEquals(result.valid, true);
      assertEquals(Object.keys(result.errors).length, 0);
    });

    it("should validate a minimal valid category", () => {
      const plugin = new CategoriesPlugin();
      const result = plugin.validate({
        name: "News",
        slug: "news",
        description: "",
      });
      assertEquals(result.valid, true);
    });
  });
});
