/**
 * Coverage tests for build modules — codeGenerator standalone, BuildStageError,
 * buildCommand CLI args, buildReporter format methods
 */
import { describe, it } from "@std/testing/bdd";
import { assertStringIncludes } from "@std/assert";
import {
  generateCompiledApp,
  generateCompiledAppStandalone,
} from "../../src/build/codeGenerator.ts";

describe("codeGenerator", () => {
  it("generateCompiledApp should produce valid TS code", () => {
    const code = generateCompiledApp("encData", "ivData", "keyData");
    assertStringIncludes(code, "encData");
    assertStringIncludes(code, "ivData");
    assertStringIncludes(code, "keyData");
    assertStringIncludes(code, "import { Ten }");
    assertStringIncludes(code, "boot()");
  });

  it("generateCompiledAppStandalone should include framework source", () => {
    const fwSource = "// Framework code here\nfunction boot() {}";
    const code = generateCompiledAppStandalone(
      "encData",
      "ivData",
      "keyData",
      fwSource,
    );
    assertStringIncludes(code, "encData");
    assertStringIncludes(code, "Framework code here");
    assertStringIncludes(code, "Self-contained binary");
    assertStringIncludes(code, "import.meta.main");
  });
});
