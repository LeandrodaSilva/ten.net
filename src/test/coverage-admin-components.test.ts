/**
 * Coverage tests for admin components — uncovered rendering branches
 * Covers: audit-log-list formatTimestamp, form-field select/textarea/hint,
 *         crud-form Script block, crud-list Script block,
 *         data-table action form with csrfToken,
 *         pagination branches, roles-list pagination+Script,
 *         permissions-matrix rendering, widget-form all field types
 */
import { describe, it } from "@std/testing/bdd";
import { assertEquals, assertStringIncludes } from "@std/assert";
import { renderToString } from "react-dom/server";

import { AuditLogList } from "../../packages/admin/src/components/audit-log-list.tsx";
import { FormField } from "../../packages/admin/src/components/form-field.tsx";
import { CrudForm } from "../../packages/admin/src/components/crud-form.tsx";
import { CrudList } from "../../packages/admin/src/components/crud-list.tsx";
import { DataTable } from "../../packages/admin/src/components/data-table.tsx";
import { Pagination } from "../../packages/admin/src/components/pagination.tsx";
import { RolesList } from "../../packages/admin/src/components/roles-list.tsx";
import { PermissionsMatrix } from "../../packages/admin/src/components/permissions-matrix.tsx";
import {
  WidgetCard,
  WidgetForm,
  WidgetTypeSelector,
} from "../../packages/admin/src/components/widget-form.tsx";
import type {
  WidgetDefinition,
  WidgetInstance,
} from "../../packages/widgets/src/types.ts";

describe("AuditLogList — formatTimestamp branches", () => {
  it("should render with entries and format valid timestamp", () => {
    const html = renderToString(
      AuditLogList({
        rows: [{
          id: "1",
          action: "create",
          resource: "posts",
          resource_id: "p1",
          user_id: "u1",
          username: "admin",
          timestamp: "2025-01-15T12:00:00Z",
        }],
        total: 1,
        page: 1,
        totalPages: 1,
      }),
    );
    assertStringIncludes(html, "admin");
    assertStringIncludes(html, "Jan");
  });

  it("should handle empty timestamp", () => {
    const html = renderToString(
      AuditLogList({
        rows: [{
          id: "2",
          action: "update",
          resource: "pages",
          resource_id: "p2",
          user_id: "u1",
          username: "editor",
          timestamp: "",
        }],
        total: 1,
        page: 1,
        totalPages: 1,
      }),
    );
    assertStringIncludes(html, "editor");
  });

  it("should handle invalid timestamp", () => {
    const html = renderToString(
      AuditLogList({
        rows: [{
          id: "3",
          action: "delete",
          resource: "categories",
          resource_id: "c1",
          user_id: "u1",
          username: "admin",
          timestamp: "not-a-date",
        }],
        total: 1,
        page: 1,
        totalPages: 1,
      }),
    );
    assertStringIncludes(html, "not-a-date");
  });

  it("should render empty state when no rows", () => {
    const html = renderToString(
      AuditLogList({
        rows: [],
        total: 0,
        page: 1,
        totalPages: 0,
      }),
    );
    assertStringIncludes(html, "No audit log entries");
  });

  it("should render with pagination when totalPages > 1", () => {
    const rows = Array.from({ length: 20 }, (_, i) => ({
      id: `${i}`,
      action: "create",
      resource: "posts",
      resource_id: `p${i}`,
      user_id: "u1",
      username: "admin",
      timestamp: "2025-01-15T12:00:00Z",
    }));
    const html = renderToString(
      AuditLogList({
        rows,
        total: 40,
        page: 1,
        totalPages: 2,
      }),
    );
    assertStringIncludes(html, "Showing");
  });
});

