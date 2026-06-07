import { describe, it } from "@std/testing/bdd";
import { assertEquals, assertStringIncludes } from "@std/assert";
import { viewEngine } from "../src/viewEngine.ts";
import { Route } from "../src/models/Route.ts";
import type { AppManifest } from "../src/build/manifest.ts";
import type { I18nMap } from "../src/core/types.ts";

function adminPage(page: string): Route {
  const route = new Route({
    path: "/admin/w",
    regex: /^\/admin\/w$/,
    hasPage: true,
    transpiledCode: "",
    sourcePath: "",
  });
  route.method = "GET";
  route.page = page;
  return route;
}

const I18N: I18nMap = {
  "/admin/w": {
    en: { Hello: "Hello" },
    "pt-BR": { Hello: "Olá", greet: "Oi" },
  },
};

describe("viewEngine — i18n rendering", () => {
  it("translates text, resolves escape hatches, sets lang, and injects hreflang", async () => {
    const route = adminPage(
      `<html><head></head><body><h1>Hello</h1>{{i18n:selector}} {{t:greet}}Hi{{/t}}</body></html>`,
    );
    const html = await viewEngine({
      _appPath: "",
      route,
      req: new Request("http://localhost/admin/w"),
      params: {},
      locale: "pt-BR",
      i18n: I18N,
    });

    assertStringIncludes(html, "Olá"); // text translated
    assertStringIncludes(html, "Oi"); // escape hatch resolved
    assertStringIncludes(html, '<html lang="pt-BR">'); // lang set
    assertStringIncludes(html, "<select"); // default selector rendered
    assertStringIncludes(
      html,
      'hreflang="en" href="http://localhost/en/admin/w"',
    ); // hreflang injected
  });

  it("uses a custom selector template from the embedded manifest", async () => {
    const route = adminPage(
      `<html><head></head><body>{{i18n:selector}}</body></html>`,
    );
    const embedded = {
      routes: [],
      layouts: {},
      assets: {},
      documentHtml: "",
      selectorTemplates: {
        "/admin/w": "{{i18n:item}}<a>{{locale}}</a>{{/i18n:item}}",
      },
    } as unknown as AppManifest;

    const html = await viewEngine({
      _appPath: "",
      route,
      req: new Request("http://localhost/admin/w"),
      params: {},
      locale: "pt-BR",
      i18n: I18N,
      embedded,
    });

    assertStringIncludes(html, "<a>en</a>");
    assertStringIncludes(html, "<a>pt-BR</a>");
    assertEquals(html.includes("<select"), false); // custom template wins
  });
});

describe("viewEngine — Tailwind injection", () => {
  it("injects inline CSS before </head> in dev mode", async () => {
    const route = adminPage(`<html><head></head><body>x</body></html>`);
    const html = await viewEngine({
      _appPath: "",
      route,
      req: new Request("http://localhost/admin/w"),
      params: {},
      tailwindCss: "body{color:red}",
    });
    assertStringIncludes(html, '<style id="tw">body{color:red}</style>');
  });

  it("does not inject Tailwind when running embedded", async () => {
    const route = adminPage(`<html><head></head><body>x</body></html>`);
    const embedded = {
      routes: [],
      layouts: {},
      assets: {},
      documentHtml: "",
    } as unknown as AppManifest;
    const html = await viewEngine({
      _appPath: "",
      route,
      req: new Request("http://localhost/admin/w"),
      params: {},
      tailwindCss: "body{color:red}",
      embedded,
    });
    assertEquals(html.includes('<style id="tw">'), false);
  });
});
