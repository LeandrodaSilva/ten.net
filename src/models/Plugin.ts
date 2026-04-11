import { toSlug } from "../utils/toSlug.ts";
import { InMemoryStorage } from "./Storage.ts";
import type { Storage } from "./Storage.ts";
import type { SitemapContext, SitemapEntry } from "./Sitemap.ts";

/** Schema map describing a plugin's data model fields and their types. */
export type PluginModel = Record<
  string,
  "string" | "number" | "boolean" | "object"
>;

/**
 * Base class for Ten.net plugins. Extend this class and implement the
 * required properties to create a plugin with a data model and storage.
 */
export abstract class Plugin {
  /** Display name of the plugin. */
  abstract name: string;
  /** Short description shown in the admin dashboard. */
  abstract description: string;
  /** Data model schema for the plugin. */
  abstract model: PluginModel;
  /** Storage instance for this plugin's data. */
  public storage: Storage = new InMemoryStorage();

  protected constructor() {
    // Base constructor logic (if any)
  }

  /** Get the URL slug for this plugin. */
  get slug(): string {
    return toSlug(this.name);
  }

  /** Validate data against the plugin's model schema. */
  public validate(
    data: Record<string, unknown>,
  ): { valid: boolean; errors: Record<string, string> } {
    const errors: Record<string, string> = {};
    for (const [key, type] of Object.entries(this.model)) {
      const value = data[key];
      if (value === undefined || value === null || value === "") {
        if (type !== "boolean") {
          errors[key] = `${key} is required`;
        }
        continue;
      }
      if (type === "string" && typeof value !== "string") {
        errors[key] = `${key} must be a string`;
      }
      if (
        type === "number" && typeof value !== "number" && isNaN(Number(value))
      ) {
        errors[key] = `${key} must be a number`;
      }
      if (
        type === "boolean" && typeof value !== "boolean" && value !== "true" &&
        value !== "false"
      ) {
        errors[key] = `${key} must be a boolean`;
      }
    }
    return { valid: Object.keys(errors).length === 0, errors };
  }

  /**
   * Optional hook for plugins that can enumerate concrete, public sitemap URLs.
   *
   * Static plugin routes are discovered automatically via the framework route
   * registry. Override this when the plugin also manages dynamic public URLs
   * such as published pages or posts.
   */
  public getSitemapEntries(
    _context: SitemapContext,
  ): Promise<SitemapEntry[]> {
    return Promise.resolve([]);
  }
}