describe("FormField — select and textarea branches", () => {
  it("should render a select field with options", () => {
    const html = renderToString(
      FormField({
        name: "status",
        label: "Status",
        type: "select",
        required: true,
        options: [
          { value: "draft", label: "Draft" },
          { value: "published", label: "Published" },
        ],
      }),
    );
    assertStringIncludes(html, "<select");
    assertStringIncludes(html, "Draft");
  });

  it("should render a multiple select field with JSON array value", () => {
    const html = renderToString(
      FormField({
        name: "tags",
        label: "Tags",
        type: "select",
        multiple: true,
        options: [
          { value: "a", label: "A" },
          { value: "b", label: "B" },
        ],
        value: '["a"]',
      }),
    );
    assertStringIncludes(html, "multiple");
    assertStringIncludes(html, "tags[]");
  });

  it("should render a textarea field with rows", () => {
    const html = renderToString(
      FormField({
        name: "body",
        label: "Body",
        type: "textarea",
        rows: 10,
      }),
    );
    assertStringIncludes(html, "<textarea");
  });

  it("should render with error message", () => {
    const html = renderToString(
      FormField({
        name: "title",
        label: "Title",
        type: "text",
        error: "Title is required",
      }),
    );
    assertStringIncludes(html, "Title is required");
  });

  it("should render checkbox for boolean type with hint", () => {
    const html = renderToString(
      FormField({
        name: "active",
        label: "Active",
        type: "checkbox",
        hint: "Enable this item",
      }),
    );
    assertStringIncludes(html, 'type="checkbox"');
    assertStringIncludes(html, "Enable this item");
  });

  it("should render text field with hint", () => {
    const html = renderToString(
      FormField({
        name: "published_at",
        label: "Published At",
        type: "text",
        readonly: true,
        hint: "Auto-filled on first publish",
      }),
    );
    assertStringIncludes(html, "Auto-filled on first publish");
  });
});

describe("CrudForm — Script block coverage", () => {
  it("should render form with edit mode and csrf token", () => {
    const html = renderToString(
      CrudForm({
        pluginName: "Posts",
        pluginSlug: "post-plugin",
        fields: [
          { name: "title", label: "Title", type: "text", required: true },
        ],
        values: { title: "Hello" },
        isEdit: true,
        action: "/admin/plugins/post-plugin/123",
        csrfToken: "test-csrf",
      }),
    );
    assertStringIncludes(html, "Save");
    assertStringIncludes(html, "test-csrf");
  });

  it("should render form with create mode", () => {
    const html = renderToString(
      CrudForm({
        pluginName: "Posts",
        pluginSlug: "post-plugin",
        fields: [
          { name: "title", label: "Title", type: "text", required: true },
        ],
        isEdit: false,
        action: "/admin/plugins/post-plugin",
      }),
    );
    assertStringIncludes(html, "Create");
  });
});

describe("CrudList — Script block coverage", () => {
  it("should render list with items and pagination", () => {
    const html = renderToString(
      CrudList({
        pluginName: "Posts",
        pluginSlug: "post-plugin",
        columns: [{ key: "title", label: "Title" }],
        rows: [{ id: "1", title: "Post 1" }],
        total: 50,
        page: 1,
        totalPages: 3,
        csrfToken: "csrf-123",
      }),
    );
    assertStringIncludes(html, "Post 1");
  });
});

describe("DataTable — action form with csrfToken", () => {
  it("should render action forms with csrf hidden field", () => {
    const html = renderToString(
      DataTable({
        title: "Items",
        description: "Manage items",
        columns: [{ key: "name", label: "Name" }],
        rows: [{ id: "1", name: "Test" }],
        actions: [
          {
            label: "Delete",
            href: (row: Record<string, unknown>) =>
              `/admin/plugins/test/${row.id}/delete`,
            variant: "danger",
            confirmMessage: () => "Are you sure?",
          },
        ],
        csrfToken: "my-csrf",
      }),
    );
    assertStringIncludes(html, "my-csrf");
    assertStringIncludes(html, "Delete");
  });
});

