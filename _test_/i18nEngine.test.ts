import { describe, it } from "@std/testing/bdd";
import { assertEquals, assertStringIncludes } from "@std/assert";
import type { I18nMap } from "../src/core/types.ts";
import {
  applyTranslations,
  injectHreflangLinks,
  localeToFlag,
  mergeTranslations,
  renderHreflang,
  renderSelector,
  renderSelectorFromTemplate,
  resolveEscapeHatches,
  resolveLocale,
  setHtmlLang,
} from "../src/i18nEngine.ts";

// ---------------------------------------------------------------------------
// mergeTranslations
// ---------------------------------------------------------------------------

describe("mergeTranslations", () => {
  const map: I18nMap = {
    "/": {
      "pt-BR": { greeting: "Ola", app: "Meu App" },
      "en-US": { greeting: "Hello", app: "My App" },
    },
    "/users": {
      "pt-BR": { title: "Usuarios" },
      "en-US": { title: "Users" },
    },
    "/users/profile": {
      "pt-BR": { greeting: "Ola Perfil", subtitle: "Perfil" },
      "en-US": { greeting: "Hello Profile", subtitle: "Profile" },
    },
  };

  it("merges root -> leaf hierarchically, deeper keys win", () => {
    const result = mergeTranslations(map, "/users/profile", "pt-BR");
    assertEquals(result, {
      greeting: "Ola Perfil", // overridden by /users/profile
      app: "Meu App", // from /
      title: "Usuarios", // from /users
      subtitle: "Perfil", // from /users/profile
    });
  });

  it("returns {} when route has no translations", () => {
    const emptyMap: I18nMap = {};
    const result = mergeTranslations(emptyMap, "/missing", "pt-BR");
    assertEquals(result, {});
  });

  it("returns {} when locale does not exist", () => {
    const result = mergeTranslations(map, "/users", "fr-FR");
    assertEquals(result, {});
  });

  it("returns root-only translations for root path", () => {
    const result = mergeTranslations(map, "/", "en-US");
    assertEquals(result, { greeting: "Hello", app: "My App" });
  });

  it("partial override replaces only its keys", () => {
    const result = mergeTranslations(map, "/users", "pt-BR");
    assertEquals(result, {
      greeting: "Ola", // from /
      app: "Meu App", // from /
      title: "Usuarios", // from /users
    });
  });
});

// ---------------------------------------------------------------------------
// resolveLocale
// ---------------------------------------------------------------------------

describe("resolveLocale", () => {
  const locales = ["en-US", "pt-BR", "es-ES"];

  function makeReq(
    path: string,
    headers: Record<string, string> = {},
  ): { req: Request; path: string } {
    return {
      req: new Request(`http://localhost${path}`, { headers }),
      path,
    };
  }

  it("URL prefix: /pt-BR/docs -> locale pt-BR, strippedPath /docs", () => {
    const { req, path } = makeReq("/pt-BR/docs");
    const result = resolveLocale(req, path, locales);
    assertEquals(result, { locale: "pt-BR", strippedPath: "/docs" });
  });

  it("URL prefix root: /en-US/ -> locale en-US, strippedPath /", () => {
    const { req, path } = makeReq("/en-US/");
    const result = resolveLocale(req, path, locales);
    assertEquals(result, { locale: "en-US", strippedPath: "/" });
  });

  it("URL prefix bare: /es-ES -> locale es-ES, strippedPath /", () => {
    const { req, path } = makeReq("/es-ES");
    const result = resolveLocale(req, path, locales);
    assertEquals(result, { locale: "es-ES", strippedPath: "/" });
  });

  it("cookie ten_lang when URL has no locale prefix", () => {
    const { req, path } = makeReq("/about", { cookie: "ten_lang=pt-BR" });
    const result = resolveLocale(req, path, locales);
    assertEquals(result, { locale: "pt-BR", strippedPath: "/about" });
  });

  it("Accept-Language header with quality values", () => {
    const { req, path } = makeReq("/about", {
      "accept-language": "es-ES;q=0.8, pt-BR;q=0.9, en-US;q=0.5",
    });
    const result = resolveLocale(req, path, locales);
    assertEquals(result.locale, "pt-BR"); // highest q
  });

  it("Accept-Language prefix match (pt -> pt-BR)", () => {
    const { req, path } = makeReq("/about", {
      "accept-language": "pt;q=0.9",
    });
    const result = resolveLocale(req, path, locales);
    assertEquals(result.locale, "pt-BR");
  });

  it("falls back to first locale alphabetically when no signals match", () => {
    const { req, path } = makeReq("/about");
    const result = resolveLocale(req, path, locales);
    assertEquals(result.locale, "en-US"); // sorted: en-US < es-ES < pt-BR
  });

  it("returns undefined locale when availableLocales is empty", () => {
    const { req, path } = makeReq("/about");
    const result = resolveLocale(req, path, []);
    assertEquals(result, { locale: undefined, strippedPath: "/about" });
  });

  it("priority: URL > cookie > Accept-Language", () => {
    const { req, path } = makeReq("/pt-BR/about", {
      cookie: "ten_lang=en-US",
      "accept-language": "es-ES;q=1",
    });
    const result = resolveLocale(req, path, locales);
    assertEquals(result.locale, "pt-BR"); // URL wins
  });
});

