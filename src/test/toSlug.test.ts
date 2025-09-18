import { describe, it } from "@std/testing/bdd";
import { assertEquals } from "@std/assert";
import { toSlug } from "../utils/toSlug.ts";

describe("toSlug", () => {
  it("should convert toSlug", () => {
    assertEquals(toSlug("toSlug"), "to-slug");
  });

  it("should preserve slug", () => {
    assertEquals(toSlug("to-slug"), "to-slug");
  });

  it("should handle spaces", () => {
    assertEquals(toSlug("to slug"), "to-slug");
  });

  it("should handle mixed case and spaces", () => {
    assertEquals(toSlug("To Slug Example"), "to-slug-example");
  });

  it("should handle special characters", () => {
    assertEquals(toSlug("to@slug!example#"), "to-slug-example");
  });

  it("should handle multiple special characters and spaces", () => {
    assertEquals(toSlug("  to@@@slug!!! example###  "), "to-slug-example");
  });

  it("should handle empty string", () => {
    assertEquals(toSlug(""), "");
  });

  it("should handle multiple hyphens", () => {
    assertEquals(toSlug("to---slug"), "to-slug");
  });

  it("should remove hyphens in begin and end", () => {
    assertEquals(toSlug("-to--slug-"), "to-slug");
  });

  it("should handle non-string input", () => {
    // @ts-ignore purposefully ignore type for testing
    assertEquals(toSlug(null), "");
    // @ts-ignore purposefully ignore type for testing
    assertEquals(toSlug(undefined), "");
    // @ts-ignore purposefully ignore type for testing
    assertEquals(toSlug(123), "123");
  });

  it("should handle underscores", () => {
    assertEquals(toSlug("to_slug_example"), "to-slug-example");
  });

  it("should handle camelCase", () => {
    assertEquals(toSlug("toSlugExample"), "to-slug-example");
  });

  it("should handle PascalCase", () => {
    assertEquals(toSlug("ToSlugExample"), "to-slug-example");
  });

  it("should handle mixed separators", () => {
    assertEquals(toSlug("to_Slug-Example Test"), "to-slug-example-test");
  });

  it("should handle numbers", () => {
    assertEquals(toSlug("Version 2.0 Release"), "version-2-0-release");
  });

  it("should handle leading and trailing spaces", () => {
    assertEquals(toSlug("   toSlugExample   "), "to-slug-example");
  });

  it("should handle only special chars", () => {
    assertEquals(toSlug("!@#$%^&*()"), "");
  });
});
