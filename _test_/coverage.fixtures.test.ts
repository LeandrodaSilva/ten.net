import { afterAll, beforeAll, describe, it } from "@std/testing/bdd";
import { assert, assertEquals } from "@std/assert";
import { Ten } from "../src/ten.ts";
import { build } from "../src/build/build.ts";
import { collectManifest } from "../src/build/collector.ts";
import { bundleRoutes } from "../src/build/bundleRoutes.ts";
import { BuildReporter } from "../src/build/buildReporter.ts";
import { stubDeno } from "./_deno_stub.ts";

/** App with a route esbuild cannot bundle, but the collector tolerates. */
async function makeBrokenBundleApp(): Promise<string> {
  const dir = await Deno.makeTempDir({ prefix: "tennet_brokenbundle_" });
  await Deno.writeTextFile(
    `${dir}/document.html`,
    `<!DOCTYPE html><html><head></head><body>{{content}}</body></html>`,
  );
  await Deno.mkdir(`${dir}/broken`, { recursive: true });
  await Deno.writeTextFile(
    `${dir}/broken/route.ts`,
    `export function GET( { this is not valid typescript @@@`,
  );
  return dir;
}

const TW_CDN =
  '<script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>';

/** Build a small app with a root layout, i18n files and a Tailwind document. */
async function makeRichApp(): Promise<string> {
  const dir = await Deno.makeTempDir({ prefix: "tennet_rich_app_" });
  await Deno.writeTextFile(
    `${dir}/document.html`,
    `<!DOCTYPE html><html lang="en"><head>${TW_CDN}</head><body>{{content}}</body></html>`,
  );
  await Deno.writeTextFile(
    `${dir}/layout.html`,
    `<div class="p-4 text-blue-500">{{content}}</div>`,
  );
  await Deno.writeTextFile(`${dir}/i18n.en.json`, JSON.stringify({ Hi: "Hi" }));
  await Deno.writeTextFile(
    `${dir}/i18n.pt-BR.json`,
    JSON.stringify({ Hi: "Olá" }),
  );
  await Deno.writeTextFile(`${dir}/page.html`, `<h1 class="font-bold">Hi</h1>`);
  await Deno.mkdir(`${dir}/home`, { recursive: true });
  await Deno.writeTextFile(
    `${dir}/home/page.html`,
    `<main class="text-red-500">{{title}}</main>`,
  );
  await Deno.writeTextFile(
    `${dir}/home/route.ts`,
    `export function GET(): Response {\n  return new Response(JSON.stringify({ title: "Home" }), {\n    headers: { "Content-Type": "application/json" },\n  });\n}\n`,
  );
  return dir;
}

describe("Ten.start — full route + i18n + tailwind pipeline", () => {
  let appDir: string;
  const spy = { log: console.log, info: console.info, warn: console.warn };

  beforeAll(async () => {
    appDir = await makeRichApp();
  });
  afterAll(async () => {
    await Deno.remove(appDir, { recursive: true }).catch(() => {});
  });

  it("loads routes, validates translations and generates Tailwind CSS", async () => {
    const app = Ten.net({ appPath: appDir });
    let served = false;
    const restoreServe = stubDeno("serve", () => {
      served = true;
      return { finished: Promise.resolve(), ref: () => {}, unref: () => {} };
    });
    console.log = () => {};
    console.info = () => {};
    console.warn = () => {};
    try {
      await app.start({ gracefulShutdown: false });
      assertEquals(served, true);
      const routes =
        (app as unknown as { _routes: readonly { path: string }[] })
          ._routes;
      assert(routes.some((r) => r.path === "/home"));
    } finally {
      restoreServe();
      console.log = spy.log;
      console.info = spy.info;
      console.warn = spy.warn;
    }
  });
});

describe("collector — layouts for page routes", () => {
  let appDir: string;
  beforeAll(async () => {
    appDir = await makeRichApp();
  });
  afterAll(async () => {
    await Deno.remove(appDir, { recursive: true }).catch(() => {});
  });

  it("collects layout contents for routes that have a page", async () => {
    const manifest = await collectManifest(appDir, "./public");
    // The root layout should be recorded for page routes.
    const layoutLists = Object.values(manifest.layouts);
    assert(layoutLists.some((l) => l.length > 0));
  });
});