// ---------------------------------------------------------------------------
// applyTranslations
// ---------------------------------------------------------------------------

describe("applyTranslations", () => {
  it("substitutes text content between tags", () => {
    const html = "<h1>Hello World</h1>";
    const result = applyTranslations(html, { "Hello World": "Ola Mundo" });
    assertEquals(result, "<h1>Ola Mundo</h1>");
  });

  it("does not translate inside <script> tags", () => {
    const html = '<script>var x = "Hello World";</script><p>Hello World</p>';
    const result = applyTranslations(html, { "Hello World": "Ola Mundo" });
    assertStringIncludes(result, '<script>var x = "Hello World";</script>');
    assertStringIncludes(result, "<p>Ola Mundo</p>");
  });

  it("does not translate inside <style> tags", () => {
    const html = "<style>.Hello World { color: red }</style><p>Hello World</p>";
    const result = applyTranslations(html, { "Hello World": "Ola Mundo" });
    assertStringIncludes(
      result,
      "<style>.Hello World { color: red }</style>",
    );
    assertStringIncludes(result, "<p>Ola Mundo</p>");
  });

  it("does not translate inside HTML comments", () => {
    const html = "<!-- Hello World --><p>Hello World</p>";
    const result = applyTranslations(html, { "Hello World": "Ola Mundo" });
    assertStringIncludes(result, "<!-- Hello World -->");
    assertStringIncludes(result, "<p>Ola Mundo</p>");
  });

  it("does not translate HTML tag attributes", () => {
    const html = '<a href="Hello World">Hello World</a>';
    const result = applyTranslations(html, { "Hello World": "Ola Mundo" });
    assertStringIncludes(result, 'href="Hello World"');
    assertStringIncludes(result, ">Ola Mundo</a>");
  });

  it("longest key first prevents partial match", () => {
    const html = "<p>Hello World Tour</p>";
    const result = applyTranslations(html, {
      "Hello": "Ola",
      "Hello World Tour": "Tour pelo Mundo",
    });
    assertEquals(result, "<p>Tour pelo Mundo</p>");
  });

  it("whitespace normalization matches across indentation", () => {
    const html = "<p>Hello   World</p>";
    const result = applyTranslations(html, { "Hello World": "Ola Mundo" });
    assertEquals(result, "<p>Ola Mundo</p>");
  });

  it("returns HTML unchanged when translations is empty", () => {
    const html = "<p>Hello World</p>";
    const result = applyTranslations(html, {});
    assertEquals(result, "<p>Hello World</p>");
  });
});

// ---------------------------------------------------------------------------
// resolveEscapeHatches
// ---------------------------------------------------------------------------

