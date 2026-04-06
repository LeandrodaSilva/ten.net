import { describe, it } from "@std/testing/bdd";
import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { hasTailwindCdn, injectTailwindCss } from "../src/tailwind/inject.ts";

const DOC_WITH_CDN = `<!DOCTYPE html>
<html>
  <head>
    <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
    <title>Test</title>
  </head>
  <body>{{content}}</body>
</html>`;

const DOC_WITHOUT_CDN = `<!DOCTYPE html>
<html>
  <head>
    <title>Test</title>
  </head>
  <body>{{content}}</body>
</html>`;

const DOC_WITH_PLUS_ELEMENTS = `<!DOCTYPE html>
<html>
  <head>
    <script src="https://cdn.jsdelivr.net/npm/@tailwindplus/elements@1" type="module"></script>
    <title>Test</title>
  </head>
  <body>{{content}}</body>
</html>`;

const DOC_WITH_BOTH = `<!DOCTYPE html>
<html>
  <head>
    <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
    <script src="https://cdn.jsdelivr.net/npm/@tailwindplus/elements@1" type="module"></script>
    <title>Test</title>
  </head>
  <body>{{content}}</body>
</html>`;

describe("hasTailwindCdn", () => {
  it("should return true for document with Tailwind CDN script", () => {
    assert(hasTailwindCdn(DOC_WITH_CDN));
  });

  it("should return false for document without Tailwind CDN", () => {
    assertEquals(hasTailwindCdn(DOC_WITHOUT_CDN), false);
  });

  it("should return false for document with only Tailwind Plus Elements", () => {
    assertEquals(hasTailwindCdn(DOC_WITH_PLUS_ELEMENTS), false);
  });

  it("should return true when both CDN and Plus Elements are present", () => {
    assert(hasTailwindCdn(DOC_WITH_BOTH));
  });

  it("should detect CDN with single-quoted src", () => {
    const html =
      `<head><script src='https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4'></script></head>`;
    assert(hasTailwindCdn(html));
  });
});

describe("injectTailwindCss", () => {
  it("should remove CDN script and insert style tag", () => {
    const css = ".flex { display: flex; }";
    const result = injectTailwindCss(DOC_WITH_CDN, css);

    assert(
      !result.includes("@tailwindcss/browser"),
      "CDN script should be removed",
    );
    assertStringIncludes(result, '<style id="tw">');
    assertStringIncludes(result, css);
  });

  it("should insert CSS before </head>", () => {
    const css = ".p-4 { padding: 1rem; }";
    const result = injectTailwindCss(DOC_WITH_CDN, css);

    const styleIndex = result.indexOf('<style id="tw">');
    const headCloseIndex = result.indexOf("</head>");
    assert(
      styleIndex < headCloseIndex,
      "Style tag should appear before </head>",
    );
  });

  it("should NOT remove Tailwind Plus Elements CDN", () => {
    const css = ".flex { display: flex; }";
    const result = injectTailwindCss(DOC_WITH_BOTH, css);

    assert(
      !result.includes("@tailwindcss/browser"),
      "Tailwind CDN should be removed",
    );
    assertStringIncludes(
      result,
      "@tailwindplus/elements",
    );
  });

  it("should work on document without CDN (just injects style)", () => {
    const css = ".flex { display: flex; }";
    const result = injectTailwindCss(DOC_WITHOUT_CDN, css);

    assertStringIncludes(result, '<style id="tw">');
    assertStringIncludes(result, css);
  });
});
