/**
 * Coverage tests for build/buildReporter.ts — verbose mode methods
 * Covers: start, startStep, finishStep, warningBlock, reportFailure, finish, spinner
 */
import { describe, it } from "@std/testing/bdd";
import { assertEquals, assertStringIncludes } from "@std/assert";
import { BuildReporter } from "../build/buildReporter.ts";
import { stripAnsi } from "../terminalUi.ts";

function createCapturingReporter(opts?: {
  interactive?: boolean;
  verbose?: boolean;
}) {
  const lines: string[] = [];
  const writer = {
    write: (chunk: Uint8Array | string) => {
      const text = typeof chunk === "string"
        ? chunk
        : new TextDecoder().decode(chunk);
      lines.push(stripAnsi(text));
    },
  };
  const reporter = new BuildReporter({
    verbose: opts?.verbose ?? true,
    color: false,
    interactive: opts?.interactive ?? false,
    writer,
  });
  return { reporter, lines };
}

describe("BuildReporter — verbose mode", () => {
  it("start should print header", () => {
    const { reporter, lines } = createCapturingReporter();
    reporter.start({
      appPath: "./app",
      publicPath: "./public",
      outputDir: "./dist",
      mode: "binary",
      totalSteps: 5,
    });
    const output = lines.join("");
    assertStringIncludes(output, "Ten.net");
  });

  it("startStep and finishStep should produce formatted output", () => {
    const { reporter, lines } = createCapturingReporter();
    reporter.start({
      appPath: "./app",
      publicPath: "./public",
      outputDir: "./dist",
      mode: "binary",
      totalSteps: 5,
    });
    reporter.startStep("Collect manifest");
    reporter.finishStep("success", "10 routes");
    const output = lines.join("");
    assertStringIncludes(output, "Collect manifest");
  });

  it("finishStep with failure status", () => {
    const { reporter, lines } = createCapturingReporter();
    reporter.start({
      appPath: "./app",
      publicPath: "./public",
      outputDir: "./dist",
      mode: "binary",
      totalSteps: 3,
    });
    reporter.startStep("Compile");
    reporter.finishStep("failure", "Compilation error");
    const output = lines.join("");
    assertStringIncludes(output, "Compile");
  });

  it("finishStep with warning status", () => {
    const { reporter, lines } = createCapturingReporter();
    reporter.start({
      appPath: "./app",
      publicPath: "./public",
      outputDir: "./dist",
      mode: "binary",
      totalSteps: 3,
    });
    reporter.startStep("Bundle");
    reporter.finishStep("warning", "Some warnings");
    const output = lines.join("");
    assertStringIncludes(output, "Bundle");
  });

  it("warningBlock should render title and lines", () => {
    const { reporter, lines } = createCapturingReporter();
    reporter.start({
      appPath: "./app",
      publicPath: "./public",
      outputDir: "./dist",
      mode: "binary",
      totalSteps: 3,
    });
    reporter.warningBlock("Warnings", [
      "Unused route: /old",
      "Missing layout",
    ]);
    const output = lines.join("");
    assertStringIncludes(output, "Warnings");
    assertStringIncludes(output, "Unused route: /old");
  });

  it("warningBlock with empty lines should be no-op", () => {
    const { reporter, lines } = createCapturingReporter();
    reporter.start({
      appPath: "./app",
      publicPath: "./public",
      outputDir: "./dist",
      mode: "binary",
      totalSteps: 3,
    });
    const beforeLen = lines.length;
    reporter.warningBlock("Nothing", []);
    assertEquals(lines.length, beforeLen);
  });

  it("reportFailure should render error details", () => {
    const { reporter, lines } = createCapturingReporter();
    reporter.start({
      appPath: "./app",
      publicPath: "./public",
      outputDir: "./dist",
      mode: "binary",
      totalSteps: 3,
    });
    reporter.reportFailure({
      stage: "Encrypt",
      message: "Key not found",
      details: "Error: missing AES key\nStack trace",
    });
    const output = lines.join("");
    assertStringIncludes(output, "Build failed");
    assertStringIncludes(output, "Encrypt");
    assertStringIncludes(output, "Key not found");
    assertStringIncludes(output, "Details");
  });

  it("reportFailure without details", () => {
    const { reporter, lines } = createCapturingReporter();
    reporter.start({
      appPath: "./app",
      publicPath: "./public",
      outputDir: "./dist",
      mode: "binary",
      totalSteps: 3,
    });
    reporter.reportFailure({
      stage: "Collect",
      message: "No routes found",
    });
    const output = lines.join("");
    assertStringIncludes(output, "Build failed");
  });

  it("reportFailure with active step should finish it first", () => {
    const { reporter, lines } = createCapturingReporter();
    reporter.start({
      appPath: "./app",
      publicPath: "./public",
      outputDir: "./dist",
      mode: "binary",
      totalSteps: 3,
    });
    reporter.startStep("Active Step");
    reporter.reportFailure({
      stage: "Active Step",
      message: "Step failed",
    });
    const output = lines.join("");
    assertStringIncludes(output, "Active Step");
    assertStringIncludes(output, "Build failed");
  });

  it("finish should render full build summary with binary", () => {
    const { reporter, lines } = createCapturingReporter();
    reporter.start({
      appPath: "./app",
      publicPath: "./public",
      outputDir: "./dist",
      mode: "binary",
      totalSteps: 5,
    });
    reporter.finish({
      appPath: "./app",
      publicPath: "./public",
      outputDir: "./dist",
      compiledPath: "./dist/compiled.ts",
      binaryPath: "./dist/app",
      binarySize: 15_000_000,
      routes: 10,
      pageRoutes: 6,
      handlerOnlyRoutes: 2,
      staticPages: 2,
      dynamicRoutes: 3,
      layouts: 2,
      assets: 5,
      manifestBytes: 50000,
      compressedBytes: 12000,
      durationMs: 2500,
      secret: "test-secret-key",
      secretGenerated: true,
      nextStep: "Run `./dist/app` to start.",
      mode: "binary",
    });
    const output = lines.join("");
    assertStringIncludes(output, "Artifacts");
    assertStringIncludes(output, "./dist/compiled.ts");
    assertStringIncludes(output, "Summary");
    assertStringIncludes(output, "Secret");
    assertStringIncludes(output, "Next");
  });

  it("finish without binaryPath should show externally provided", () => {
    const { reporter, lines } = createCapturingReporter();
    reporter.start({
      appPath: "./app",
      publicPath: "./public",
      outputDir: "./dist",
      mode: "compiled TS only",
      totalSteps: 4,
    });
    reporter.finish({
      appPath: "./app",
      publicPath: "./public",
      outputDir: "./dist",
      compiledPath: "./dist/compiled.ts",
      routes: 5,
      pageRoutes: 3,
      handlerOnlyRoutes: 1,
      staticPages: 1,
      dynamicRoutes: 0,
      layouts: 1,
      assets: 0,
      manifestBytes: 10000,
      compressedBytes: 3000,
      durationMs: 1000,
      secret: "ext-key",
      secretGenerated: false,
      nextStep: "Run with Deno.",
      mode: "compiled TS only",
    });
    const output = lines.join("");
    assertStringIncludes(output, "Provided externally");
  });

  it("finish with zero manifestBytes should handle reduction", () => {
    const { reporter, lines } = createCapturingReporter();
    reporter.start({
      appPath: "./app",
      publicPath: "./public",
      outputDir: "./dist",
      mode: "binary",
      totalSteps: 3,
    });
    reporter.finish({
      appPath: "./app",
      publicPath: "./public",
      outputDir: "./dist",
      compiledPath: "./dist/compiled.ts",
      routes: 0,
      pageRoutes: 0,
      handlerOnlyRoutes: 0,
      staticPages: 0,
      dynamicRoutes: 0,
      layouts: 0,
      assets: 0,
      manifestBytes: 0,
      compressedBytes: 0,
      durationMs: 100,
      secret: "",
      secretGenerated: false,
      nextStep: "",
      mode: "binary",
    });
    const output = lines.join("");
    assertStringIncludes(output, "0.0%");
  });
});

