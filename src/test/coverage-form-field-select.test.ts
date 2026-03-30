/**
 * Coverage tests for form-field.tsx select multiple value branches
 */
import { describe, it } from "@std/testing/bdd";
import { assertStringIncludes } from "@std/assert";
import { renderToString } from "react-dom/server";
import { FormField } from "../admin/components/form-field.tsx";

describe("FormField select multiple — defaultValue branches", () => {
  const options = [
    { value: "a", label: "A" },
    { value: "b", label: "B" },
    { value: "c", label: "C" },
  ];

  it("should handle multiple select with JSON array value", () => {
    const html = renderToString(
      FormField({
        name: "cats",
        label: "Categories",
        type: "select",
        multiple: true,
        options,
        value: '["a","b"]',
      }),
    );
    assertStringIncludes(html, "multiple");
    assertStringIncludes(html, "cats[]");
  });

  it("should handle multiple select with non-JSON string value", () => {
    const html = renderToString(
      FormField({
        name: "cats",
        label: "Categories",
        type: "select",
        multiple: true,
        options,
        value: "a",
      }),
    );
    assertStringIncludes(html, "multiple");
  });

  it("should handle multiple select with empty value", () => {
    const html = renderToString(
      FormField({
        name: "cats",
        label: "Categories",
        type: "select",
        multiple: true,
        options,
        value: "",
      }),
    );
    assertStringIncludes(html, "multiple");
  });

  it("should handle multiple select with undefined value", () => {
    const html = renderToString(
      FormField({
        name: "cats",
        label: "Categories",
        type: "select",
        multiple: true,
        options,
      }),
    );
    assertStringIncludes(html, "multiple");
  });
});
