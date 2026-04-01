import { afterAll, beforeAll, describe, it } from "@std/testing/bdd";
import { assert, assertEquals } from "@std/assert";
import { WidgetPermissionsStore } from "../../packages/widgets/src/widgetPermissionsStore.ts";
import { registerBuiltinWidgets } from "../../packages/widgets/src/builtins/index.ts";

// Ensure widgets are registered so fallback logic works
registerBuiltinWidgets();

let kv: Deno.Kv;

beforeAll(async () => {
  kv = await Deno.openKv(":memory:");
});

afterAll(() => {
  kv.close();
});

describe("WidgetPermissionsStore", () => {
  it("canUse should return true for admin on any widget", async () => {
    const store = new WidgetPermissionsStore(kv);
    assertEquals(await store.canUse("admin", "html"), true);
    assertEquals(await store.canUse("admin", "embed"), true);
    assertEquals(await store.canUse("admin", "hero"), true);
    assertEquals(await store.canUse("admin", "columns"), true);
  });

  it("canUse should return false for editor on restricted widget without permission", async () => {
    const store = new WidgetPermissionsStore(kv);
    // html and embed are restricted
    assertEquals(await store.canUse("editor", "html"), false);
    assertEquals(await store.canUse("editor", "embed"), false);
  });

  it("canUse should return true for editor on non-restricted widgets", async () => {
    const store = new WidgetPermissionsStore(kv);
    assertEquals(await store.canUse("editor", "hero"), true);
    assertEquals(await store.canUse("editor", "rich-text"), true);
    assertEquals(await store.canUse("editor", "columns"), true);
  });

  it("setAllowed + canUse should grant permission to editor for restricted widget", async () => {
    const store = new WidgetPermissionsStore(kv);
    // Grant editor access to html
    await store.setAllowed("editor", "html", true);
    assertEquals(await store.canUse("editor", "html"), true);
  });

  it("setAllowed should be able to revoke permission", async () => {
    const store = new WidgetPermissionsStore(kv);
    // Revoke editor access to html
    await store.setAllowed("editor", "html", false);
    assertEquals(await store.canUse("editor", "html"), false);
  });

  it("getAllowedWidgets should return full list for admin", async () => {
    const store = new WidgetPermissionsStore(kv);
    const allowed = await store.getAllowedWidgets("admin");
    const types = allowed.map((d) => d.type);
    assert(types.includes("html"));
    assert(types.includes("embed"));
    assert(types.includes("hero"));
    assert(types.includes("columns"));
    assert(allowed.length >= 10);
  });

  it("getAllowedWidgets should filter restricted widgets for editor", async () => {
    // Clean up any previous setAllowed for editor
    await kv.delete(["widget-permissions", "editor", "html"]);
    await kv.delete(["widget-permissions", "editor", "embed"]);

    const store = new WidgetPermissionsStore(kv);
    const allowed = await store.getAllowedWidgets("editor");
    const types = allowed.map((d) => d.type);
    // editor should NOT have html and embed (restricted, no explicit grant)
    assert(!types.includes("html"), "editor should not have html");
    assert(!types.includes("embed"), "editor should not have embed");
    // but should have non-restricted widgets
    assert(types.includes("hero"));
    assert(types.includes("columns"));
  });

  it("fallback: unknown widget type should return true for any role", async () => {
    const store = new WidgetPermissionsStore(kv);
    // A widget type not in the registry — widgetRegistry.get returns null,
    // so def?.restricted is undefined → returns true
    assertEquals(
      await store.canUse("viewer", "custom:unknown" as never),
      true,
    );
  });
});