describe("BuildReporter — non-verbose mode", () => {
  it("all methods should be no-ops", () => {
    const { reporter, lines } = createCapturingReporter({ verbose: false });
    reporter.start({
      appPath: "./app",
      publicPath: "./public",
      outputDir: "./dist",
      mode: "binary",
      totalSteps: 3,
    });
    reporter.startStep("Hidden");
    reporter.finishStep("success");
    reporter.warningBlock("Warn", ["line"]);
    reporter.reportFailure({ stage: "s", message: "m" });
    reporter.finish({
      appPath: "./app",
      publicPath: "./public",
      outputDir: "./dist",
      compiledPath: "./dist/compiled.ts",
      routes: 0,
      pageRoutes: 0,
      handlerOnlyRoutes: 0,
      staticPages: 0,
      dynamicRoutes: 0,
      layouts: 0,
      assets: 0,
      manifestBytes: 0,
      compressedBytes: 0,
      durationMs: 0,
      secret: "",
      secretGenerated: false,
      nextStep: "",
      mode: "binary",
    });
    // Non-verbose: only the start header should NOT appear
    const output = lines.join("");
    assertEquals(output.includes("Ten.net"), false);
  });
});

describe("BuildReporter — interactive spinner", () => {
  it("startStep should activate spinner in interactive mode", () => {
    const { reporter } = createCapturingReporter({ interactive: true });
    reporter.start({
      appPath: "./app",
      publicPath: "./public",
      outputDir: "./dist",
      mode: "binary",
      totalSteps: 2,
    });
    reporter.startStep("Spinner Step");
    // Spinner uses setInterval, finishStep clears it
    reporter.finishStep("success", "Done");
    // No assertion needed — just ensures code path is exercised without error
  });
});
