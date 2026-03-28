import { describe, it } from "@std/testing/bdd";
import { assertEquals } from "@std/assert";

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
    assertEquals(stdout.includes("Ten.net CLI"), true);
    assertEquals(stdout.includes("build"), true);
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
    assertEquals(stdout.includes("tennet v"), true);
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

    assertEquals(output.success, false);
  });
});
