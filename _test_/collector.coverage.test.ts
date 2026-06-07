import { describe, it } from "@std/testing/bdd";
import { assertEquals, assertStringIncludes } from "@std/assert";
import { collectManifest } from "../src/build/collector.ts";

describe("collectManifest — full pipeline", () => {
  it("collects routes, public assets, i18n, selectors, and inlines Tailwind", async () => {
    const app = await Deno.makeTempDir({ prefix: "tennet_collect_app_" });
    const pub = await Deno.makeTempDir({ prefix: "tennet_collect_pub_" });
    try {
      // document.html with the Tailwind CDN → triggers inline CSS generation.
      await Deno.writeTextFile(
        `${app}/document.html`,
        `<html><head><script src="https://cdn.example/@tailwindcss/browser"></script></head><body>{{content}}</body></html>`,
      );
      await Deno.writeTextFile(
        `${app}/page.html`,
        `<div class="text-red-500">{{x}}</div>`,
      );
      await Deno.writeTextFile(
        `${app}/route.ts`,
        `export function GET() {\n  return new Response(JSON.stringify({ x: "1" }), {\n    headers: { "Content-Type": "application/json" },\n  });\n}\n`,
      );
      await Deno.writeTextFile(`${app}/i18n.en.json`, '{"Hello":"Hi"}');
      await Deno.writeTextFile(
        `${app}/i18n-selector.html`,
        "<select>{{i18n:item}}{{/i18n:item}}</select>",
      );

      // A public asset to exercise collectAssets().
      await Deno.writeTextFile(`${pub}/style.css`, "body{color:red}");

      const manifest = await collectManifest(app, pub);

      assertEquals(manifest.routes.length >= 1, true);
      assertEquals(manifest.assets["/style.css"].mimeType, "text/css");
      assertEquals(typeof manifest.assets["/style.css"].dataBase64, "string");
      assertEquals(manifest.i18n?.["/"]?.en, { Hello: "Hi" });
      assertEquals(typeof manifest.selectorTemplates?.["/"], "string");
      // Tailwind CDN removed, inline style injected.
      assertStringIncludes(manifest.documentHtml, '<style id="tw">');
      assertEquals(
        manifest.documentHtml.includes("@tailwindcss/browser"),
        false,
      );
    } finally {
      await Deno.remove(app, { recursive: true }).catch(() => {});
      await Deno.remove(pub, { recursive: true }).catch(() => {});
    }
  });

  it("returns no assets when the public path is absent", async () => {
    const app = await Deno.makeTempDir({ prefix: "tennet_collect_app2_" });
    try {
      await Deno.writeTextFile(`${app}/page.html`, "<p>hi</p>");
      const manifest = await collectManifest(app, `${app}/__no_public__`);
      assertEquals(Object.keys(manifest.assets).length, 0);
    } finally {
      await Deno.remove(app, { recursive: true }).catch(() => {});
    }
  });
});
