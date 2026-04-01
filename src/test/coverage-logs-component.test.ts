/**
 * Coverage tests for admin/components/logs.tsx
 * Covers: relativeTime function + Logs component rendering (empty and with entries)
 */
import { describe, it } from "@std/testing/bdd";
import { assertEquals, assertStringIncludes } from "@std/assert";
import { renderToString } from "react-dom/server";
import React from "react";
import { Logs } from "../../packages/admin/src/components/logs.tsx";

describe("Logs component", () => {
  it("should render empty state when no entries", () => {
    const html = renderToString(React.createElement(Logs, { entries: [] }));
    assertStringIncludes(html, "No recent activity");
  });

  it("should render empty state when entries is undefined", () => {
    const html = renderToString(React.createElement(Logs, {}));
    assertStringIncludes(html, "No recent activity");
  });

  it("should render entries with create action icon", () => {
    const now = new Date().toISOString();
    const html = renderToString(
      React.createElement(Logs, {
        entries: [{
          action: "create",
          resource: "posts",
          resource_id: "1",
          username: "admin",
          timestamp: now,
        }],
      }),
    );
    assertStringIncludes(html, "admin");
    assertStringIncludes(html, "create");
    assertStringIncludes(html, "posts");
    assertStringIncludes(html, "text-green-500");
  });

  it("should render entries with update action icon", () => {
    const now = new Date().toISOString();
    const html = renderToString(
      React.createElement(Logs, {
        entries: [{
          action: "update",
          resource: "pages",
          resource_id: "2",
          username: "editor",
          timestamp: now,
        }],
      }),
    );
    assertStringIncludes(html, "text-yellow-500");
    assertStringIncludes(html, "update");
  });

  it("should render entries with delete action icon", () => {
    const now = new Date().toISOString();
    const html = renderToString(
      React.createElement(Logs, {
        entries: [{
          action: "delete",
          resource: "categories",
          resource_id: "3",
          username: "admin",
          timestamp: now,
        }],
      }),
    );
    assertStringIncludes(html, "text-red-500");
    assertStringIncludes(html, "delete");
  });

  it("should fallback to update icon for unknown action", () => {
    const now = new Date().toISOString();
    const html = renderToString(
      React.createElement(Logs, {
        entries: [{
          action: "custom_action",
          resource: "things",
          resource_id: "4",
          username: "admin",
          timestamp: now,
        }],
      }),
    );
    assertStringIncludes(html, "text-yellow-500");
  });

  it("should show 'just now' for recent timestamps", () => {
    const now = new Date().toISOString();
    const html = renderToString(
      React.createElement(Logs, {
        entries: [{
          action: "create",
          resource: "x",
          resource_id: "1",
          username: "admin",
          timestamp: now,
        }],
      }),
    );
    assertStringIncludes(html, "just now");
  });

  it("should show minutes ago for timestamps a few minutes old", () => {
    const date = new Date(Date.now() - 5 * 60 * 1000);
    const html = renderToString(
      React.createElement(Logs, {
        entries: [{
          action: "create",
          resource: "x",
          resource_id: "1",
          username: "admin",
          timestamp: date.toISOString(),
        }],
      }),
    );
    assertStringIncludes(html, "min ago");
  });

  it("should show hours ago for timestamps a few hours old", () => {
    const date = new Date(Date.now() - 3 * 60 * 60 * 1000);
    const html = renderToString(
      React.createElement(Logs, {
        entries: [{
          action: "create",
          resource: "x",
          resource_id: "1",
          username: "admin",
          timestamp: date.toISOString(),
        }],
      }),
    );
    assertStringIncludes(html, "h ago");
  });

  it("should show days ago for timestamps a few days old", () => {
    const date = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    const html = renderToString(
      React.createElement(Logs, {
        entries: [{
          action: "create",
          resource: "x",
          resource_id: "1",
          username: "admin",
          timestamp: date.toISOString(),
        }],
      }),
    );
    assertStringIncludes(html, "d ago");
  });

  it("should show formatted date for timestamps over 30 days old", () => {
    const date = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
    const html = renderToString(
      React.createElement(Logs, {
        entries: [{
          action: "create",
          resource: "x",
          resource_id: "1",
          username: "admin",
          timestamp: date.toISOString(),
        }],
      }),
    );
    // Should contain a month abbreviation (e.g., "Jan", "Feb", etc.)
    assertEquals(html.includes("d ago"), false);
  });

  it("should handle empty timestamp string", () => {
    const html = renderToString(
      React.createElement(Logs, {
        entries: [{
          action: "create",
          resource: "x",
          resource_id: "1",
          username: "admin",
          timestamp: "",
        }],
      }),
    );
    // Should not crash
    assertStringIncludes(html, "admin");
  });

  it("should handle invalid timestamp string", () => {
    const html = renderToString(
      React.createElement(Logs, {
        entries: [{
          action: "create",
          resource: "x",
          resource_id: "1",
          username: "admin",
          timestamp: "not-a-date",
        }],
      }),
    );
    assertStringIncludes(html, "not-a-date");
  });
});
