import { describe, it } from "@std/testing/bdd";
import { assertEquals } from "@std/assert";
import {
  extractCandidates,
  extractCandidatesFromTs,
} from "../src/tailwind/scanner.ts";

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

  it("should extract classes from TS template literal strings", () => {
    const result = extractCandidates([
      'const html = `<a class="block rounded-xl px-3">X</a>`;',
    ]);
    assertEquals(result, ["block", "rounded-xl", "px-3"]);
  });

  it("should skip tokens with ${} interpolation", () => {
    const result = extractCandidates([
      '<div class="block ${foo} rounded">X</div>',
    ]);
    assertEquals(result, ["block", "rounded"]);
  });
});

describe("extractCandidatesFromTs", () => {
  it("should extract classes from a string literal variable", () => {
    const ts = 'const cls = "block rounded-xl px-3 py-2";';
    const result = extractCandidatesFromTs([ts]);
    assertEquals(result, ["block", "rounded-xl", "px-3", "py-2"]);
  });

  it("should extract classes referenced via interpolation in a template literal (buildNavHtml pattern)", () => {
    const ts = [
      "function build() {",
      '  const cls = "block rounded-xl px-3 py-2";',
      '  return `<a class="${cls}">X</a>`;',
      "}",
    ].join("\n");
    const result = extractCandidatesFromTs([ts]);
    for (const expected of ["block", "rounded-xl", "px-3", "py-2"]) {
      if (!result.includes(expected)) {
        throw new Error(
          `expected result to contain ${expected}, got ${
            JSON.stringify(result)
          }`,
        );
      }
    }
  });

  it("should skip tokens that contain ${} interpolation", () => {
    const ts = "const cls = `block ${foo} rounded`;";
    const result = extractCandidatesFromTs([ts]);
    assertEquals(result.includes("block"), true);
    assertEquals(result.includes("rounded"), true);
    for (const tok of result) {
      assertEquals(tok.includes("${"), false);
    }
  });

  it("should deduplicate across multiple sources", () => {
    const result = extractCandidatesFromTs([
      'const a = "flex p-4";',
      'const b = "p-4 text-center";',
    ]);
    assertEquals(result, ["flex", "p-4", "text-center"]);
  });

  it("should return empty array for sources without string literals", () => {
    assertEquals(extractCandidatesFromTs(["const x = 42;"]), []);
  });
});
