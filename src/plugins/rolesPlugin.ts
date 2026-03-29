import { Plugin, type PluginModel } from "../models/Plugin.ts";
import type { StorageItem } from "../models/Storage.ts";

/** Valid slug pattern: lowercase letters, numbers, hyphens. No leading/trailing hyphens. */
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Fields that are optional (not required even for non-boolean types). */
const OPTIONAL_FIELDS = new Set(["description"]);

export class RolesPlugin extends Plugin {
  name: string;
  description: string;
  model: PluginModel;

  constructor() {
    super();
    this.name = "RolePlugin";
    this.description = "Manage user roles for access control.";
    this.model = {
      name: "string",
      slug: "string",
      description: "string",
      is_system: "boolean",
    };
  }

  /**
   * Synchronous validation for RolesPlugin data.
   * Checks slug format, name required, is_system default false.
   */
  public override validate(
    data: Record<string, unknown>,
  ): { valid: boolean; errors: Record<string, string> } {
    // Default is_system to false if not provided
    if (
      data.is_system === undefined || data.is_system === null ||
      data.is_system === ""
    ) {
      data.is_system = "false";
    }

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
          "slug must be lowercase alphanumeric with hyphens (e.g. my-role)";
      }
    }

    return { valid: Object.keys(errors).length === 0, errors };
  }

  /**
   * Async validation that checks slug uniqueness via storage index.
   * Call after `validate()` passes synchronous checks.
   *
   * @param data - The role data to validate
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

  /**
   * Check if a role item is a system role (cannot be deleted).
   */
  public isSystemRole(item: StorageItem): boolean {
    return item.is_system === "true" || item.is_system === true;
  }
}
