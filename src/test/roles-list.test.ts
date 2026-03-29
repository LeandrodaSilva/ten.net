import { describe, it } from "@std/testing/bdd";
import { assertSnapshot } from "@std/testing/snapshot";
import { renderToString } from "react-dom/server";
import { RolesList } from "../admin/components/roles-list.tsx";

describe("RolesList snapshot", () => {
  it("should render empty state", async (t) => {
    const html = renderToString(
      RolesList({
        pluginName: "RolePlugin",
        pluginSlug: "role-plugin",
        rows: [],
        total: 0,
        page: 1,
        totalPages: 0,
      }),
    );
    await assertSnapshot(t, html);
  });

  it("should render with roles including system badges", async (t) => {
    const html = renderToString(
      RolesList({
        pluginName: "RolePlugin",
        pluginSlug: "role-plugin",
        rows: [
          {
            id: "role-1",
            name: "Admin",
            slug: "admin",
            description: "Full access to all resources",
            is_system: "true",
          },
          {
            id: "role-2",
            name: "Editor",
            slug: "editor",
            description: "Create and edit content",
            is_system: "true",
          },
          {
            id: "role-3",
            name: "Content Manager",
            slug: "content-manager",
            description: "Custom role",
            is_system: "false",
          },
        ],
        total: 3,
        page: 1,
        totalPages: 1,
        csrfToken: "test-csrf",
      }),
    );
    await assertSnapshot(t, html);
  });

  it("should render success alert", async (t) => {
    const html = renderToString(
      RolesList({
        pluginName: "RolePlugin",
        pluginSlug: "role-plugin",
        rows: [
          {
            id: "role-1",
            name: "Viewer",
            slug: "viewer",
            description: "Read-only access",
            is_system: "true",
          },
        ],
        total: 1,
        page: 1,
        totalPages: 1,
        success: "created",
      }),
    );
    await assertSnapshot(t, html);
  });

  it("should render error alert", async (t) => {
    const html = renderToString(
      RolesList({
        pluginName: "RolePlugin",
        pluginSlug: "role-plugin",
        rows: [],
        total: 0,
        page: 1,
        totalPages: 0,
        error: "Something went wrong",
      }),
    );
    await assertSnapshot(t, html);
  });
});
