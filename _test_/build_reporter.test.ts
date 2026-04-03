import { describe, it } from "@std/testing/bdd";
import { assertEquals, assertStringIncludes } from "@std/assert";
import { BuildReporter } from "../src/build/buildReporter.ts";
import { stripAnsi, type TerminalWriter } from "../src/terminalUi.ts";

class MemoryWriter implements TerminalWriter {
  stdout = "";
  stderr = "";

  write(text: string, target: "stdout" | "stderr" = "stdout"): void {
    if (target === "stderr") {
      this.stderr += text;
      return;
    }

    this.stdout += text;
  }
}

describe("build reporter", () => {
  it("should mark failed steps and print captured details", () => {
    const writer = new MemoryWriter();
    const reporter = new BuildReporter({
      verbose: true,
      color: false,
      interactive: false,
      writer,
    });

    reporter.start({
      appPath: "./example/app",
      publicPath: "./public",
      outputDir: "./dist",
      mode: "binary",
      totalSteps: 1,
    });
    reporter.startStep("Compile binary");
    reporter.reportFailure({
      stage: "Compile binary",
      message: "Binary compilation failed.",
      details: "error: missing import map entry",
    });

    assertStringIncludes(writer.stderr, "[1/1] FAIL Compile binary");
    assertStringIncludes(writer.stderr, "Build failed");
    assertStringIncludes(writer.stderr, "Stage");
    assertStringIncludes(writer.stderr, "Compile binary");
    assertStringIncludes(writer.stderr, "Details");
    assertStringIncludes(writer.stderr, "error: missing import map entry");
    assertEquals(stripAnsi(writer.stderr), writer.stderr);
  });
});