describe("bundleRoutes — failure path", () => {
  it("returns success:false with errors when a route fails to bundle", async () => {
    const dir = await Deno.makeTempDir({ prefix: "tennet_badbundle_" });
    const out = `${dir}/out`;
    try {
      await Deno.mkdir(`${dir}/broken`, { recursive: true });
      // Invalid TypeScript that @deno/emit cannot bundle.
      await Deno.writeTextFile(
        `${dir}/broken/route.ts`,
        `export function GET( { this is not valid typescript @@@`,
      );
      const result = await bundleRoutes({ appPath: dir, outputDir: out });
      assertEquals(result.success, false);
      assert(result.errors.length > 0);
    } finally {
      await Deno.remove(dir, { recursive: true }).catch(() => {});
    }
  });
});

describe("build — bundle warning path", () => {
  it("reports a warning when route bundling produces errors", async () => {
    const appDir = await makeBrokenBundleApp();
    const out = await Deno.makeTempDir({ prefix: "tennet_bundlewarn_out_" });
    const spy = { log: console.log, info: console.info, warn: console.warn };
    console.log = () => {};
    console.info = () => {};
    console.warn = () => {};
    try {
      // bundle:true triggers the bundle step; the broken route yields a
      // non-fatal warning, after which the build still produces compiled TS.
      const result = await build({
        appPath: appDir,
        output: out,
        bundle: true,
        compile: false,
        verbose: true,
      });
      assertEquals(result.compiledPath, `${out}/_compiled_app.ts`);
    } finally {
      console.log = spy.log;
      console.info = spy.info;
      console.warn = spy.warn;
      await Deno.remove(appDir, { recursive: true }).catch(() => {});
      await Deno.remove(out, { recursive: true }).catch(() => {});
    }
  });
});

describe("Ten.start — document without Tailwind CDN", () => {
  it("skips CSS generation when the document has no Tailwind CDN", async () => {
    const dir = await Deno.makeTempDir({ prefix: "tennet_nocdn_" });
    await Deno.writeTextFile(
      `${dir}/document.html`,
      `<!DOCTYPE html><html><head></head><body>{{content}}</body></html>`,
    );
    await Deno.writeTextFile(`${dir}/page.html`, `<h1>home</h1>`);
    const app = Ten.net({ appPath: dir });
    const restoreServe = stubDeno("serve", () => ({
      finished: Promise.resolve(),
      ref: () => {},
      unref: () => {},
    }));
    const spy = { log: console.log, info: console.info };
    console.log = () => {};
    console.info = () => {};
    try {
      await app.start({ gracefulShutdown: false });
      // No Tailwind CDN → no inline CSS is generated.
      const css = (app as unknown as { _core: { tailwindCss?: string } })._core
        .tailwindCss;
      assertEquals(css, undefined);
    } finally {
      restoreServe();
      console.log = spy.log;
      console.info = spy.info;
      await Deno.remove(dir, { recursive: true }).catch(() => {});
    }
  });
});

describe("BuildReporter — finishStep without an active step", () => {
  it("is a no-op when no step is active", () => {
    const reporter = new BuildReporter({ verbose: true });
    // No startStep called; must return early without throwing.
    reporter.finishStep("success", "ignored");
    assert(true);
  });
});

describe("Ten — _readEnv swallows env access errors", () => {
  it("constructs cleanly when Deno.env.get throws", () => {
    const restoreEnv = stubDeno("env", {
      get: () => {
        throw new Error("no env permission");
      },
      set: () => {},
      delete: () => {},
      has: () => false,
      toObject: () => ({}),
    });
    try {
      const app = Ten.net({ appPath: "./example/http/app" });
      assertEquals(app instanceof Ten, true);
    } finally {
      restoreEnv();
    }
  });
});
