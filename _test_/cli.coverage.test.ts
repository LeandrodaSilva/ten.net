import { describe, it } from "@std/testing/bdd";
import { assertEquals } from "@std/assert";
import { main } from "../src/cli.ts";
import { stubDeno } from "./_deno_stub.ts";

class ExitSignal extends Error {
  constructor(public code: number) {
    super(`exit:${code}`);
  }
}

/** Run cli.main() with stubbed Deno.args + Deno.exit and silenced console. */
async function runMain(
  args: string[],
): Promise<{ exitCode: number | null }> {
  const restoreArgs = stubDeno("args", args);
  const restoreExit = stubDeno("exit", (code?: number) => {
    throw new ExitSignal(code ?? 0);
  });
  const log = console.log, err = console.error, info = console.info;
  console.log = () => {};
  console.error = () => {};
  console.info = () => {};

  let exitCode: number | null = null;
  try {
    await main();
  } catch (e) {
    if (e instanceof ExitSignal) exitCode = e.code;
    else throw e;
  } finally {
    console.log = log;
    console.error = err;
    console.info = info;
    restoreArgs();
    restoreExit();
  }
  return { exitCode };
}

describe("cli main", () => {
  it("prints the version with --version", async () => {
    assertEquals((await runMain(["--version"])).exitCode, null);
  });

  it("prints CLI help when no command is given", async () => {
    assertEquals((await runMain([])).exitCode, null);
  });

  it("prints build help for `build --help`", async () => {
    assertEquals((await runMain(["build", "--help"])).exitCode, null);
  });

  it("prints CLI help for `<other> --help`", async () => {
    assertEquals((await runMain(["foo", "--help"])).exitCode, null);
  });

  it("exits 1 for an unknown command", async () => {
    assertEquals((await runMain(["bogus"])).exitCode, 1);
  });

  it("runs a successful build", async () => {
    const out = await Deno.makeTempDir({ prefix: "tennet_cli_" });
    try {
      const { exitCode } = await runMain([
        "build",
        "--app-path",
        "./example/http/app",
        "--output",
        out,
        "--no-compile",
      ]);
      assertEquals(exitCode, null);
      assertEquals((await Deno.stat(`${out}/_compiled_app.ts`)).isFile, true);
    } finally {
      await Deno.remove(out, { recursive: true }).catch(() => {});
    }
  });

  it("exits 1 when the build fails", async () => {
    const { exitCode } = await runMain([
      "build",
      "--app-path",
      "./__nonexistent_cli__",
      "--no-compile",
    ]);
    assertEquals(exitCode, 1);
  });
});
