/**
 * Tests for page form improvements:
 * 1. PagePlugin model field order (title before slug)
 * 2. buildFormFields config for PagePlugin (textarea, select)
 * 3. CrudForm auto-slug script inclusion
 */
import { describe, it } from "@std/testing/bdd";
import { assertEquals, assertStringIncludes } from "@std/assert";
import { renderToString } from "react-dom/server";
import { PagePlugin } from "../../packages/admin/src/plugins/pagePlugin.ts";
import { buildFormFields } from "../../packages/admin/src/plugins/admin/forms.tsx";
import { CrudForm } from "../../packages/admin/src/components/crud-form.tsx";

describe("PagePlugin model field order", () => {
  it("should have title as first field and slug as second field", () => {
    const plugin = new PagePlugin();
    const keys = Object.keys(plugin.model);
    assertEquals(keys[0], "title");
    assertEquals(keys[1], "slug");
  });

  it("should have title before slug in model keys", () => {
    const plugin = new PagePlugin();
    const keys = Object.keys(plugin.model);
    const titleIndex = keys.indexOf("title");
    const slugIndex = keys.indexOf("slug");
    assertEquals(titleIndex < slugIndex, true);
  });
});

describe("buildFormFields for PagePlugin", () => {
  it("should return fields in model order (title first)", async () => {
    const plugin = new PagePlugin();
    const fields = await buildFormFields(plugin, []);
    assertEquals(fields[0].name, "title");
    assertEquals(fields[1].name, "slug");
  });

  it("should configure status as select with draft/published options", async () => {
    const plugin = new PagePlugin();
    const fields = await buildFormFields(plugin, []);
    const statusField = fields.find((f) => f.name === "status");
    assertEquals(statusField?.type, "select");
    assertEquals(statusField?.options, [
      { value: "draft", label: "Draft" },
      { value: "published", label: "Published" },
    ]);
  });

  it("should configure body as textarea", async () => {
    const plugin = new PagePlugin();
    const fields = await buildFormFields(plugin, []);
    const bodyField = fields.find((f) => f.name === "body");
    assertEquals(bodyField?.type, "textarea");
    assertEquals(bodyField?.rows, 10);
  });
});

describe("CrudForm auto-slug script", () => {
  it("should include auto-slug script when title and slug fields are present", () => {
    const html = renderToString(
      CrudForm({
        pluginName: "PagePlugin",
        pluginSlug: "page-plugin",
        fields: [
          { name: "title", label: "Title", type: "text", required: true },
          { name: "slug", label: "Slug", type: "text", required: true },
        ],
        action: "/admin/plugins/page-plugin",
      }),
    );
    assertStringIncludes(html, 'getElementById("title")');
    assertStringIncludes(html, 'getElementById("slug")');
    assertStringIncludes(html, "slugManuallyEdited");
  });

  it("should include slug generation logic in the script", () => {
    const html = renderToString(
      CrudForm({
        pluginName: "PagePlugin",
        pluginSlug: "page-plugin",
        fields: [
          { name: "title", label: "Title", type: "text", required: true },
          { name: "slug", label: "Slug", type: "text", required: true },
        ],
        action: "/admin/plugins/page-plugin",
      }),
    );
    // Verify the slug transformation logic is present
    assertStringIncludes(html, "toLowerCase");
    assertStringIncludes(html, "trim");
  });
});