describe("Pagination — edge cases", () => {
  it("should return null for totalPages <= 1", () => {
    const result = Pagination({
      currentPage: 1,
      totalPages: 1,
      totalItems: 5,
      pageSize: 20,
      baseHref: "/admin/test",
    });
    assertEquals(result, null);
  });

  it("should render with ellipsis for many pages", () => {
    const html = renderToString(
      Pagination({
        currentPage: 5,
        totalPages: 10,
        totalItems: 200,
        pageSize: 20,
        baseHref: "/admin/test",
      })!,
    );
    assertStringIncludes(html, "...");
    assertStringIncludes(html, "Showing");
  });

  it("should handle baseHref with existing query params", () => {
    const html = renderToString(
      Pagination({
        currentPage: 2,
        totalPages: 3,
        totalItems: 60,
        pageSize: 20,
        baseHref: "/admin/test?search=foo",
      })!,
    );
    assertStringIncludes(html, "&amp;page=");
  });

  it("should disable previous on first page", () => {
    const html = renderToString(
      Pagination({
        currentPage: 1,
        totalPages: 3,
        totalItems: 60,
        pageSize: 20,
        baseHref: "/admin/test",
      })!,
    );
    assertStringIncludes(html, "pointer-events-none");
  });

  it("should disable next on last page", () => {
    const html = renderToString(
      Pagination({
        currentPage: 3,
        totalPages: 3,
        totalItems: 60,
        pageSize: 20,
        baseHref: "/admin/test",
      })!,
    );
    // The last "Next" link should have pointer-events-none
    assertStringIncludes(html, "pointer-events-none");
  });
});

describe("RolesList — pagination and Script coverage", () => {
  it("should render roles list with pagination when totalPages > 1", () => {
    const rows = Array.from({ length: 20 }, (_, i) => ({
      id: `role-${i}`,
      name: `Role ${i}`,
      slug: `role-${i}`,
      description: `Description ${i}`,
    }));
    const html = renderToString(
      RolesList({
        pluginName: "Roles",
        pluginSlug: "roles-plugin",
        rows,
        total: 40,
        page: 1,
        totalPages: 2,
      }),
    );
    assertStringIncludes(html, "Role 0");
    assertStringIncludes(html, "Showing");
  });

  it("should render empty state when no roles", () => {
    const html = renderToString(
      RolesList({
        pluginName: "Roles",
        pluginSlug: "roles-plugin",
        rows: [],
        total: 0,
        page: 1,
        totalPages: 0,
      }),
    );
    assertStringIncludes(html, "No roles");
  });
});

describe("PermissionsMatrix", () => {
  it("should render the matrix with roles and resources", () => {
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
              posts: ["create", "read", "update", "delete"],
              pages: ["create", "read"],
            },
            editor: {
              posts: ["read"],
              pages: ["read"],
            },
          },
        },
        csrfToken: "csrf-tok",
      }),
    );
    assertStringIncludes(html, "Admin");
    assertStringIncludes(html, "Editor");
    assertStringIncludes(html, "posts");
    assertStringIncludes(html, "pages");
  });
});

