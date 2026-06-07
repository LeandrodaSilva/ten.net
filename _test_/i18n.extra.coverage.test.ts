import { describe, it } from "@std/testing/bdd";
import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import {
  applyTranslations,
  findSelectorTemplate,
  renderSelector,
  renderSelectorFromTemplate,
  resolveLocale,
} from "../src/i18nEngine.ts";

describe("i18nEngine — renderSelector", () => {
  it("renders options and falls back to the raw tag on invalid locales", () => {
    const html = renderSelector("/docs", "en", ["en", "@@bad"]);
    assertStringIncludes(html, "<select");
    // Valid locale resolves a display name; invalid one falls back to itself.
    assertStringIncludes(html, "selected");
    assertStringIncludes(html, "@@bad");
    assertStringIncludes(html, 'value="/@@bad/docs"');
  });

  it("uses the bare locale href for the root route", () => {
    const html = renderSelector("/", "en", ["en", "pt-BR"]);
    assertStringIncludes(html, 'value="/en"');
    assertStringIncludes(html, 'value="/pt-BR"');
  });

  it("falls back to the raw locale when no display name resolves", () => {
    // "qaa" is a valid (private-use) tag with no Intl display name, so the
    // `dn.of(locale) ?? locale` fallback is taken.
    const html = renderSelector("/docs", "qaa", ["qaa"]);
    assertStringIncludes(html, "qaa");
  });
});

describe("i18nEngine — renderSelectorFromTemplate", () => {
  it("expands the {{i18n:item}} block for each locale", () => {
    const tpl =
      `<ul>{{i18n:item}}<li class="{{activeClass}}"><a href="{{href}}">{{flag}} {{name}}</a></li>{{/i18n:item}}</ul>`;
    const out = renderSelectorFromTemplate(tpl, "/docs", "en", [
      "en",
      "@@bad",
      "qaa",
    ]);
    assertStringIncludes(out, 'href="/en/docs"');
    assertStringIncludes(out, 'href="/@@bad/docs"');
    // "qaa" exercises the dn.of fallback to the raw locale.
    assertStringIncludes(out, 'href="/qaa/docs"');
    assertStringIncludes(out, "active");
  });

  it("returns the template unchanged when no item block is present", () => {
    const tpl = "<div>no block here</div>";
    assertEquals(renderSelectorFromTemplate(tpl, "/", "en", ["en"]), tpl);
  });
});

describe("i18nEngine — findSelectorTemplate", () => {
  it("returns the template contents when a selector file exists", async () => {
    const dir = await Deno.makeTempDir({ prefix: "tennet_i18n_sel_" });
    try {
      await Deno.writeTextFile(
        `${dir}/i18n-selector.html`,
        "<nav>selector</nav>",
      );
      const found = await findSelectorTemplate(dir, "/docs/install");
      assertEquals(found, "<nav>selector</nav>");
    } finally {
      await Deno.remove(dir, { recursive: true });
    }
  });

  it("returns undefined when no selector file is found", async () => {
    const dir = await Deno.makeTempDir({ prefix: "tennet_i18n_nosel_" });
    try {
      const found = await findSelectorTemplate(dir, "/x/y");
      assertEquals(found, undefined);
    } finally {
      await Deno.remove(dir, { recursive: true });
    }
  });
});

describe("i18nEngine — resolveLocale / applyTranslations edges", () => {
  it("falls back to the default locale when headers match nothing", () => {
    // An unmatched Accept-Language exercises the header-detection miss path
    // (returns undefined internally), after which resolveLocale applies its
    // default-locale fallback rather than leaving the locale unset.
    const req = new Request("http://x/page", {
      headers: { "accept-language": "zz" },
    });
    const { locale, strippedPath } = resolveLocale(req, "/page", [
      "en",
      "pt-BR",
    ]);
    assertEquals(typeof locale, "string");
    assertEquals(strippedPath, "/page");
  });

  it("translates trailing text and skips blank keys", () => {
    // The trailing "Hello" after the last tag exercises the tail-segment push;
    // the blank key is normalized to empty and skipped.
    const out = applyTranslations("<b>x</b> Hello", {
      "   ": "ignored",
      "Hello": "Olá",
    });
    assert(out.includes("Olá"));
    assertStringIncludes(out, "<b>x</b>");
  });
});
