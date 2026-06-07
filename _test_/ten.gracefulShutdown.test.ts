import { describe, it } from "@std/testing/bdd";
import { assertEquals } from "@std/assert";
import { Ten } from "../src/ten.ts";
import { stubDeno } from "./_deno_stub.ts";

describe("Ten graceful shutdown", () => {
  it("registers signal handlers and drains in-flight requests on signal", async () => {
    const app = Ten.net({ appPath: "./example/http/app" });

    // Controllable fake server: `finished` stays pending until we resolve it.
    let finishedResolve!: () => void;
    const finished = new Promise<void>((resolve) => {
      finishedResolve = resolve;
    });
    let shutdownCalled = false;
    const fakeServer = {
      finished,
      shutdown: () => {
        shutdownCalled = true;
        return Promise.resolve();
      },
      ref: () => {},
      unref: () => {},
    };

    const added = new Map<Deno.Signal, () => void>();
    const removed: Deno.Signal[] = [];

    const restoreServe = stubDeno("serve", () => fakeServer);
    const restoreAdd = stubDeno(
      "addSignalListener",
      (sig: Deno.Signal, h: () => void) => {
        added.set(sig, h);
      },
    );
    const restoreRemove = stubDeno(
      "removeSignalListener",
      (sig: Deno.Signal) => {
        removed.push(sig);
      },
    );

    const infoSpy = console.info;
    const logSpy = console.log;
    console.info = () => {};
    console.log = () => {};

    try {
      await app.start();

      // SIGINT is registered on every supported platform.
      assertEquals(added.has("SIGINT"), true);

      // Fire SIGINT → triggers graceful shutdown of the server.
      added.get("SIGINT")!();
      await Promise.resolve();
      assertEquals(shutdownCalled, true);

      // Completing the server lifecycle removes the registered handlers.
      finishedResolve();
      await finished;
      await Promise.resolve();
      assertEquals(removed.includes("SIGINT"), true);
    } finally {
      restoreServe();
      restoreAdd();
      restoreRemove();
      console.info = infoSpy;
      console.log = logSpy;
    }
  });

  it("does not register signal handlers when gracefulShutdown is false", async () => {
    const app = Ten.net({ appPath: "./example/http/app" });
    const fakeServer = {
      finished: Promise.resolve(),
      ref: () => {},
      unref: () => {},
    };

    let addCalled = false;
    const restoreServe = stubDeno("serve", () => fakeServer);
    const restoreAdd = stubDeno("addSignalListener", () => {
      addCalled = true;
    });

    const infoSpy = console.info;
    const logSpy = console.log;
    console.info = () => {};
    console.log = () => {};

    try {
      await app.start({ gracefulShutdown: false });
      assertEquals(addCalled, false);
    } finally {
      restoreServe();
      restoreAdd();
      console.info = infoSpy;
      console.log = logSpy;
    }
  });
});
