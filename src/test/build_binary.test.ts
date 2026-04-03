import { afterAll, beforeAll, describe, it } from "@std/testing/bdd";
import { assertEquals, assertStringIncludes } from "@std/assert";
import { build } from "../../src/build/build.ts";
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

/**
 * E2E test that compiles the demo app into a real standalone binary
 * and validates all routes work correctly from the executable.
 *
 * This is a regression test for the blob:null module loading bug —
 * blob URLs and data URIs don't work with `import()` in `deno compile`
 * binaries. Only testing the actual binary can catch this class of errors.
 */
describe("Build Binary E2E", { ignore: true }, () => {
  let baseUrl: string;
  let process: Deno.ChildProcess;
  let tempDir: string;
  let binaryPath: string;

  const consoleSpy = {
    log: console.log,
    info: console.info,
    error: console.error,
  };

  beforeAll(async () => {
    console.log = () => {};
    console.info = () => {};
    console.error = () => {};

    tempDir = await Deno.makeTempDir({ prefix: "tennet_binary_test_" });

    // Build the actual binary (compile: true)
    const result = await build({
      appPath: "./app",
      publicPath: "./public",
      output: tempDir,
      compile: true,
      verbose: false,
    });

    assertEquals(typeof result.binaryPath, "string");
    binaryPath = result.binaryPath!;

    // Verify the binary exists
    const stat = await Deno.stat(binaryPath);
    assertEquals(stat.isFile, true);

    // Find a free port
    const listener = Deno.listen({ port: 0 });
    const port = (listener.addr as Deno.NetAddr).port;
    listener.close();

    baseUrl = `http://localhost:${port}`;

    // Run the compiled binary (NOT deno run — the actual binary)
    const cmd = new Deno.Command(binaryPath, {
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
    it("GET / should return the home page from binary", async () => {
      await assertHomePage(baseUrl);
    });
  });

  describe("View routes (template rendering)", () => {
    it("GET /hello should render template with data from binary", async () => {
      await assertHelloPage(baseUrl);
    });
  });

  describe("Form routes", () => {
    it("GET /form should display the form from binary", async () => {
      await assertFormGet(baseUrl);
    });

    it("POST /form should redirect to congrats from binary", async () => {
      await assertFormPost(baseUrl);
    });

    it("GET /form/congrats should render with query param from binary", async () => {
      await assertFormCongrats(baseUrl);
    });
  });

  describe("API routes", () => {
    it("GET /api/hello should return plain text from binary", async () => {
      await assertApiHello(baseUrl);
    });
  });

  describe("Dynamic parameter routes", () => {
    it("GET /api/hello/John should return JSON with param from binary", async () => {
      await assertApiHelloDynamic(baseUrl);
    });
  });

  describe("404 handling", () => {
    it("GET /nonexistent should return 404 from binary", async () => {
      await assert404(baseUrl);
    });
  });

  describe("Regression: route handler module loading", () => {
    it("should NOT produce blob:null errors in the binary", async () => {
      // This test specifically validates the fix for the blob URL bug.
      // Routes that have route.ts handlers must respond with proper content,
      // not 500 errors from failed module imports.
      const routes = ["/api/hello", "/api/hello/Test", "/hello"];
      for (const route of routes) {
        const res = await fetch(`${baseUrl}${route}`);
        assertEquals(
          res.status,
          200,
          `Route ${route} should return 200, not ${res.status} (blob:null regression)`,
        );
        const body = await res.text();
        assertStringIncludes(
          body.length > 0 ? body : "(empty)",
          body.length > 0 ? body.substring(0, 1) : "should not be empty",
          `Route ${route} should return non-empty body`,
        );
      }
    });

    it("multiple requests to same route should work (caching)", async () => {
      for (let i = 0; i < 3; i++) {
        const res = await fetch(`${baseUrl}/api/hello`);
        assertEquals(res.status, 200);
        const body = await res.text();
        assertEquals(body, "Hello World");
      }
    });

    it("different dynamic params should all resolve correctly", async () => {
      const names = ["Alice", "Bob", "Charlie"];
      for (const name of names) {
        const res = await fetch(`${baseUrl}/api/hello/${name}`);
        assertEquals(res.status, 200);
        const json = await res.json();
        assertEquals(json.message, `Hello ${name}`);
      }
    });
  });
});
