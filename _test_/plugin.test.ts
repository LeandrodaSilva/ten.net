import { describe, it } from "@std/testing/bdd";
import { assertEquals } from "@std/assert";
import { Plugin, type PluginModel } from "../src/models/Plugin.ts";

class TestPlugin extends Plugin {
  name = "Blog";
  description = "A test plugin";
  model: PluginModel = {
    title: "string",
    views: "number",
    active: "boolean",
  };
  constructor() {
    super();
  }
}

function makePlugin(model: PluginModel, name = "Blog"): Plugin {
  return new (class extends Plugin {
    name = name;
    description = "d";
    model = model;
    constructor() {
      super();
    }
  })();
}

describe("Plugin", () => {
  it("derives a URL slug from the name", () => {
    assertEquals(new TestPlugin().slug, "blog");
  });

  it("provides a default in-memory storage", async () => {
    const plugin = new TestPlugin();
    await plugin.storage.set("1", { id: "1", title: "Hi" });
    assertEquals((await plugin.storage.get("1"))?.title, "Hi");
  });

  it("returns no sitemap entries by default", async () => {
    assertEquals(await new TestPlugin().getSitemapEntries({} as never), []);
  });

  describe("validate", () => {
    it("accepts a fully valid object", () => {
      const result = new TestPlugin().validate({
        title: "Hello",
        views: 10,
        active: true,
      });
      assertEquals(result, { valid: true, errors: {} });
    });

    it("flags missing required string/number fields", () => {
      const result = new TestPlugin().validate({ active: true });
      assertEquals(result.valid, false);
      assertEquals(result.errors.title, "title is required");
      assertEquals(result.errors.views, "views is required");
    });

    it("treats empty string as missing", () => {
      const result = makePlugin({ title: "string" }).validate({ title: "" });
      assertEquals(result.errors.title, "title is required");
    });

    it("does not require boolean fields", () => {
      const result = makePlugin({ active: "boolean" }).validate({});
      assertEquals(result, { valid: true, errors: {} });
    });

    it("rejects a non-string for a string field", () => {
      const result = makePlugin({ title: "string" }).validate({ title: 42 });
      assertEquals(result.errors.title, "title must be a string");
    });

    it("rejects a non-numeric value for a number field", () => {
      const result = makePlugin({ views: "number" }).validate({ views: "abc" });
      assertEquals(result.errors.views, "views must be a number");
    });

    it("accepts a numeric string for a number field", () => {
      const result = makePlugin({ views: "number" }).validate({ views: "42" });
      assertEquals(result, { valid: true, errors: {} });
    });

    it("accepts 'true'/'false' strings for a boolean field", () => {
      assertEquals(
        makePlugin({ active: "boolean" }).validate({ active: "true" }).valid,
        true,
      );
      assertEquals(
        makePlugin({ active: "boolean" }).validate({ active: "false" }).valid,
        true,
      );
    });

    it("rejects a non-boolean value for a boolean field", () => {
      const result = makePlugin({ active: "boolean" }).validate({
        active: 123,
      });
      assertEquals(result.errors.active, "active must be a boolean");
    });
  });
});
