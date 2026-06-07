import "fake-indexeddb/auto";
import { describe, it } from "@std/testing/bdd";
import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { TenCore } from "../src/core/tenCore.ts";
import { Route } from "../src/models/Route.ts";
import { DynamicRouteRegistry } from "../src/routing/dynamicRouteRegistry.ts";
import { renderDynamicPage } from "../src/routing/dynamicPageHandler.ts";
import { IndexedDBKv } from "../src/storage/indexeddbKv.ts";
import { IndexedDBStorage } from "../src/storage/indexeddb.ts";
import { compareRoutePaths } from "../src/utils/compareRoutePaths.ts";
import type { StorageItem } from "../src/models/Storage.ts";

function getRoute(path: string): Route {
  const r = new Route({
    path,
    regex: new RegExp(`^${path}$`),
    hasPage: false,
    transpiledCode: "",
    sourcePath: "",
  });
  r.method = "GET";
  r.run = () => new Response("ok");
  return r;
}

describe("TenCore — misc branches", () => {
  it("init() is idempotent", () => {
    const core = new TenCore({ routes: [getRoute("/x")] });
    core.init();
    core.init(); // second call hits the already-initialized guard
    assertEquals(core.routes.length, 1);
  });

  it("excludes a reserved /robots.txt route from the generated sitemap", async () => {
    // The /robots.txt route is evaluated during generation and skipped by the
    // reserved-path guard; the ordinary route is included.
    const core = new TenCore({
      routes: [getRoute("/robots.txt"), getRoute("/ok")],
      canonicalBaseUrl: "https://s.test",
    });
    const res = await core.fetch(new Request("https://s.test/sitemap.xml"));
    const xml = await res.text();
    assertStringIncludes(xml, "https://s.test/ok");
    assertEquals(xml.includes("<loc>https://s.test/robots.txt</loc>"), false);
  });

  it("skips provider entries that have neither loc nor path", async () => {
    const core = new TenCore({
      routes: [],
      canonicalBaseUrl: "https://s.test",
      sitemapEntriesProviders: [
        () => Promise.resolve([{}, { path: "/keep" }]),
      ],
    });
    const res = await core.fetch(new Request("https://s.test/sitemap.xml"));
    const xml = await res.text();
    assertStringIncludes(xml, "https://s.test/keep");
  });
});

describe("compareRoutePaths — tie-break by locale", () => {
  it("falls back to localeCompare for equal segment count and length", () => {
    // Same segment count (1) and same length (4): the comparison is decided by
    // localeCompare on the path strings.
    assert(compareRoutePaths("/abc", "/abd") < 0);
    assert(compareRoutePaths("/abd", "/abc") > 0);
  });
});

describe("DynamicRouteRegistry — getStorage", () => {
  it("returns null before and the storage after setStorage", () => {
    const reg = new DynamicRouteRegistry();
    assertEquals(reg.getStorage(), null);
    const storage = new IndexedDBStorage(`kv-getstorage-${Date.now()}`);
    reg.setStorage(storage);
    assertEquals(reg.getStorage(), storage);
  });
});

describe("renderDynamicPage — layout application", () => {
  it("wraps the body in root layout.html files", async () => {
    const dir = await Deno.makeTempDir({ prefix: "tennet_dynlayout_" });
    try {
      await Deno.writeTextFile(
        `${dir}/document.html`,
        `<html><head></head><body>{{content}}</body></html>`,
      );
      await Deno.writeTextFile(
        `${dir}/layout.html`,
        `<div id="root-layout">{{content}}</div>`,
      );
      const item: StorageItem = {
        id: "1",
        body: "<p>inner</p>",
        title: "T",
        widgets_enabled: "false",
      };
      const html = await renderDynamicPage(item, dir);
      assertStringIncludes(html, 'id="root-layout"');
      assertStringIncludes(html, "<p>inner</p>");
    } finally {
      await Deno.remove(dir, { recursive: true }).catch(() => {});
    }
  });
});

describe("IndexedDBStorage — open error", () => {
  it("rejects when the database cannot be opened at version 1", async () => {
    const name = `tennet-downgrade-${Date.now()}`;
    // deno-lint-ignore no-explicit-any
    const idb = (globalThis as any).indexedDB;
    // Pre-create the database at a higher version so a version-1 open errors.
    await new Promise<void>((resolve, reject) => {
      const req = idb.open(name, 2);
      req.onsuccess = () => {
        req.result.close();
        resolve();
      };
      req.onerror = () => reject(req.error);
    });

    const storage = new IndexedDBStorage(name);
    let threw = false;
    try {
      await storage.get("x");
    } catch {
      threw = true;
    }
    assertEquals(threw, true);
  });
});

describe("IndexedDBKv — close", () => {
  it("opens and closes the underlying database", async () => {
    const kv = new IndexedDBKv(`tennet-kv-close-${Date.now()}`);
    await kv.set(["k"], { id: "k", v: 1 });
    const got = await kv.get(["k"]);
    assert(got !== null);
    await kv.close();
  });
});