describe("resolveEscapeHatches", () => {
  it("replaces block with translated value when key is found", () => {
    const html = "<p>{{t:hero}}Welcome{{/t}}</p>";
    const result = resolveEscapeHatches(html, { hero: "Bem-vindo" });
    assertEquals(result, "<p>Bem-vindo</p>");
  });

  it("keeps fallback text when key is not found", () => {
    const html = "<p>{{t:hero}}Welcome{{/t}}</p>";
    const result = resolveEscapeHatches(html, {});
    assertEquals(result, "<p>Welcome</p>");
  });

  it("handles multiple escape hatches in the same HTML", () => {
    const html = "<h1>{{t:title}}Title{{/t}}</h1><p>{{t:body}}Body{{/t}}</p>";
    const result = resolveEscapeHatches(html, {
      title: "Titulo",
      body: "Corpo",
    });
    assertEquals(result, "<h1>Titulo</h1><p>Corpo</p>");
  });

  it("supports HTML inside the fallback", () => {
    const html = "<div>{{t:cta}}<a href='/'>Click here</a>{{/t}}</div>";
    const result = resolveEscapeHatches(html, {});
    assertEquals(result, "<div><a href='/'>Click here</a></div>");
  });
});

// ---------------------------------------------------------------------------
// renderSelector
// ---------------------------------------------------------------------------

describe("renderSelector", () => {
  const locales = ["pt-BR", "en-US", "es-ES"];

  it("generates select with options for each locale", () => {
    const html = renderSelector("/about", "en-US", locales);
    assertStringIncludes(html, "<select");
    assertStringIncludes(html, 'class="i18n-selector');
    assertStringIncludes(html, 'aria-label="Language"');
    // 3 options
    const optionCount = (html.match(/<option /g) || []).length;
    assertEquals(optionCount, 3);
  });

  it("active locale has selected attribute", () => {
    const html = renderSelector("/about", "en-US", locales);
    // en-US option should have selected
    const enOption =
      html.match(/<option[^>]*value="\/en-US\/about"[^>]*>/)?.[0] ?? "";
    assertStringIncludes(enOption, "selected");

    // pt-BR option should NOT have selected
    const ptOption =
      html.match(/<option[^>]*value="\/pt-BR\/about"[^>]*>/)?.[0] ?? "";
    assertEquals(ptOption.includes("selected"), false);
  });

  it("locales are sorted alphabetically", () => {
    const html = renderSelector("/", "en-US", locales);
    const values = [...html.matchAll(/value="([^"]+)"/g)].map((m) => m[1]);
    assertEquals(values, ["/en-US", "/es-ES", "/pt-BR"]);
  });

  it("uses Intl.DisplayNames for display names", () => {
    const html = renderSelector("/", "pt-BR", ["pt-BR"]);
    const dn = new Intl.DisplayNames(["pt-BR"], { type: "language" });
    const expected = dn.of("pt-BR") ?? "pt-BR";
    assertStringIncludes(html, `${expected}</option>`);
  });
});

// ---------------------------------------------------------------------------
// renderHreflang
// ---------------------------------------------------------------------------

describe("renderHreflang", () => {
  const locales = ["pt-BR", "en-US"];

  it("generates link for each locale plus x-default", () => {
    const html = renderHreflang("/about", locales);
    assertStringIncludes(html, 'hreflang="en-US"');
    assertStringIncludes(html, 'hreflang="pt-BR"');
    assertStringIncludes(html, 'hreflang="x-default"');
    // Total: 2 locales + 1 x-default = 3 links
    const count = (html.match(/<link /g) || []).length;
    assertEquals(count, 3);
  });

  it("x-default points to path without locale prefix", () => {
    const html = renderHreflang("/about", locales);
    assertStringIncludes(html, 'hreflang="x-default" href="/about"');
  });

  it("locales are sorted alphabetically", () => {
    const html = renderHreflang("/about", ["pt-BR", "en-US", "es-ES"]);
    const hreflangs = [...html.matchAll(/hreflang="([^"]+)"/g)].map((m) =>
      m[1]
    );
    // sorted locales first, then x-default
    assertEquals(hreflangs, ["en-US", "es-ES", "pt-BR", "x-default"]);
  });
});

// ---------------------------------------------------------------------------
// setHtmlLang
// ---------------------------------------------------------------------------

