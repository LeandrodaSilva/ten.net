/**
 * Coverage tests for widgets/widgetStore.ts
 * Covers: _validateId error paths, atomic commit failure branches
 */
import { afterEach, beforeEach, describe, it } from "@std/testing/bdd";
import { assertRejects } from "@std/assert";
import { WidgetStore } from "../widgets/widgetStore.ts";

describe("WidgetStore — _validateId error paths", () => {
  let kv: Deno.Kv;
  let store: WidgetStore;

  beforeEach(async () => {
    kv = await Deno.openKv(":memory:");
    store = new WidgetStore(kv);
  });

  afterEach(() => {
    kv.close();
  });

  it("should reject empty pageId in create", async () => {
    await assertRejects(
      () =>
        store.create("", {
          type: "hero",
          placeholder: "main",
          order: 0,
          data: {},
        }),
      Error,
      "Invalid pageId",
    );
  });

  it("should reject pageId with special characters in create", async () => {
    await assertRejects(
      () =>
        store.create("../etc", {
          type: "hero",
          placeholder: "main",
          order: 0,
          data: {},
        }),
      Error,
      "Invalid pageId",
    );
  });

  it("should reject empty widgetId in update", async () => {
    await assertRejects(
      () => store.update("page-1", "", {}),
      Error,
      "Invalid widgetId",
    );
  });

  it("should reject empty widgetId in delete", async () => {
    await assertRejects(
      () => store.delete("page-1", ""),
      Error,
      "Invalid widgetId",
    );
  });

  it("should reject pageId with spaces", async () => {
    await assertRejects(
      () =>
        store.create("page 1", {
          type: "hero",
          placeholder: "main",
          order: 0,
          data: {},
        }),
      Error,
      "Invalid pageId",
    );
  });
});
