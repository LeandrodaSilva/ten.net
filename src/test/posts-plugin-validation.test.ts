import { describe, it } from "@std/testing/bdd";
import { assertEquals } from "@std/assert";
import { PostsPlugin } from "../../packages/admin/src/plugins/postsPlugin.ts";
import { InMemoryStorage } from "../../packages/core/src/models/Storage.ts";
import type { StorageItem } from "../../packages/core/src/models/Storage.ts";

/** InMemoryStorage with listByIndex support for slug uniqueness tests. */
class IndexedInMemoryStorage extends InMemoryStorage {
  async listByIndex(field: string, value: string): Promise<StorageItem[]> {
    const all = await this.list({ page: 1, limit: 1000 });
    return all.filter((item) => String(item[field] ?? "") === value);
  }
}

/** Helper: create valid post data with overrides. */
function postData(
  overrides?: Record<string, unknown>,
): Record<string, unknown> {
  return {
    title: "My Post",
    slug: "my-post",
    excerpt: "",
    body: "<p>Content</p>",
    cover_image: "",
    status: "published",
    category_ids: "",
    author_id: "",
    published_at: "",
    ...overrides,
  };
}

describe("PostsPlugin validation", () => {
  describe("slug format validation", () => {
    it("should accept lowercase alphanumeric slugs", () => {
      const plugin = new PostsPlugin();
      const result = plugin.validate(postData({ slug: "hello-world" }));
      assertEquals(result.errors.slug, undefined);
    });

    it("should accept single-word slugs", () => {
      const plugin = new PostsPlugin();
      const result = plugin.validate(postData({ slug: "intro" }));
      assertEquals(result.errors.slug, undefined);
    });

    it("should accept numeric slugs", () => {
      const plugin = new PostsPlugin();
      const result = plugin.validate(postData({ slug: "2024" }));
      assertEquals(result.errors.slug, undefined);
    });

    it("should reject slugs with uppercase letters", () => {
      const plugin = new PostsPlugin();
      const result = plugin.validate(postData({ slug: "My-Post" }));
      assertEquals(result.valid, false);
      assertEquals(
        result.errors.slug,
        "slug must be lowercase alphanumeric with hyphens (e.g. my-post)",
      );
    });

    it("should reject slugs with spaces", () => {
      const plugin = new PostsPlugin();
      const result = plugin.validate(postData({ slug: "my post" }));
      assertEquals(result.valid, false);
      assertEquals(result.errors.slug !== undefined, true);
    });

    it("should reject slugs with special characters", () => {
      const plugin = new PostsPlugin();
      const result = plugin.validate(postData({ slug: "post@home!" }));
      assertEquals(result.valid, false);
      assertEquals(result.errors.slug !== undefined, true);
    });

    it("should reject slugs with leading hyphen", () => {
      const plugin = new PostsPlugin();
      const result = plugin.validate(postData({ slug: "-leading" }));
      assertEquals(result.valid, false);
      assertEquals(result.errors.slug !== undefined, true);
    });

    it("should reject slugs with trailing hyphen", () => {
      const plugin = new PostsPlugin();
      const result = plugin.validate(postData({ slug: "trailing-" }));
      assertEquals(result.valid, false);
      assertEquals(result.errors.slug !== undefined, true);
    });

    it("should reject slugs with consecutive hyphens", () => {
      const plugin = new PostsPlugin();
      const result = plugin.validate(postData({ slug: "double--hyphen" }));
      assertEquals(result.valid, false);
      assertEquals(result.errors.slug !== undefined, true);
    });
  });

  describe("status validation", () => {
    it("should accept 'draft' status", () => {
      const plugin = new PostsPlugin();
      const result = plugin.validate(postData({ status: "draft", body: "" }));
      assertEquals(result.errors.status, undefined);
    });

    it("should accept 'published' status", () => {
      const plugin = new PostsPlugin();
      const result = plugin.validate(postData({ status: "published" }));
      assertEquals(result.errors.status, undefined);
    });

    it("should reject 'archived' status", () => {
      const plugin = new PostsPlugin();
      const result = plugin.validate(postData({ status: "archived" }));
      assertEquals(result.valid, false);
      assertEquals(result.errors.status, "status must be draft or published");
    });

    it("should reject unknown status values", () => {
      const plugin = new PostsPlugin();
      const result = plugin.validate(postData({ status: "pending" }));
      assertEquals(result.valid, false);
      assertEquals(result.errors.status, "status must be draft or published");
    });
  });

  describe("body requirement", () => {
    it("should require body when status is published", () => {
      const plugin = new PostsPlugin();
      const result = plugin.validate(
        postData({ status: "published", body: "" }),
      );
      assertEquals(result.valid, false);
      assertEquals(
        result.errors.body,
        "body is required when status is published",
      );
    });

    it("should reject whitespace-only body when published", () => {
      const plugin = new PostsPlugin();
      const result = plugin.validate(
        postData({ status: "published", body: "   " }),
      );
      assertEquals(result.valid, false);
      assertEquals(
        result.errors.body,
        "body is required when status is published",
      );
    });

    it("should allow empty body for drafts", () => {
      const plugin = new PostsPlugin();
      const result = plugin.validate(
        postData({ status: "draft", body: "" }),
      );
      assertEquals(result.errors.body, undefined);
    });

    it("should pass with body content when published", () => {
      const plugin = new PostsPlugin();
      const result = plugin.validate(
        postData({ status: "published", body: "<p>Hello</p>" }),
      );
      assertEquals(result.valid, true);
    });
  });

  describe("optional fields", () => {
    it("should not require excerpt", () => {
      const plugin = new PostsPlugin();
      const result = plugin.validate(postData({ excerpt: "" }));
      assertEquals(result.errors.excerpt, undefined);
    });

    it("should not require cover_image", () => {
      const plugin = new PostsPlugin();
      const result = plugin.validate(postData({ cover_image: "" }));
      assertEquals(result.errors.cover_image, undefined);
    });

    it("should not require author_id", () => {
      const plugin = new PostsPlugin();
      const result = plugin.validate(postData({ author_id: "" }));
      assertEquals(result.errors.author_id, undefined);
    });

    it("should not require category_ids", () => {
      const plugin = new PostsPlugin();
      const result = plugin.validate(postData({ category_ids: "" }));
      assertEquals(result.errors.category_ids, undefined);
    });

    it("should not require published_at", () => {
      const plugin = new PostsPlugin();
      const result = plugin.validate(postData({ published_at: "" }));
      assertEquals(result.errors.published_at, undefined);
    });
  });

  describe("category_ids validation", () => {
    it("should accept valid JSON array", () => {
      const plugin = new PostsPlugin();
      const result = plugin.validate(
        postData({ category_ids: '["cat-1","cat-2"]' }),
      );
      assertEquals(result.errors.category_ids, undefined);
    });

    it("should accept empty string", () => {
      const plugin = new PostsPlugin();
      const result = plugin.validate(postData({ category_ids: "" }));
      assertEquals(result.errors.category_ids, undefined);
    });

    it("should reject non-array JSON", () => {
      const plugin = new PostsPlugin();
      const result = plugin.validate(
        postData({ category_ids: '{"key":"value"}' }),
      );
      assertEquals(result.valid, false);
      assertEquals(
        result.errors.category_ids,
        "category_ids must be a valid JSON array",
      );
    });

    it("should reject invalid JSON string", () => {
      const plugin = new PostsPlugin();
      const result = plugin.validate(
        postData({ category_ids: "not-json" }),
      );
      assertEquals(result.valid, false);
      assertEquals(
        result.errors.category_ids,
        "category_ids must be a valid JSON array",
      );
    });

    it("should reject plain string that is not JSON", () => {
      const plugin = new PostsPlugin();
      const result = plugin.validate(
        postData({ category_ids: "cat-1,cat-2" }),
      );
      assertEquals(result.valid, false);
      assertEquals(
        result.errors.category_ids,
        "category_ids must be a valid JSON array",
      );
    });
  });

  describe("published_at auto-fill", () => {
    it("should auto-fill published_at when publishing with empty value", () => {
      const plugin = new PostsPlugin();
      const data = postData({ status: "published", published_at: "" });
      plugin.validate(data);
      assertEquals(typeof data.published_at, "string");
      assertEquals((data.published_at as string).length > 0, true);
      // Should be a valid ISO date
      const date = new Date(data.published_at as string);
      assertEquals(isNaN(date.getTime()), false);
    });

    it("should not overwrite existing published_at", () => {
      const plugin = new PostsPlugin();
      const existingDate = "2025-01-01T00:00:00.000Z";
      const data = postData({
        status: "published",
        published_at: existingDate,
      });
      plugin.validate(data);
      assertEquals(data.published_at, existingDate);
    });

    it("should not auto-fill published_at for drafts", () => {
      const plugin = new PostsPlugin();
      const data = postData({ status: "draft", body: "", published_at: "" });
      plugin.validate(data);
      assertEquals(data.published_at, "");
    });
  });

  describe("validateAsync() — slug uniqueness", () => {
    it("should pass when slug is unique", async () => {
      const plugin = new PostsPlugin();
      const storage = new IndexedInMemoryStorage();
      plugin.storage = storage;

      const result = await plugin.validateAsync(
        postData({ slug: "unique-post" }),
      );
      assertEquals(result.valid, true);
    });

    it("should reject duplicate slug", async () => {
      const plugin = new PostsPlugin();
      const storage = new IndexedInMemoryStorage();
      plugin.storage = storage;

      await storage.set("existing-1", {
        id: "existing-1",
        slug: "taken-slug",
        title: "Existing",
        status: "published",
      });

      const result = await plugin.validateAsync(
        postData({ slug: "taken-slug" }),
      );
      assertEquals(result.valid, false);
      assertEquals(result.errors.slug, 'slug "taken-slug" is already in use');
    });

    it("should accept duplicate slug with excludeId", async () => {
      const plugin = new PostsPlugin();
      const storage = new IndexedInMemoryStorage();
      plugin.storage = storage;

      await storage.set("post-1", {
        id: "post-1",
        slug: "my-slug",
        title: "My Post",
        status: "published",
      });

      const result = await plugin.validateAsync(
        postData({ slug: "my-slug" }),
        "post-1",
      );
      assertEquals(result.valid, true);
    });

    it("should still fail synchronous checks in async", async () => {
      const plugin = new PostsPlugin();
      const storage = new IndexedInMemoryStorage();
      plugin.storage = storage;

      const result = await plugin.validateAsync(
        postData({ slug: "Invalid Slug!" }),
      );
      assertEquals(result.valid, false);
      assertEquals(result.errors.slug !== undefined, true);
    });
  });

  describe("complete valid form", () => {
    it("should validate a fully populated published post", () => {
      const plugin = new PostsPlugin();
      const result = plugin.validate({
        title: "Hello World",
        slug: "hello-world",
        excerpt: "A brief intro",
        body: "<p>Welcome to our blog.</p>",
        cover_image: "/images/hello.jpg",
        status: "published",
        category_ids: '["cat-1"]',
        author_id: "admin-1",
        published_at: "2025-06-01T00:00:00.000Z",
      });
      assertEquals(result.valid, true);
      assertEquals(Object.keys(result.errors).length, 0);
    });

    it("should validate a minimal valid draft", () => {
      const plugin = new PostsPlugin();
      const result = plugin.validate({
        title: "WIP",
        slug: "wip",
        excerpt: "",
        body: "",
        cover_image: "",
        status: "draft",
        category_ids: "",
        author_id: "",
        published_at: "",
      });
      assertEquals(result.errors.body, undefined);
      assertEquals(result.errors.slug, undefined);
      assertEquals(result.errors.status, undefined);
    });
  });
});
