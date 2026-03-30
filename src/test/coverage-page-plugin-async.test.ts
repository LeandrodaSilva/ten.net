/**
 * Coverage tests for pagePlugin.ts — validateAsync slug uniqueness
 */
import { afterEach, beforeEach, describe, it } from "@std/testing/bdd";
import { assertEquals } from "@std/assert";
import { PagePlugin } from "../plugins/pagePlugin.ts";
import { DenoKvStorage } from "../storage/denoKvStorage.ts";

describe("PagePlugin.validateAsync — slug uniqueness", () => {
  let kv: Deno.Kv;
  let plugin: PagePlugin;

  beforeEach(async () => {
    kv = await Deno.openKv(":memory:");
    plugin = new PagePlugin();
    plugin.storage = new DenoKvStorage(kv, "page-plugin", plugin.model);
  });

  afterEach(() => {
    kv.close();
  });

  it("should pass when slug is unique", async () => {
    const result = await plugin.validateAsync({
      slug: "unique-slug",
      title: "Test",
      body: "<p>Content</p>",
      status: "draft",
      seo_title: "",
      seo_description: "",
      template: "",
      author_id: "",
      widgets_enabled: "false",
    });
    assertEquals(result.valid, true);
  });

  it("should fail when slug conflicts with existing item", async () => {
    // Create an existing page with this slug
    await plugin.storage.set("existing-1", {
      id: "existing-1",
      slug: "taken-slug",
      title: "Existing",
      body: "body",
      status: "draft",
      seo_title: "",
      seo_description: "",
      template: "",
      author_id: "",
      widgets_enabled: "false",
    });

    const result = await plugin.validateAsync({
      slug: "taken-slug",
      title: "New Page",
      body: "<p>Content</p>",
      status: "draft",
      seo_title: "",
      seo_description: "",
      template: "",
      author_id: "",
      widgets_enabled: "false",
    });
    assertEquals(result.valid, false);
    assertEquals(result.errors.slug, 'slug "taken-slug" is already in use');
  });

  it("should allow same slug when excludeId matches the existing item", async () => {
    await plugin.storage.set("existing-2", {
      id: "existing-2",
      slug: "my-slug",
      title: "Existing",
      body: "body",
      status: "draft",
      seo_title: "",
      seo_description: "",
      template: "",
      author_id: "",
      widgets_enabled: "false",
    });

    // Updating the same item — excludeId matches
    const result = await plugin.validateAsync(
      {
        slug: "my-slug",
        title: "Updated",
        body: "<p>Updated content</p>",
        status: "draft",
        seo_title: "",
        seo_description: "",
        template: "",
        author_id: "",
        widgets_enabled: "false",
      },
      "existing-2",
    );
    assertEquals(result.valid, true);
  });

  it("should fail sync validation before async check", async () => {
    const result = await plugin.validateAsync({
      slug: "INVALID SLUG!",
      title: "Test",
      body: "",
      status: "published",
      seo_title: "",
      seo_description: "",
      template: "",
      author_id: "",
    });
    assertEquals(result.valid, false);
    // Sync validation fails first
    assertEquals(result.errors.slug !== undefined, true);
  });
});
