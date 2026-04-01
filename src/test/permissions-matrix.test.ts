import { describe, it } from "@std/testing/bdd";
import { assertSnapshot } from "@std/testing/snapshot";
import { renderToString } from "react-dom/server";
import { PermissionsMatrix } from "../../packages/admin/src/components/permissions-matrix.tsx";

describe("PermissionsMatrix snapshot", () => {
  it("should render matrix with roles and resources", async (t) => {
    const html = renderToString(
      PermissionsMatrix({
        matrix: {
          roles: [
            { slug: "admin", name: "Admin" },
            { slug: "editor", name: "Editor" },
          ],
          resources: ["posts", "pages"],
          permissions: {
            admin: {
              posts: ["read", "create", "update", "delete"],
              pages: ["read", "create", "update", "delete"],
            },
            editor: {
              posts: ["read", "create"],
              pages: ["read"],
            },
          },
        },
        csrfToken: "test-csrf",
      }),
    );
    await assertSnapshot(t, html);
  });

  it("should render empty matrix", async (t) => {
    const html = renderToString(
      PermissionsMatrix({
        matrix: {
          roles: [],
          resources: [],
          permissions: {},
        },
      }),
    );
    await assertSnapshot(t, html);
  });

  it("should render success alert", async (t) => {
    const html = renderToString(
      PermissionsMatrix({
        matrix: {
          roles: [{ slug: "admin", name: "Admin" }],
          resources: ["posts"],
          permissions: { admin: { posts: ["read"] } },
        },
        success: "Permissions saved successfully",
      }),
    );
    await assertSnapshot(t, html);
  });

  it("should render error alert", async (t) => {
    const html = renderToString(
      PermissionsMatrix({
        matrix: {
          roles: [{ slug: "admin", name: "Admin" }],
          resources: ["posts"],
          permissions: { admin: { posts: ["read"] } },
        },
        error: "Failed to save permissions",
      }),
    );
    await assertSnapshot(t, html);
  });
});
