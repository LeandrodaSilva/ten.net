import { describe, it } from "@std/testing/bdd";
import { assertEquals } from "@std/assert";
import { main } from "../src/build/buildCommand.ts";
import { stubDeno } from "./_deno_stub.ts";

describe("buildCommand main", () => {
  it("prints the version and returns on --version", async () => {
    const restoreArgs = stubDeno("args", ["--version"]);
    const logSpy = console.log;
    console.log = () => {};
    let ran = false;
    try {
      await main();
      ran = true;
    } finally {
      console.log = logSpy;
      restoreArgs();
    }
    assertEquals(ran, true);
  });

  it("prints help and returns on --help", async () => {
    const restoreArgs = stubDeno("args", ["--help"]);
    const logSpy = console.log;
    console.log = () => {};
    let ran = false;
    try {
      await main();
      ran = true;
    } finally {
      console.log = logSpy;
      restoreArgs();
    }
    assertEquals(ran, true);
  });

  it("exits with code 1 when the build fails", async () => {
    const restoreArgs = stubDeno("args", [
      "--app-path",
      "./__no_such_app__",
      "--no-compile",
      "--output",
      "/tmp/tennet_bc_fail",
    ]);
    let exitCode: number | undefined;
    const restoreExit = stubDeno("exit", (code?: number) => {
      exitCode = code;
      // Throw to unwind like a real Deno.exit would terminate execution.
      throw new Error("__exit__");
    });
    const logSpy = console.log;
    const infoSpy = console.info;
    const errSpy = console.error;
    console.log = () => {};
    console.info = () => {};
    console.error = () => {};
    try {
      await main();
    } catch (e) {
      if (!(e instanceof Error) || e.message !== "__exit__") throw e;
    } finally {
      console.log = logSpy;
      console.info = infoSpy;
      console.error = errSpy;
      restoreExit();
      restoreArgs();
    }
    assertEquals(exitCode, 1);
  });
});
