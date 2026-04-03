import { describe, it } from "@std/testing/bdd";
import { assertEquals } from "@std/assert";
import {
  bundleRoutes,
  discoverRouteEntrypoints,
} from "../src/build/bundleRoutes.ts";

describe("discoverRouteEntrypoints", () => {
  it("should discover all route.ts files in app directory", async () => {
    const entrypoints = await discoverRouteEntrypoints(
      "./example/app",
      "route.ts",
    );

    assertEquals(entrypoints.length > 0, true);

    for (const ep of entrypoints) {
      assertEquals(ep.endsWith("/route.ts"), true);
    }
  });

  it("should return empty array for non-existent directory", async () => {
    const entrypoints = await discoverRouteEntrypoints(
      "./nonexistent_dir_abc123",
      "route.ts",
    );
    assertEquals(entrypoints.length, 0);
  });
});

describe("bundleRoutes", () => {
  it("should bundle discovered routes to output directory", async () => {
    const tempDir = await Deno.makeTempDir({ prefix: "tennet_bundle_test_" });

    try {
      const result = await bundleRoutes({
        appPath: "./example/app",
        outputDir: tempDir,
      });

      assertEquals(result.success, true);
      assertEquals(result.errors.length, 0);
    } finally {
      await Deno.remove(tempDir, { recursive: true });
    }
  });

  it("should throw when no entrypoints found", async () => {
    let threw = false;
    try {
      await bundleRoutes({
        appPath: "./nonexistent_dir_abc123",
      });
    } catch (e) {
      threw = true;
      assertEquals(
        (e as Error).message.includes("No route entrypoints found"),
        true,
      );
    }
    assertEquals(threw, true);
  });
});