describe("WidgetForm — all field types", () => {
  const makeDef = (
    fields: WidgetDefinition["fields"],
  ): WidgetDefinition => ({
    type: "hero",
    label: "Test",
    description: "Test widget",
    icon: "T",
    fields,
    defaultPlaceholder: "main",
    render: () => "",
  });

  it("should render text field", () => {
    const html = renderToString(
      WidgetForm({
        widgetDefinition: makeDef([
          { name: "title", label: "Title", type: "text", required: true },
        ]),
      }),
    );
    assertStringIncludes(html, 'type="text"');
  });

  it("should render textarea field", () => {
    const html = renderToString(
      WidgetForm({
        widgetDefinition: makeDef([
          { name: "content", label: "Content", type: "textarea" },
        ]),
      }),
    );
    assertStringIncludes(html, "<textarea");
  });

  it("should render rich-text field", () => {
    const html = renderToString(
      WidgetForm({
        widgetDefinition: makeDef([
          { name: "body", label: "Body", type: "rich-text", required: true },
        ]),
      }),
    );
    assertStringIncludes(html, "widget-rich-text");
  });

  it("should render TipTap wrapper (widget-tiptap-wrap)", () => {
    const html = renderToString(
      WidgetForm({
        widgetDefinition: makeDef([
          { name: "body", label: "Body", type: "rich-text" },
        ]),
      }),
    );
    assertStringIncludes(html, "widget-tiptap-wrap");
  });

  it("should render TipTap toolbar with action buttons", () => {
    const html = renderToString(
      WidgetForm({
        widgetDefinition: makeDef([
          { name: "body", label: "Body", type: "rich-text" },
        ]),
      }),
    );
    assertStringIncludes(html, "widget-tiptap-toolbar");
    assertStringIncludes(html, 'data-action="bold"');
    assertStringIncludes(html, 'data-action="italic"');
    assertStringIncludes(html, 'data-action="h2"');
    assertStringIncludes(html, 'data-action="h3"');
    assertStringIncludes(html, 'data-action="bulletList"');
    assertStringIncludes(html, 'data-action="orderedList"');
    assertStringIncludes(html, 'data-action="blockquote"');
    assertStringIncludes(html, 'data-action="codeBlock"');
    assertStringIncludes(html, 'data-action="link"');
    assertStringIncludes(html, 'data-action="image"');
  });

  it("should render TipTap editor container with data-field", () => {
    const html = renderToString(
      WidgetForm({
        widgetDefinition: makeDef([
          { name: "body", label: "Body", type: "rich-text" },
        ]),
      }),
    );
    assertStringIncludes(html, "widget-tiptap-editor");
    assertStringIncludes(html, 'data-field="data.body"');
  });

  it("should hide textarea with display:none for rich-text", () => {
    const html = renderToString(
      WidgetForm({
        widgetDefinition: makeDef([
          { name: "body", label: "Body", type: "rich-text" },
        ]),
      }),
    );
    assertStringIncludes(html, "display:none");
  });

  it("should include TipTap esm.sh imports in script", () => {
    const html = renderToString(
      WidgetForm({
        widgetDefinition: makeDef([
          { name: "body", label: "Body", type: "rich-text" },
        ]),
      }),
    );
    assertStringIncludes(html, "esm.sh/@tiptap/core");
    assertStringIncludes(html, "esm.sh/@tiptap/starter-kit");
    assertStringIncludes(html, "esm.sh/@tiptap/extension-image");
  });

  it("should reference widget-tiptap-editor in initialization script", () => {
    const html = renderToString(
      WidgetForm({
        widgetDefinition: makeDef([
          { name: "body", label: "Body", type: "rich-text" },
        ]),
      }),
    );
    assertStringIncludes(html, "widget-tiptap-editor");
  });

  it("should render select field with options", () => {
    const html = renderToString(
      WidgetForm({
        widgetDefinition: makeDef([
          {
            name: "color",
            label: "Color",
            type: "select",
            options: ["red", "blue"],
          },
        ]),
      }),
    );
    assertStringIncludes(html, "<select");
    assertStringIncludes(html, "red");
  });

  it("should render image field as URL input", () => {
    const html = renderToString(
      WidgetForm({
        widgetDefinition: makeDef([
          { name: "src", label: "Image", type: "image" },
        ]),
      }),
    );
    assertStringIncludes(html, 'type="url"');
    assertStringIncludes(html, "Image URL");
  });

  it("should render url field", () => {
    const html = renderToString(
      WidgetForm({
        widgetDefinition: makeDef([
          { name: "link", label: "Link", type: "url" },
        ]),
      }),
    );
    assertStringIncludes(html, 'type="url"');
  });

  it("should render number field", () => {
    const html = renderToString(
      WidgetForm({
        widgetDefinition: makeDef([
          { name: "count", label: "Count", type: "number" },
        ]),
      }),
    );
    assertStringIncludes(html, 'type="number"');
  });

  it("should resolve field values from provided values", () => {
    const html = renderToString(
      WidgetForm({
        widgetDefinition: makeDef([
          { name: "title", label: "Title", type: "text", default: "fallback" },
        ]),
        values: { title: "Custom Value" },
      }),
    );
    assertStringIncludes(html, "Custom Value");
  });

  it("should use default value when no values provided", () => {
    const html = renderToString(
      WidgetForm({
        widgetDefinition: makeDef([
          {
            name: "title",
            label: "Title",
            type: "text",
            default: "Default Title",
          },
        ]),
      }),
    );
    assertStringIncludes(html, "Default Title");
  });
});

