import { describe, it } from "@std/testing/bdd";
import { assert, assertStringIncludes } from "@std/assert";
import { generateTailwindCss } from "../src/tailwind/generator.ts";
import {
  TAILWIND_INDEX_CSS,
  TAILWIND_INDEX_CSS_VERSION,
} from "../src/tailwind/_tailwindIndexCss.ts";

describe("generateTailwindCss", () => {
  it("should generate CSS for known Tailwind classes", async () => {
    const css = await generateTailwindCss(["flex", "p-4", "text-center"]);
    assert(css.length > 0, "CSS should not be empty");
    assertStringIncludes(css, ".flex");
    assertStringIncludes(css, ".p-4");
    assertStringIncludes(css, ".text-center");
  });

  it("should generate CSS containing correct selectors", async () => {
    const css = await generateTailwindCss(["bg-white", "mx-auto"]);
    assertStringIncludes(css, ".bg-white");
    assertStringIncludes(css, ".mx-auto");
  });

  it("should not break on empty array", async () => {
    const css = await generateTailwindCss([]);
    assert(typeof css === "string", "Should return a string");
  });

  it("should silently ignore invalid/unknown classes", async () => {
    const css = await generateTailwindCss([
      "flex",
      "totally-not-a-real-class-xyz",
    ]);
    assertStringIncludes(css, ".flex");
    assert(
      !css.includes(".totally-not-a-real-class-xyz"),
      "Invalid class should not appear in output",
    );
  });
});

describe("embedded tailwindcss index.css", () => {
  it("should contain expected layer markers", () => {
    assertStringIncludes(TAILWIND_INDEX_CSS, "@layer theme");
    assertStringIncludes(TAILWIND_INDEX_CSS, "@theme default");
    assertStringIncludes(TAILWIND_INDEX_CSS, "@layer base");
    assertStringIncludes(TAILWIND_INDEX_CSS, "@tailwind utilities");
  });

  it("should have a valid semver version string", () => {
    assert(/^\d+\.\d+\.\d+/.test(TAILWIND_INDEX_CSS_VERSION));
  });

  it("should have non-trivial size (>20KB)", () => {
    assert(
      TAILWIND_INDEX_CSS.length > 20000,
      `expected >20KB, got ${TAILWIND_INDEX_CSS.length}`,
    );
  });
});
