import { Plugin, type PluginModel } from "@leproj/tennet";
import type { StorageItem } from "@leproj/tennet";

/** Valid slug pattern: lowercase letters, numbers, hyphens. No leading/trailing hyphens. */
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Allowed page statuses. */
export type PageStatus = "draft" | "published";

const VALID_STATUSES: PageStatus[] = ["draft", "published"];

/** Fields that are optional (not required even for non-boolean types). */
const OPTIONAL_FIELDS = new Set([
  "seo_title",
  "seo_description",
  "template",
  "author_id",
]);

export class PagePlugin extends Plugin {
  name: string;
  description: string;
  model: PluginModel;

  constructor() {
    super();
    this.name = "PagePlugin";
    this.description = "Dynamic pages managed from the admin panel.";
    this.model = {
      title: "string",
      slug: "string",
      body: "string",
      status: "string",
      seo_title: "string",
      seo_description: "string",
      template: "string",
      author_id: "string",
      widgets_enabled: "boolean",
    };
  }

  /**
   * Synchronous validation for PagePlugin data.
   * Checks slug format, status values, body-on-publish rule,
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
          "slug must be lowercase alphanumeric with hyphens (e.g. my-page)";
      }
    }

    // status: must be draft or published
    const status = data.status;
    if (typeof status === "string" && status !== "") {
      if (!VALID_STATUSES.includes(status as PageStatus)) {
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

    return { valid: Object.keys(errors).length === 0, errors };
  }

  /**
   * Async validation that checks slug uniqueness via storage index.
   * Call after `validate()` passes synchronous checks.
   *
   * @param data - The page data to validate
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
