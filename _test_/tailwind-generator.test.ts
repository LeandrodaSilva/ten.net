import { describe, it } from "@std/testing/bdd";
import { assert, assertStringIncludes } from "@std/assert";
import { generateTailwindCss } from "../src/tailwind/generator.ts";

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
