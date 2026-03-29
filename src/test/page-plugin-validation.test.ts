import { describe, it } from "@std/testing/bdd";
import { assertEquals } from "@std/assert";
import { PagePlugin } from "../plugins/pagePlugin.ts";
import { InMemoryStorage } from "../models/Storage.ts";

/** Helper: create valid page data with overrides. */
function pageData(
  overrides?: Record<string, unknown>,
): Record<string, unknown> {
  return {
    slug: "valid-slug",
    title: "Valid Title",
    body: "<p>Content</p>",
    status: "published",
    seo_title: "",
    seo_description: "",
    template: "",
    author_id: "",
    ...overrides,
  };
}

describe("PagePlugin validation — expanded model", () => {
  describe("slug format validation", () => {
    it("should accept lowercase alphanumeric slugs", () => {
      const plugin = new PagePlugin();
      const result = plugin.validate(pageData({ slug: "my-page" }));
      assertEquals(result.errors.slug, undefined);
    });

    it("should accept single-word slugs", () => {
      const plugin = new PagePlugin();
      const result = plugin.validate(pageData({ slug: "about" }));
      assertEquals(result.errors.slug, undefined);
    });

    it("should accept numeric slugs", () => {
      const plugin = new PagePlugin();
      const result = plugin.validate(pageData({ slug: "404" }));
      assertEquals(result.errors.slug, undefined);
    });

    it("should accept multi-segment slugs", () => {
      const plugin = new PagePlugin();
      const result = plugin.validate(
        pageData({ slug: "my-long-page-slug-123" }),
      );
      assertEquals(result.errors.slug, undefined);
    });

    it("should reject slugs with uppercase letters", () => {
      const plugin = new PagePlugin();
      const result = plugin.validate(pageData({ slug: "About-Us" }));
      assertEquals(result.valid, false);
      assertEquals(
        result.errors.slug,
        "slug must be lowercase alphanumeric with hyphens (e.g. my-page)",
      );
    });

    it("should reject slugs with spaces", () => {
      const plugin = new PagePlugin();
      const result = plugin.validate(pageData({ slug: "about us" }));
      assertEquals(result.valid, false);
      assertEquals(result.errors.slug !== undefined, true);
    });

    it("should reject slugs with special characters", () => {
      const plugin = new PagePlugin();
      const result = plugin.validate(pageData({ slug: "page@home!" }));
      assertEquals(result.valid, false);
      assertEquals(result.errors.slug !== undefined, true);
    });

    it("should reject slugs with leading hyphen", () => {
      const plugin = new PagePlugin();
      const result = plugin.validate(pageData({ slug: "-leading" }));
      assertEquals(result.valid, false);
      assertEquals(result.errors.slug !== undefined, true);
    });

    it("should reject slugs with trailing hyphen", () => {
      const plugin = new PagePlugin();
      const result = plugin.validate(pageData({ slug: "trailing-" }));
      assertEquals(result.valid, false);
      assertEquals(result.errors.slug !== undefined, true);
    });

    it("should reject slugs with consecutive hyphens", () => {
      const plugin = new PagePlugin();
      const result = plugin.validate(pageData({ slug: "double--hyphen" }));
      assertEquals(result.valid, false);
      assertEquals(result.errors.slug !== undefined, true);
    });
  });

  describe("status validation", () => {
    it("should accept 'draft' status", () => {
      const plugin = new PagePlugin();
      const result = plugin.validate(pageData({ status: "draft", body: "" }));
      assertEquals(result.errors.status, undefined);
    });

    it("should accept 'published' status", () => {
      const plugin = new PagePlugin();
      const result = plugin.validate(pageData({ status: "published" }));
      assertEquals(result.errors.status, undefined);
    });

    it("should reject 'archived' status", () => {
      const plugin = new PagePlugin();
      const result = plugin.validate(pageData({ status: "archived" }));
      assertEquals(result.valid, false);
      assertEquals(result.errors.status, "status must be draft or published");
    });

    it("should reject unknown status values", () => {
      const plugin = new PagePlugin();
      const result = plugin.validate(pageData({ status: "pending" }));
      assertEquals(result.valid, false);
      assertEquals(result.errors.status, "status must be draft or published");
    });
  });

  describe("body requirement", () => {
    it("should require body when status is published", () => {
      const plugin = new PagePlugin();
      const result = plugin.validate(
        pageData({ status: "published", body: "" }),
      );
      assertEquals(result.valid, false);
      assertEquals(
        result.errors.body,
        "body is required when status is published",
      );
    });

    it("should reject whitespace-only body when published", () => {
      const plugin = new PagePlugin();
      const result = plugin.validate(
        pageData({ status: "published", body: "   " }),
      );
      assertEquals(result.valid, false);
      assertEquals(
        result.errors.body,
        "body is required when status is published",
      );
    });

    it("should allow empty body for drafts", () => {
      const plugin = new PagePlugin();
      const result = plugin.validate(
        pageData({ status: "draft", body: "" }),
      );
      assertEquals(result.errors.body, undefined);
    });

    it("should pass with body content when published", () => {
      const plugin = new PagePlugin();
      const result = plugin.validate(
        pageData({ status: "published", body: "<p>Hello</p>" }),
      );
      assertEquals(result.valid, true);
    });
  });

  describe("optional fields", () => {
    it("should not require seo_title", () => {
      const plugin = new PagePlugin();
      const result = plugin.validate(pageData({ seo_title: "" }));
      assertEquals(result.errors.seo_title, undefined);
    });

    it("should not require seo_description", () => {
      const plugin = new PagePlugin();
      const result = plugin.validate(pageData({ seo_description: "" }));
      assertEquals(result.errors.seo_description, undefined);
    });

    it("should not require template", () => {
      const plugin = new PagePlugin();
      const result = plugin.validate(pageData({ template: "" }));
      assertEquals(result.errors.template, undefined);
    });

    it("should not require author_id", () => {
      const plugin = new PagePlugin();
      const result = plugin.validate(pageData({ author_id: "" }));
      assertEquals(result.errors.author_id, undefined);
    });
  });

  describe("validateAsync() — slug uniqueness", () => {
    it("should pass when slug is unique", async () => {
      const plugin = new PagePlugin();
      const storage = new InMemoryStorage();
      plugin.storage = storage;

      const result = await plugin.validateAsync(pageData({ slug: "unique" }));
      assertEquals(result.valid, true);
    });

    it("should still fail synchronous checks in async", async () => {
      const plugin = new PagePlugin();
      const storage = new InMemoryStorage();
      plugin.storage = storage;

      const result = await plugin.validateAsync(
        pageData({ slug: "Invalid Slug!" }),
      );
      assertEquals(result.valid, false);
      assertEquals(result.errors.slug !== undefined, true);
    });
  });

  describe("complete valid form", () => {
    it("should validate a fully populated published page", () => {
      const plugin = new PagePlugin();
      const result = plugin.validate({
        slug: "hello-world",
        title: "Hello World",
        body: "<p>Welcome to our site.</p>",
        status: "published",
        seo_title: "Hello World | My Site",
        seo_description: "A warm welcome page",
        template: "default",
        author_id: "admin-1",
      });
      assertEquals(result.valid, true);
      assertEquals(Object.keys(result.errors).length, 0);
    });

    it("should validate a minimal valid draft", () => {
      const plugin = new PagePlugin();
      const result = plugin.validate({
        slug: "wip",
        title: "Work in Progress",
        body: "",
        status: "draft",
        seo_title: "",
        seo_description: "",
        template: "",
        author_id: "",
      });
      assertEquals(result.errors.body, undefined);
      assertEquals(result.errors.slug, undefined);
      assertEquals(result.errors.status, undefined);
    });
  });
});