describe("setHtmlLang", () => {
  it("replaces existing lang attribute", () => {
    const html = '<html lang="en"><head></head><body></body></html>';
    const result = setHtmlLang(html, "pt-BR");
    assertStringIncludes(result, 'lang="pt-BR"');
    assertEquals(result.includes('lang="en"'), false);
  });

  it("adds lang when absent", () => {
    const html = "<html><head></head><body></body></html>";
    const result = setHtmlLang(html, "pt-BR");
    assertStringIncludes(result, 'lang="pt-BR"');
  });

  it("preserves other attributes on <html>", () => {
    const html = '<html class="dark" data-theme="m3"><body></body></html>';
    const result = setHtmlLang(html, "en-US");
    assertStringIncludes(result, 'class="dark"');
    assertStringIncludes(result, 'data-theme="m3"');
    assertStringIncludes(result, 'lang="en-US"');
  });
});

// ---------------------------------------------------------------------------
// injectHreflangLinks
// ---------------------------------------------------------------------------

describe("injectHreflangLinks", () => {
  it("injects before </head>", () => {
    const html = "<html><head><title>Test</title></head><body></body></html>";
    const hreflang = '<link rel="alternate" hreflang="en" href="/en/" />';
    const result = injectHreflangLinks(html, hreflang);
    assertStringIncludes(result, `${hreflang}\n</head>`);
  });

  it("returns HTML unchanged when no </head> present", () => {
    const html = "<html><body>No head</body></html>";
    const hreflang = '<link rel="alternate" hreflang="en" href="/en/" />';
    const result = injectHreflangLinks(html, hreflang);
    assertEquals(result, html); // no </head> to replace, no change
  });
});

// ---------------------------------------------------------------------------
// localeToFlag
// ---------------------------------------------------------------------------

describe("localeToFlag", () => {
  it("converts en-US to US flag emoji", () => {
    const flag = localeToFlag("en-US");
    assertEquals(flag, "\u{1F1FA}\u{1F1F8}");
  });

  it("converts pt-BR to BR flag emoji", () => {
    const flag = localeToFlag("pt-BR");
    assertEquals(flag, "\u{1F1E7}\u{1F1F7}");
  });

  it("converts language-only locale (es) to ES flag emoji", () => {
    const flag = localeToFlag("es");
    assertEquals(flag, "\u{1F1EA}\u{1F1F8}");
  });

  it("returns string composed of 2 regional indicator characters", () => {
    const flag = localeToFlag("fr-FR");
    // Each regional indicator is a surrogate pair (2 code units), so 2 indicators = 4 code units
    assertEquals([...flag].length, 2);
  });
});

// ---------------------------------------------------------------------------
// renderSelector (improved — <select> with flags)
// ---------------------------------------------------------------------------

describe("renderSelector (improved)", () => {
  const locales = ["pt-BR", "en-US", "es-ES"];

  it("generates <select> instead of <nav>", () => {
    const html = renderSelector("/about", "en-US", locales);
    assertStringIncludes(html, "<select");
    assertEquals(html.includes("<nav"), false);
  });

  it("contains onchange handler for navigation", () => {
    const html = renderSelector("/about", "en-US", locales);
    assertStringIncludes(html, 'onchange="location.href=this.value"');
  });

  it("options contain flag emoji", () => {
    const html = renderSelector("/about", "en-US", locales);
    // en-US flag
    assertStringIncludes(html, localeToFlag("en-US"));
    // pt-BR flag
    assertStringIncludes(html, localeToFlag("pt-BR"));
    // es-ES flag
    assertStringIncludes(html, localeToFlag("es-ES"));
  });

  it("active locale option has selected attribute", () => {
    const html = renderSelector("/about", "en-US", locales);
    // Find the option for en-US and check it has selected
    const enOption =
      html.match(/<option[^>]*value="\/en-US\/about"[^>]*>/)?.[0] ?? "";
    assertStringIncludes(enOption, "selected");

    // pt-BR option should NOT have selected
    const ptOption =
      html.match(/<option[^>]*value="\/pt-BR\/about"[^>]*>/)?.[0] ?? "";
    assertEquals(ptOption.includes("selected"), false);
  });

  it("locales are sorted alphabetically", () => {
    const html = renderSelector("/", "en-US", locales);
    const values = [...html.matchAll(/value="([^"]+)"/g)].map((m) => m[1]);
    assertEquals(values, ["/en-US", "/es-ES", "/pt-BR"]);
  });

  it("has aria-label for accessibility", () => {
    const html = renderSelector("/", "en-US", locales);
    assertStringIncludes(html, 'aria-label="Language"');
  });
});

