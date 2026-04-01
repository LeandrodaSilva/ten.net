import { describe, it } from "@std/testing/bdd";
import { assertEquals, assertStringIncludes } from "@std/assert";
import { VERSION } from "../../packages/core/src/version.ts";

describe("cli", () => {
  it("should show help when run without arguments", async () => {
    const cmd = new Deno.Command("deno", {
      args: [
        "run",
        "--allow-all",

        "src/cli.ts",
      ],
      stdout: "piped",
      stderr: "piped",
    });

    const output = await cmd.output();
    const stdout = new TextDecoder().decode(output.stdout);

    assertEquals(output.success, true);
    assertStringIncludes(stdout, `Ten.net CLI v${VERSION}`);
    assertStringIncludes(stdout, "Commands");
    assertStringIncludes(stdout, "build");
  });

  it("should show version with --version flag", async () => {
    const cmd = new Deno.Command("deno", {
      args: [
        "run",
        "--allow-all",

        "src/cli.ts",
        "--version",
      ],
      stdout: "piped",
      stderr: "piped",
    });

    const output = await cmd.output();
    const stdout = new TextDecoder().decode(output.stdout);

    assertEquals(output.success, true);
    assertEquals(stdout.trim(), `tennet v${VERSION}`);
  });

  it("should show build-specific help for `build --help`", async () => {
    const cmd = new Deno.Command("deno", {
      args: [
        "run",
        "--allow-all",

        "src/cli.ts",
        "build",
        "--help",
      ],
      stdout: "piped",
      stderr: "piped",
    });

    const output = await cmd.output();
    const stdout = new TextDecoder().decode(output.stdout);

    assertEquals(output.success, true);
    assertStringIncludes(stdout, `Ten.net Build v${VERSION}`);
    assertStringIncludes(stdout, "deno task build [options]");
    assertStringIncludes(stdout, "--no-compile");
  });

  it("should exit with error for unknown command", async () => {
    const cmd = new Deno.Command("deno", {
      args: [
        "run",
        "--allow-all",

        "src/cli.ts",
        "unknown-command",
      ],
      stdout: "piped",
      stderr: "piped",
    });

    const output = await cmd.output();
    const stderr = new TextDecoder().decode(output.stderr);

    assertEquals(output.success, false);
    assertStringIncludes(stderr, "Unknown command: unknown-command");
  });
});
