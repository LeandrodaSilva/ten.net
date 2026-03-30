/**
 * Coverage tests for models/Plugin.ts — validate() number and boolean branches
 * Uses PagePlugin (has boolean field) and tests edge cases for base validate method.
 */
import { describe, it } from "@std/testing/bdd";
import { assertEquals } from "@std/assert";
import { PagePlugin } from "../plugins/pagePlugin.ts";
import { RolesPlugin } from "../plugins/rolesPlugin.ts";

describe("Plugin.validate() — boolean field handling via PagePlugin", () => {
  it("should not require boolean fields (widgets_enabled can be empty)", () => {
    const plugin = new PagePlugin();
    const result = plugin.validate({
      slug: "test",
      title: "Test",
      body: "content",
      status: "draft",
      seo_title: "",
      seo_description: "",
      template: "",
      author_id: "",
      // widgets_enabled is missing — should be ok because boolean fields are not required
    });
    assertEquals(result.errors.widgets_enabled, undefined);
  });

  it("should accept 'true' string for boolean field", () => {
    const plugin = new PagePlugin();
    const result = plugin.validate({
      slug: "test",
      title: "Test",
      body: "content",
      status: "draft",
      seo_title: "",
      seo_description: "",
      template: "",
      author_id: "",
      widgets_enabled: "true",
    });
    assertEquals(result.errors.widgets_enabled, undefined);
  });

  it("should accept 'false' string for boolean field", () => {
    const plugin = new PagePlugin();
    const result = plugin.validate({
      slug: "test",
      title: "Test",
      body: "content",
      status: "draft",
      seo_title: "",
      seo_description: "",
      template: "",
      author_id: "",
      widgets_enabled: "false",
    });
    assertEquals(result.errors.widgets_enabled, undefined);
  });

  it("should accept actual boolean value for boolean field", () => {
    const plugin = new PagePlugin();
    const result = plugin.validate({
      slug: "test",
      title: "Test",
      body: "content",
      status: "draft",
      seo_title: "",
      seo_description: "",
      template: "",
      author_id: "",
      widgets_enabled: true,
    });
    assertEquals(result.errors.widgets_enabled, undefined);
  });

  it("should reject invalid value for boolean field", () => {
    const plugin = new PagePlugin();
    const result = plugin.validate({
      slug: "test",
      title: "Test",
      body: "content",
      status: "draft",
      seo_title: "",
      seo_description: "",
      template: "",
      author_id: "",
      widgets_enabled: "maybe",
    });
    assertEquals(
      result.errors.widgets_enabled,
      "widgets_enabled must be a boolean",
    );
  });
});

describe("Plugin.validate() — RolesPlugin boolean field (is_system)", () => {
  it("should accept boolean for is_system", () => {
    const plugin = new RolesPlugin();
    const result = plugin.validate({
      name: "Admin",
      slug: "admin",
      description: "Full access",
      is_system: "true",
    });
    assertEquals(result.errors.is_system, undefined);
  });

  it("should reject non-string for string field", () => {
    const plugin = new RolesPlugin();
    const result = plugin.validate({
      name: 123,
      slug: "admin",
      description: "Full access",
      is_system: "true",
    });
    assertEquals(result.errors.name, "name must be a string");
  });

  it("should reject null for required string fields", () => {
    const plugin = new RolesPlugin();
    const result = plugin.validate({
      name: null,
      slug: null,
      description: null,
    });
    assertEquals(result.errors.name, "name is required");
    assertEquals(result.errors.slug, "slug is required");
    // description is optional in RolesPlugin
    assertEquals(result.errors.description, undefined);
  });
});
