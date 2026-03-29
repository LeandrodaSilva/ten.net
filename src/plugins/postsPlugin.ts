import { Plugin, type PluginModel } from "../models/Plugin.ts";
import type { StorageItem } from "../models/Storage.ts";

/** Valid slug pattern: lowercase letters, numbers, hyphens. No leading/trailing hyphens. */
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Allowed post statuses. */
export type PostStatus = "draft" | "published";

const VALID_STATUSES: PostStatus[] = ["draft", "published"];

/** Fields that are optional (not required even for non-boolean types). */
const OPTIONAL_FIELDS = new Set([
  "excerpt",
  "cover_image",
  "author_id",
  "category_ids",
  "published_at",
]);

export class PostsPlugin extends Plugin {
  name: string;
  description: string;
  model: PluginModel;

  constructor() {
    super();
    this.name = "PostPlugin";
    this.description = "Manage blog posts and content.";
    this.model = {
      title: "string",
      slug: "string",
      excerpt: "string",
      body: "string",
      cover_image: "string",
      status: "string",
      category_ids: "string",
      author_id: "string",
      published_at: "string",
    };
  }

  /**
   * Synchronous validation for PostsPlugin data.
   * Checks slug format, status values, body-on-publish rule,
   * category_ids JSON format, auto-fills published_at,
   * and marks optional fields as non-required.
   */
  public override validate(
    data: Record<string, unknown>,
  ): { valid: boolean; errors: Record<string, string> } {
    const { errors } = super.validate(data);

    // Remove errors for optional fields
    for (const field of OPTIONAL_FIELDS) {
      delete errors[field];
    }

    // slug: required + format
    const slug = data.slug;
    if (typeof slug === "string" && slug !== "") {
      if (!SLUG_REGEX.test(slug)) {
        errors.slug =
          "slug must be lowercase alphanumeric with hyphens (e.g. my-post)";
      }
    }

    // status: must be draft or published
    const status = data.status;
    if (typeof status === "string" && status !== "") {
      if (!VALID_STATUSES.includes(status as PostStatus)) {
        errors.status = "status must be draft or published";
      }
    }

    // body: required when publishing
    if (status === "published") {
      const body = data.body;
      if (!body || (typeof body === "string" && body.trim() === "")) {
        errors.body = "body is required when status is published";
      }
    }

    // body not required for drafts
    if (status === "draft") {
      delete errors.body;
    }

    // category_ids: when present and non-empty, must be a valid JSON array
    const categoryIds = data.category_ids;
    if (
      typeof categoryIds === "string" && categoryIds !== ""
    ) {
      try {
        const parsed = JSON.parse(categoryIds);
        if (!Array.isArray(parsed)) {
          errors.category_ids = "category_ids must be a valid JSON array";
        }
      } catch {
        errors.category_ids = "category_ids must be a valid JSON array";
      }
    }

    // Auto-fill published_at when publishing for the first time
    if (status === "published") {
      const publishedAt = data.published_at;
      if (
        !publishedAt ||
        (typeof publishedAt === "string" && publishedAt.trim() === "")
      ) {
        data.published_at = new Date().toISOString();
      }
    }

    return { valid: Object.keys(errors).length === 0, errors };
  }

  /**
   * Async validation that checks slug uniqueness via storage index.
   * Call after `validate()` passes synchronous checks.
   *
   * @param data - The post data to validate
   * @param excludeId - Item ID to exclude from uniqueness check (for updates)
   */
  public async validateAsync(
    data: Record<string, unknown>,
    excludeId?: string,
  ): Promise<{ valid: boolean; errors: Record<string, string> }> {
    const { valid, errors } = this.validate(data);
    if (!valid) return { valid, errors };

    const slug = data.slug as string;
    if (slug && "listByIndex" in this.storage) {
      const storage = this.storage as {
        listByIndex(
          field: string,
          value: string,
        ): Promise<StorageItem[]>;
      };
      const existing = await storage.listByIndex("slug", slug);
      const conflict = existing.find((item: StorageItem) =>
        item.id !== excludeId
      );
      if (conflict) {
        errors.slug = `slug "${slug}" is already in use`;
        return { valid: false, errors };
      }
    }

    return { valid: Object.keys(errors).length === 0, errors };
  }
}