// ---------------------------------------------------------------------------
// renderSelectorFromTemplate
// ---------------------------------------------------------------------------

describe("renderSelectorFromTemplate", () => {
  const locales = ["pt-BR", "en-US", "es-ES"];

  it("renders template with wrapper and items", () => {
    const template =
      '<div class="lang-picker">{{i18n:item}}<a href="{{href}}">{{name}}</a>{{/i18n:item}}</div>';
    const result = renderSelectorFromTemplate(
      template,
      "/about",
      "en-US",
      locales,
    );
    assertStringIncludes(result, '<div class="lang-picker">');
    assertStringIncludes(result, "</div>");
    // Should have 3 links (sorted: en-US, es-ES, pt-BR)
    const linkCount = (result.match(/<a /g) || []).length;
    assertEquals(linkCount, 3);
  });

  it("resolves all placeholders", () => {
    const template =
      '{{i18n:item}}<a href="{{href}}" class="{{activeClass}}" {{ariaCurrent}} lang="{{locale}}">{{flag}} {{name}}</a>{{/i18n:item}}';
    const result = renderSelectorFromTemplate(
      template,
      "/docs",
      "pt-BR",
      locales,
    );

    // Check en-US item (not active)
    assertStringIncludes(result, 'href="/en-US/docs"');
    assertStringIncludes(result, 'lang="en-US"');
    assertStringIncludes(result, localeToFlag("en-US"));

    // Check pt-BR item (active)
    assertStringIncludes(result, 'href="/pt-BR/docs"');
    assertStringIncludes(result, 'class="active"');
    assertStringIncludes(result, 'aria-current="true"');
    assertStringIncludes(result, localeToFlag("pt-BR"));
  });

  it("activeClass is 'active' for current locale, '' for others", () => {
    const template =
      '{{i18n:item}}<span class="{{activeClass}}" data-locale="{{locale}}"></span>{{/i18n:item}}';
    const result = renderSelectorFromTemplate(
      template,
      "/",
      "es-ES",
      locales,
    );

    // es-ES should have class="active"
    const esSpan = result.match(/<span[^>]*data-locale="es-ES"[^>]*>/)?.[0] ??
      "";
    assertStringIncludes(esSpan, 'class="active"');

    // en-US should have class=""
    const enSpan = result.match(/<span[^>]*data-locale="en-US"[^>]*>/)?.[0] ??
      "";
    assertStringIncludes(enSpan, 'class=""');
  });

  it("ariaCurrent is aria-current=\"true\" for active, '' for others", () => {
    const template =
      '{{i18n:item}}<li {{ariaCurrent}} data-locale="{{locale}}"></li>{{/i18n:item}}';
    const result = renderSelectorFromTemplate(
      template,
      "/",
      "pt-BR",
      locales,
    );

    // pt-BR should have aria-current="true"
    const ptLi = result.match(/<li[^>]*data-locale="pt-BR"[^>]*>/)?.[0] ?? "";
    assertStringIncludes(ptLi, 'aria-current="true"');

    // en-US should NOT have aria-current
    const enLi = result.match(/<li[^>]*data-locale="en-US"[^>]*>/)?.[0] ?? "";
    assertEquals(enLi.includes("aria-current"), false);
  });

  it("returns template as-is when no {{i18n:item}} block", () => {
    const template = '<div class="static">No items here</div>';
    const result = renderSelectorFromTemplate(
      template,
      "/",
      "en-US",
      locales,
    );
    assertEquals(result, template);
  });

  it("renders locales in sorted order", () => {
    const template =
      '{{i18n:item}}<span data-locale="{{locale}}"></span>{{/i18n:item}}';
    const result = renderSelectorFromTemplate(
      template,
      "/",
      "en-US",
      ["pt-BR", "en-US", "es-ES"],
    );
    const renderedLocales = [...result.matchAll(/data-locale="([^"]+)"/g)].map(
      (m) => m[1],
    );
    assertEquals(renderedLocales, ["en-US", "es-ES", "pt-BR"]);
  });
});
