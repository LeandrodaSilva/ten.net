import { describe, it } from "@std/testing/bdd";
import { assertEquals } from "@std/assert";
import { build } from "../src/build/build.ts";

describe("build engine", () => {
  const testAppPath = "./example/http/app";
  const testPublicPath = "./public";
  const testOutput = "./dist/_test_build";

  async function cleanup() {
    try {
      await Deno.remove(testOutput, { recursive: true });
    } catch {
      // Directory doesn't exist
    }
  }

  it("should build with compile=false and return result", async () => {
    await cleanup();

    const result = await build({
      appPath: testAppPath,
      publicPath: testPublicPath,
      output: testOutput,
      compile: false,
      verbose: false,
    });

    assertEquals(typeof result.secret, "string");
    assertEquals(result.secret.length > 0, true);
    assertEquals(result.compiledPath, `${testOutput}/_compiled_app.ts`);
    assertEquals(result.binaryPath, undefined);
    assertEquals(result.stats.routes > 0, true);

    // Verify the compiled file was written
    const stat = await Deno.stat(result.compiledPath);
    assertEquals(stat.isFile, true);

    await cleanup();
  });

  it("should use provided secret", async () => {
    await cleanup();

    const result = await build({
      appPath: testAppPath,
      publicPath: testPublicPath,
      output: testOutput,
      secret: "test-secret-123",
      compile: false,
      verbose: false,
    });

    assertEquals(result.secret, "test-secret-123");

    await cleanup();
  });

  it("should auto-generate secret when not provided", async () => {
    await cleanup();

    const result1 = await build({
      appPath: testAppPath,
      publicPath: testPublicPath,
      output: testOutput,
      compile: false,
      verbose: false,
    });

    await cleanup();

    const result2 = await build({
      appPath: testAppPath,
      publicPath: testPublicPath,
      output: testOutput,
      compile: false,
      verbose: false,
    });

    assertEquals(typeof result1.secret, "string");
    assertEquals(typeof result2.secret, "string");
    // Auto-generated secrets should be different
    assertEquals(result1.secret !== result2.secret, true);

    await cleanup();
  });

  it("should report manifest stats", async () => {
    await cleanup();

    const result = await build({
      appPath: testAppPath,
      publicPath: testPublicPath,
      output: testOutput,
      compile: false,
      verbose: false,
    });

    assertEquals(typeof result.stats.routes, "number");
    assertEquals(typeof result.stats.layouts, "number");
    assertEquals(typeof result.stats.assets, "number");
    assertEquals(typeof result.stats.manifestBytes, "number");
    assertEquals(typeof result.stats.compressedBytes, "number");
    assertEquals(
      result.stats.compressedBytes < result.stats.manifestBytes,
      true,
    );

    await cleanup();
  });
});
