import { describe, it } from "@std/testing/bdd";
import { assertStringIncludes } from "@std/assert";
import { generateTailwindCss } from "../src/tailwind/generator.ts";

describe("generateTailwindCss", () => {
  it("emits utilities for the given candidates", async () => {
    const css = await generateTailwindCss(["text-red-500", "flex"]);
    assertStringIncludes(css, "text-red-500");
    assertStringIncludes(css, "flex");
  });

  it("produces base layers even with no candidates", async () => {
    const css = await generateTailwindCss([]);
    // Tailwind always emits its preflight/base layer.
    assertStringIncludes(css, "*");
  });
});
