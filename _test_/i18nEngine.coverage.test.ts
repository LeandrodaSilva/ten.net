import { describe, it } from "@std/testing/bdd";
import { assertEquals, assertStringIncludes } from "@std/assert";
import {
  applyTranslations,
  findSelectorTemplate,
  findSelectorTemplateSync,
  injectHreflangLinks,
  localeToFlag,
  mergeTranslations,
  renderHreflang,
  renderSelector,
  renderSelectorFromTemplate,
  resolveEscapeHatches,
  resolveLocale,
  scanTranslationsSync,
  setHtmlLang,
  validateTranslations,
} from "../src/i18nEngine.ts";
import type { I18nMap } from "../src/core/types.ts";

function req(headers: Record<string, string> = {}): Request {
  return new Request("http://x/", { headers });
}

describe("i18nEngine — mergeTranslations", () => {
  const map: I18nMap = {
    "/": { en: { a: "1", b: "2" } },
    "/docs": { en: { b: "override", c: "3" } },
  };

  it("merges root → leaf with deeper keys overriding", () => {
    assertEquals(mergeTranslations(map, "/docs", "en"), {
      a: "1",
      b: "override",
      c: "3",
    });
  });

  it("returns {} when the locale is absent", () => {
    assertEquals(mergeTranslations(map, "/docs", "pt"), {});
  });
});

describe("i18nEngine — resolveLocale", () => {
  const locales = ["en", "pt-BR"];

  it("returns undefined when no locales are available", () => {
    assertEquals(resolveLocale(req(), "/about", []), {
      locale: undefined,
      strippedPath: "/about",
    });
  });

  it("resolves from a URL prefix and strips it", () => {
    assertEquals(resolveLocale(req(), "/pt-BR/about", locales), {
      locale: "pt-BR",
      strippedPath: "/about",
    });
  });

  it("strips a bare locale prefix to /", () => {
    assertEquals(resolveLocale(req(), "/pt-BR", locales).strippedPath, "/");
  });

  it("resolves from the ten_lang cookie", () => {
    const r = req({ cookie: "foo=1; ten_lang=en" });
    assertEquals(resolveLocale(r, "/about", locales).locale, "en");
  });

  it("resolves exact and prefix Accept-Language matches by quality", () => {
    assertEquals(
      resolveLocale(req({ "accept-language": "pt-BR" }), "/", locales).locale,
      "pt-BR",
    );
    // prefix: "pt" matches "pt-BR"
    assertEquals(
      resolveLocale(req({ "accept-language": "pt" }), "/", locales).locale,
      "pt-BR",
    );
    // quality ordering + wildcard ignored
    assertEquals(
      resolveLocale(
        req({ "accept-language": "fr;q=0.2, en;q=0.9, *;q=0.1" }),
        "/",
        locales,
      ).locale,
      "en",
    );
  });

  it("falls back to the first sorted locale", () => {
    assertEquals(resolveLocale(req(), "/about", ["en", "de"]).locale, "de");
  });
});

describe("i18nEngine — applyTranslations", () => {
  it("returns the input unchanged when there are no translations", () => {
    assertEquals(applyTranslations("<p>Hi</p>", {}), "<p>Hi</p>");
  });

  it("translates text but protects tags/scripts/styles", () => {
    assertEquals(
      applyTranslations("<p>Hello</p>", { Hello: "Olá" }),
      "<p>Olá</p>",
    );
    assertEquals(
      applyTranslations("<script>Hello</script>", { Hello: "Olá" }),
      "<script>Hello</script>",
    );
  });

  it("matches longest keys first with flexible whitespace", () => {
    assertEquals(
      applyTranslations("<p>Good   morning</p>", {
        "Good morning": "Bom dia",
        "Good": "Bom",
      }),
      "<p>Bom dia</p>",
    );
  });
});

describe("i18nEngine — escape hatches", () => {
  it("uses the translation when present and the fallback otherwise", () => {
    assertEquals(
      resolveEscapeHatches("{{t:hi}}Hi{{/t}}", { hi: "Olá" }),
      "Olá",
    );
    assertEquals(resolveEscapeHatches("{{t:hi}}Hi{{/t}}", {}), "Hi");
  });
});

