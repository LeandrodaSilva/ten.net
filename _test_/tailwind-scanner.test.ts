import { describe, it } from "@std/testing/bdd";
import { assertEquals } from "@std/assert";
import { extractCandidates } from "../src/tailwind/scanner.ts";

describe("extractCandidates", () => {
  it("should extract classes from simple HTML", () => {
    const result = extractCandidates(['<div class="flex p-4">hello</div>']);
    assertEquals(result, ["flex", "p-4"]);
  });

  it("should deduplicate classes across multiple HTMLs", () => {
    const result = extractCandidates([
      '<div class="flex p-4">one</div>',
      '<span class="p-4 text-center">two</span>',
    ]);
    assertEquals(result, ["flex", "p-4", "text-center"]);
  });

  it("should ignore {{placeholder}} tokens", () => {
    const result = extractCandidates([
      '<div class="flex {{dynamicClasses}} p-4">test</div>',
    ]);
    assertEquals(result, ["flex", "p-4"]);
  });

  it("should return empty array for empty HTML", () => {
    assertEquals(extractCandidates([""]), []);
  });

  it("should return empty array for HTML without classes", () => {
    assertEquals(extractCandidates(["<div>no classes</div>"]), []);
  });

  it("should return empty array for empty input array", () => {
    assertEquals(extractCandidates([]), []);
  });

  it("should extract classes with Tailwind prefixes", () => {
    const result = extractCandidates([
      '<div class="hover:bg-blue-500 lg:flex data-closed:hidden aria-selected:font-bold">test</div>',
    ]);
    assertEquals(result, [
      "hover:bg-blue-500",
      "lg:flex",
      "data-closed:hidden",
      "aria-selected:font-bold",
    ]);
  });

  it("should handle single-quoted class attributes", () => {
    const result = extractCandidates([
      "<div class='flex gap-2'>test</div>",
    ]);
    assertEquals(result, ["flex", "gap-2"]);
  });

  it("should handle double-quoted class attributes", () => {
    const result = extractCandidates([
      '<div class="flex gap-2">test</div>',
    ]);
    assertEquals(result, ["flex", "gap-2"]);
  });

  it("should extract from multiple class attributes in same HTML", () => {
    const result = extractCandidates([
      '<div class="flex"><span class="p-4 text-sm">test</span></div>',
    ]);
    assertEquals(result, ["flex", "p-4", "text-sm"]);
  });
});
