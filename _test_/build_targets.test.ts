import { describe, it } from "@std/testing/bdd";
import { assertEquals, assertRejects } from "@std/assert";
import { build } from "../src/build/build.ts";

const APP = "./example/http/app";

async function withTempDir(fn: (dir: string) => Promise<void>): Promise<void> {
  const dir = await Deno.makeTempDir({ prefix: "tennet_build_targets_" });
  try {
    await fn(dir);
  } finally {
    await Deno.remove(dir, { recursive: true }).catch(() => {});
  }
}

describe("build — deno target extras", () => {
  it("bundles routes when bundle=true", async () => {
    await withTempDir(async (out) => {
      const result = await build({
        appPath: APP,
        output: out,
        bundle: true,
        compile: false,
        verbose: false,
      });
      assertEquals(result.compiledPath, `${out}/_compiled_app.ts`);
      assertEquals((await Deno.stat(`${out}/_compiled_app.ts`)).isFile, true);
    });
  });

  it("embeds seed data without error", async () => {
    await withTempDir(async (out) => {
      const result = await build({
        appPath: APP,
        output: out,
        compile: false,
        verbose: false,
        seed: { posts: [{ id: "1", title: "Seeded" }] },
      });
      assertEquals(result.stats.routes > 0, true);
    });
  });
});

describe("build — failure handling", () => {
  it("rejects and reports when the app path does not exist", async () => {
    await withTempDir(async (out) => {
      const original = console.error;
      const originalLog = console.log;
      console.error = () => {};
      console.log = () => {};
      try {
        await assertRejects(() =>
          build({
            appPath: "./__nonexistent_app__",
            output: out,
            compile: false,
            verbose: false,
          })
        );
      } finally {
        console.error = original;
        console.log = originalLog;
      }
    });
  });
});