describe("i18nEngine — flag + selectors", () => {
  it("converts locales to flag emoji", () => {
    assertEquals(localeToFlag("pt-BR"), "🇧🇷");
    assertEquals(localeToFlag("es"), "🇪🇸");
  });

  it("renders a <select> with options, hrefs, and the active selection", () => {
    const html = renderSelector("/about", "en", ["en", "pt-BR"]);
    assertStringIncludes(html, "<select");
    assertStringIncludes(html, 'value="/en/about"');
    assertStringIncludes(html, 'value="/pt-BR/about"');
    assertStringIncludes(html, "selected");
  });

  it("uses bare locale href on the root route", () => {
    assertStringIncludes(renderSelector("/", "en", ["en"]), 'value="/en"');
  });

  it("renders hreflang links with x-default and origin", () => {
    const html = renderHreflang("/about", ["en", "pt"], "https://x.com");
    assertStringIncludes(html, 'hreflang="en" href="https://x.com/en/about"');
    assertStringIncludes(
      html,
      'hreflang="x-default" href="https://x.com/about"',
    );
  });

  it("expands a custom selector template per locale", () => {
    const tpl =
      `{{i18n:item}}<a href="{{href}}" class="{{activeClass}}" {{ariaCurrent}}>{{flag}} {{name}} {{locale}} {{active}}</a>{{/i18n:item}}`;
    const html = renderSelectorFromTemplate(tpl, "/", "en", ["en", "pt-BR"]);
    assertStringIncludes(html, 'href="/en"');
    assertStringIncludes(html, 'href="/pt-BR"');
    assertStringIncludes(html, "active");
    assertStringIncludes(html, 'aria-current="true"');
  });

  it("returns the template unchanged when there is no item block", () => {
    assertEquals(
      renderSelectorFromTemplate("<div>no block</div>", "/", "en", [
        "en",
      ]),
      "<div>no block</div>",
    );
  });
});

describe("i18nEngine — HTML document helpers", () => {
  it("adds a lang attribute when missing", () => {
    assertEquals(setHtmlLang("<html>", "pt"), '<html lang="pt">');
  });

  it("replaces an existing lang attribute", () => {
    assertEquals(setHtmlLang('<html lang="en">', "pt"), '<html lang="pt">');
  });

  it("preserves other attributes when adding lang", () => {
    assertEquals(
      setHtmlLang('<html class="x">', "pt"),
      '<html class="x" lang="pt">',
    );
  });

  it("injects hreflang links before </head>", () => {
    assertEquals(
      injectHreflangLinks("<head></head>", "<link>"),
      "<head><link>\n</head>",
    );
  });
});

describe("i18nEngine — validateTranslations", () => {
  function captureWarn(fn: () => void): string[] {
    const original = console.warn;
    const out: string[] = [];
    console.warn = (...args: unknown[]) => {
      out.push(args.map(String).join(" "));
    };
    try {
      fn();
    } finally {
      console.warn = original;
    }
    return out;
  }

  it("returns early when there are no locales", () => {
    const warnings = captureWarn(() =>
      validateTranslations({}, { "/": "{{t:hi}}" })
    );
    assertEquals(warnings, []);
  });

  it("warns about escape-hatch keys missing in a locale", () => {
    const map: I18nMap = { "/": { en: { present: "x" } } };
    const warnings = captureWarn(() =>
      validateTranslations(map, { "/": "{{t:present}} {{t:missing}}" })
    );
    assertEquals(warnings.length, 1);
    assertStringIncludes(warnings[0], "missing");
  });

  it("skips templates with no escape-hatch keys", () => {
    const map: I18nMap = { "/": { en: { a: "1" } } };
    assertEquals(
      captureWarn(() => validateTranslations(map, { "/": "<p>x</p>" })),
      [],
    );
  });
});

describe("i18nEngine — filesystem scanning", () => {
  it("scans i18n.{locale}.json files into a hierarchical map", async () => {
    const dir = await Deno.makeTempDir({ prefix: "tennet_i18n_" });
    try {
      await Deno.writeTextFile(`${dir}/i18n.en.json`, '{"a":"1"}');
      await Deno.mkdir(`${dir}/docs`, { recursive: true });
      await Deno.writeTextFile(`${dir}/docs/i18n.pt.json`, '{"b":"2"}');
      await Deno.writeTextFile(`${dir}/i18n.bad.json`, "{ not json");
      await Deno.writeTextFile(`${dir}/ignore.txt`, "x");

      const map = scanTranslationsSync(dir);
      assertEquals(map["/"].en, { a: "1" });
      assertEquals(map["/docs"].pt, { b: "2" });
      assertEquals("bad" in (map["/"] ?? {}), false);
    } finally {
      await Deno.remove(dir, { recursive: true });
    }
  });

  it("returns {} for a non-existent directory", () => {
    assertEquals(scanTranslationsSync("./__no_such_dir__"), {});
  });

  it("finds the nearest i18n-selector.html (sync + async)", async () => {
    const dir = await Deno.makeTempDir({ prefix: "tennet_sel_" });
    try {
      await Deno.mkdir(`${dir}/docs`, { recursive: true });
      await Deno.writeTextFile(`${dir}/i18n-selector.html`, "<root/>");
      await Deno.writeTextFile(`${dir}/docs/i18n-selector.html`, "<docs/>");

      assertEquals(findSelectorTemplateSync(dir, "/docs"), "<docs/>");
      assertEquals(findSelectorTemplateSync(dir, "/"), "<root/>");
      assertEquals(await findSelectorTemplate(dir, "/docs"), "<docs/>");
      assertEquals(findSelectorTemplateSync(`${dir}/nope`, "/"), undefined);
    } finally {
      await Deno.remove(dir, { recursive: true });
    }
  });
});
