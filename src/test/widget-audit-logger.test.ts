import { describe, it } from "@std/testing/bdd";
import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { WidgetAuditLogger } from "../../packages/widgets/src/widgetAuditLogger.ts";
import { AuditLogPlugin } from "../../packages/admin/src/plugins/auditLogPlugin.ts";
import type { StorageItem } from "../../packages/core/src/models/Storage.ts";

function createAuditLogger(): {
  logger: WidgetAuditLogger;
  getEntries: () => Promise<StorageItem[]>;
} {
  const plugin = new AuditLogPlugin();
  const logger = new WidgetAuditLogger(plugin);
  const getEntries = () => plugin.storage.list();
  return { logger, getEntries };
}

describe("WidgetAuditLogger", () => {
  it("logCreate should register entry with action=create", async () => {
    const { logger, getEntries } = createAuditLogger();
    await logger.logCreate("page-1", "widget-1", "hero", "user-1", "admin");

    const entries = await getEntries();
    assertEquals(entries.length, 1);
    assertEquals(entries[0].action, "create");
    assertEquals(entries[0].resource, "widget");
    assertEquals(entries[0].resource_id, "widget-1");
    assertEquals(entries[0].user_id, "user-1");
    assertEquals(entries[0].username, "admin");
    assertStringIncludes(String(entries[0].details), "page:page-1");
    assertStringIncludes(String(entries[0].details), "type:hero");
  });

  it("logUpdate should register entry with action=update", async () => {
    const { logger, getEntries } = createAuditLogger();
    await logger.logUpdate("page-1", "widget-2", "user-1", "admin");

    const entries = await getEntries();
    assertEquals(entries.length, 1);
    assertEquals(entries[0].action, "update");
    assertEquals(entries[0].resource_id, "widget-2");
    assertStringIncludes(String(entries[0].details), "page:page-1");
  });

  it("logDelete should register entry with action=delete", async () => {
    const { logger, getEntries } = createAuditLogger();
    await logger.logDelete("page-1", "widget-3", "user-1", "admin");

    const entries = await getEntries();
    assertEquals(entries.length, 1);
    assertEquals(entries[0].action, "delete");
    assertEquals(entries[0].resource_id, "widget-3");
    assertStringIncludes(String(entries[0].details), "page:page-1");
  });

  it("logReorder should register entry with action=reorder", async () => {
    const { logger, getEntries } = createAuditLogger();
    await logger.logReorder("page-1", "user-1", "admin");

    const entries = await getEntries();
    assertEquals(entries.length, 1);
    assertEquals(entries[0].action, "reorder");
    assertEquals(entries[0].resource_id, "page-1");
    assertEquals(entries[0].resource, "widget");
  });

  it("logDuplicate should register entry with action=duplicate", async () => {
    const { logger, getEntries } = createAuditLogger();
    await logger.logDuplicate(
      "page-1",
      "original-1",
      "new-1",
      "user-1",
      "admin",
    );

    const entries = await getEntries();
    assertEquals(entries.length, 1);
    assertEquals(entries[0].action, "duplicate");
    assertEquals(entries[0].resource_id, "new-1");
    assertStringIncludes(String(entries[0].details), "page:page-1");
    assertStringIncludes(String(entries[0].details), "original:original-1");
  });

  it("all entries should have id, created_at, updated_at", async () => {
    const { logger, getEntries } = createAuditLogger();
    await logger.logCreate("p", "w", "hero", "u", "admin");

    const entries = await getEntries();
    assert(entries[0].id, "should have id");
    assert(entries[0].created_at, "should have created_at");
    assert(entries[0].updated_at, "should have updated_at");
  });

  it("all entries should have resource=widget", async () => {
    const { logger, getEntries } = createAuditLogger();
    await logger.logCreate("p", "w1", "hero", "u", "admin");
    await logger.logUpdate("p", "w2", "u", "admin");
    await logger.logDelete("p", "w3", "u", "admin");
    await logger.logReorder("p", "u", "admin");
    await logger.logDuplicate("p", "w4", "w5", "u", "admin");

    const entries = await getEntries();
    for (const entry of entries) {
      assertEquals(entry.resource, "widget");
    }
  });
});
