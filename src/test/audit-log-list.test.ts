import { describe, it } from "@std/testing/bdd";
import { assertSnapshot } from "@std/testing/snapshot";
import { renderToString } from "react-dom/server";
import { AuditLogList } from "../../packages/admin/src/components/audit-log-list.tsx";

describe("AuditLogList snapshot", () => {
  it("should render empty state", async (t) => {
    const html = renderToString(
      AuditLogList({
        rows: [],
        total: 0,
        page: 1,
        totalPages: 0,
      }),
    );
    await assertSnapshot(t, html);
  });

  it("should render with audit entries", async (t) => {
    const html = renderToString(
      AuditLogList({
        rows: [
          {
            id: "log-1",
            timestamp: "2026-01-15T10:30:00.000Z",
            username: "admin",
            action: "create",
            resource: "post-plugin",
            resource_id: "post-abc123",
            details: '{"title":"New Post"}',
          },
          {
            id: "log-2",
            timestamp: "2026-01-15T11:00:00.000Z",
            username: "editor",
            action: "update",
            resource: "page-plugin",
            resource_id: "page-def456",
            details: "",
          },
          {
            id: "log-3",
            timestamp: "2026-01-15T12:00:00.000Z",
            username: "admin",
            action: "delete",
            resource: "category-plugin",
            resource_id: "cat-ghi789",
            details: "",
          },
        ],
        total: 3,
        page: 1,
        totalPages: 1,
        resources: ["post-plugin", "page-plugin", "category-plugin"],
      }),
    );
    await assertSnapshot(t, html);
  });

  it("should render with error alert", async (t) => {
    const html = renderToString(
      AuditLogList({
        rows: [],
        total: 0,
        page: 1,
        totalPages: 0,
        error: "Failed to load audit log",
      }),
    );
    await assertSnapshot(t, html);
  });

  it("should render with filters", async (t) => {
    const html = renderToString(
      AuditLogList({
        rows: [],
        total: 0,
        page: 1,
        totalPages: 0,
        filterAction: "create",
        filterResource: "post-plugin",
        resources: ["post-plugin", "page-plugin"],
      }),
    );
    await assertSnapshot(t, html);
  });
});