describe("WidgetTypeSelector", () => {
  it("should render widget type options with icons", () => {
    const html = renderToString(
      WidgetTypeSelector({
        availableWidgets: [
          {
            type: "hero",
            label: "Hero",
            description: "Hero widget",
            icon: "H",
            fields: [],
            defaultPlaceholder: "main",
            render: () => "",
          },
          {
            type: "rich-text",
            label: "Rich Text",
            description: "RT",
            icon: "",
            fields: [],
            defaultPlaceholder: "main",
            render: () => "",
          },
        ],
        selectedType: "hero",
      }),
    );
    assertStringIncludes(html, "Hero");
    assertStringIncludes(html, "Rich Text");
  });
});

describe("WidgetCard", () => {
  it("should render widget card with definition and icon", () => {
    const widget: WidgetInstance = {
      id: "w1",
      type: "hero",
      placeholder: "main",
      order: 0,
      data: { heading: "Hello World" },
      created_at: "",
      updated_at: "",
    };
    const definition: WidgetDefinition = {
      type: "hero",
      label: "Hero",
      description: "Hero widget",
      icon: "H",
      fields: [],
      defaultPlaceholder: "main",
      render: () => "",
    };
    const html = renderToString(
      WidgetCard({
        widget,
        definition,
        editHref: "/admin/pages/p1/widgets/w1",
        deleteAction: "/admin/pages/p1/widgets/w1/delete",
        csrfToken: "csrf",
      }),
    );
    assertStringIncludes(html, "Hero");
    assertStringIncludes(html, "heading: Hello World");
    assertStringIncludes(html, "Edit");
    assertStringIncludes(html, "Delete");
    assertStringIncludes(html, "csrf");
  });

  it("should render widget card without definition (null)", () => {
    const widget: WidgetInstance = {
      id: "w2",
      type: "custom:unknown",
      placeholder: "sidebar",
      order: 1,
      data: {
        value:
          "A very long value that should be truncated after thirty characters exactly yes",
      },
      created_at: "",
      updated_at: "",
    };
    const html = renderToString(
      WidgetCard({
        widget,
        definition: null,
        editHref: "/admin/pages/p1/widgets/w2",
        deleteAction: "/admin/pages/p1/widgets/w2/delete",
      }),
    );
    assertStringIncludes(html, "custom:unknown");
    assertStringIncludes(html, "...");
  });

  it("should render widget card with definition without icon", () => {
    const widget: WidgetInstance = {
      id: "w3",
      type: "rich-text",
      placeholder: "main",
      order: 0,
      data: {},
      created_at: "",
      updated_at: "",
    };
    const definition: WidgetDefinition = {
      type: "rich-text",
      label: "Rich Text",
      description: "Rich text widget",
      icon: "",
      fields: [],
      defaultPlaceholder: "main",
      render: () => "",
    };
    const html = renderToString(
      WidgetCard({
        widget,
        definition,
        editHref: "/edit",
        deleteAction: "/delete",
      }),
    );
    assertStringIncludes(html, "Rich Text");
  });
});
