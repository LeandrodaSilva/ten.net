import { describe, it } from "@std/testing/bdd";
import {
  assertEquals,
  assertMatch,
  assertNotMatch,
  assertStringIncludes,
} from "@std/assert";
import { stripAnsi } from "../../packages/core/src/terminalUi.ts";
import { VERSION } from "../../packages/core/src/version.ts";

function runBuildCommand(args: string[]) {
  return new Deno.Command("deno", {
    args: [
      "run",
      "--allow-all",
      "src/build/buildCommand.ts",
      ...args,
    ],
    stdout: "piped",
    stderr: "piped",
  }).output();
}

describe("build command output", () => {
  it("should show build help from the build task entrypoint", async () => {
    const output = await runBuildCommand(["--help"]);
    const stdout = new TextDecoder().decode(output.stdout);

    assertEquals(output.success, true);
    assertStringIncludes(stdout, `Ten.net Build v${VERSION}`);
    assertStringIncludes(stdout, "deno task build [options]");
    assertStringIncludes(
      stdout,
      "Generated secrets are shown once in the final summary.",
    );
  });

  it("should print a stable non-interactive report with generated secret", async () => {
    const outputDir = await Deno.makeTempDir({ prefix: "tennet_build_cli_" });

    try {
      const output = await runBuildCommand([
        "--no-compile",
        `--output=${outputDir}`,
      ]);
      const stdout = new TextDecoder().decode(output.stdout);
      const compiledPath = `${outputDir}/_compiled_app.ts`;

      assertEquals(output.success, true);
      assertStringIncludes(stdout, `Ten.net Build v${VERSION}`);
      assertStringIncludes(stdout, "Context");
      assertStringIncludes(stdout, "[1/5] OK");
      assertStringIncludes(stdout, "Artifacts");
      assertStringIncludes(stdout, compiledPath);
      assertStringIncludes(stdout, "Summary");
      assertStringIncludes(stdout, "Secret");
      assertStringIncludes(
        stdout,
        "Auto-generated; save this value before deploying.",
      );
      assertMatch(stdout, /Value\s+[A-Za-z0-9+/=]+/);
      assertEquals(stripAnsi(stdout), stdout);
      assertNotMatch(stdout, /\r/);
    } finally {
      await Deno.remove(outputDir, { recursive: true });
    }
  });

  it("should not echo externally provided secrets", async () => {
    const outputDir = await Deno.makeTempDir({
      prefix: "tennet_build_cli_secret_",
    });
    const secret = "test-secret-123";

    try {
      const output = await runBuildCommand([
        "--no-compile",
        `--output=${outputDir}`,
        `--secret=${secret}`,
      ]);
      const stdout = new TextDecoder().decode(output.stdout);

      assertEquals(output.success, true);
      assertStringIncludes(stdout, "Secret");
      assertStringIncludes(stdout, "Provided externally");
      assertEquals(stdout.includes(secret), false);
      assertEquals(stripAnsi(stdout), stdout);
    } finally {
      await Deno.remove(outputDir, { recursive: true });
    }
  });
});
