import { afterAll, beforeAll, describe, it } from "@std/testing/bdd";
import { assertEquals } from "@std/assert";
import { build } from "../../packages/core/src/build/build.ts";
import {
  assert404,
  assertApiHello,
  assertApiHelloDynamic,
  assertFormCongrats,
  assertFormGet,
  assertFormPost,
  assertHelloPage,
  assertHomePage,
  waitForServer,
} from "./_build_test_helpers.ts";

describe("Build Compiled TS E2E", () => {
  let baseUrl: string;
  let process: Deno.ChildProcess;
  let tempDir: string;

  const consoleSpy = {
    log: console.log,
    info: console.info,
    error: console.error,
  };

  beforeAll(async () => {
    console.log = () => {};
    console.info = () => {};
    console.error = () => {};

    tempDir = await Deno.makeTempDir({ prefix: "tennet_build_test_" });

    const result = await build({
      appPath: "./app",
      publicPath: "./public",
      output: tempDir,
      compile: false,
      verbose: false,
    });

    assertEquals(typeof result.compiledPath, "string");

    // Find a free port
    const listener = Deno.listen({ port: 0 });
    const port = (listener.addr as Deno.NetAddr).port;
    listener.close();

    baseUrl = `http://localhost:${port}`;

    // Resolve project deno.json for import map resolution
    const denoJsonPath = new URL("../../deno.json", import.meta.url).pathname;

    const cmd = new Deno.Command("deno", {
      args: [
        "run",
        "--allow-net",
        "--allow-env",
        "--unstable-raw-imports",
        `--config=${denoJsonPath}`,
        result.compiledPath,
      ],
      env: { PORT: String(port) },
      stdout: "piped",
      stderr: "piped",
    });

    process = cmd.spawn();

    // Drain stdout/stderr to prevent blocking
    (async () => {
      for await (const _chunk of process.stdout) {
        // discard
      }
    })();
    (async () => {
      for await (const _chunk of process.stderr) {
        // discard
      }
    })();

    await waitForServer(baseUrl);
  });

  afterAll(async () => {
    if (process) {
      try {
        process.kill("SIGTERM");
      } catch {
        // Process may have already exited
      }
      try {
        await process.status;
      } catch {
        // Ignore
      }
    }

    try {
      await Deno.remove(tempDir, { recursive: true });
    } catch {
      // Cleanup best-effort
    }

    console.log = consoleSpy.log;
    console.info = consoleSpy.info;
    console.error = consoleSpy.error;
  });

  describe("Static pages", () => {
    it("GET / should return the home page", async () => {
      await assertHomePage(baseUrl);
    });
  });

  describe("View routes (template rendering)", () => {
    it("GET /hello should render template with data", async () => {
      await assertHelloPage(baseUrl);
    });
  });

  describe("Form routes", () => {
    it("GET /form should display the form", async () => {
      await assertFormGet(baseUrl);
    });

    it("POST /form should redirect to congrats", async () => {
      await assertFormPost(baseUrl);
    });

    it("GET /form/congrats should render with query param", async () => {
      await assertFormCongrats(baseUrl);
    });
  });

  describe("API routes", () => {
    it("GET /api/hello should return plain text", async () => {
      await assertApiHello(baseUrl);
    });
  });

  describe("Dynamic parameter routes", () => {
    it("GET /api/hello/John should return JSON with param", async () => {
      await assertApiHelloDynamic(baseUrl);
    });
  });

  describe("404 handling", () => {
    it("GET /nonexistent should return 404", async () => {
      await assert404(baseUrl);
    });
  });
});
