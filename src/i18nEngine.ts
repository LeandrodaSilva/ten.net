import type { I18nMap } from "./core/types.ts";

/**
 * Scans the application directory for `i18n.{locale}.json` files and builds
 * a hierarchical translation map indexed by normalized route directory and locale.
 *
 * @param appPath - Root application directory to scan
 * @returns A populated {@link I18nMap}
 */
export function scanTranslationsSync(appPath: string): I18nMap {
  const i18nMap: I18nMap = {};
  const normalizedAppPath = appPath.replace(/\\/g, "/").replace(/^\.\//, "")
    .replace(/\/$/, "");

  walkDirSync(normalizedAppPath, normalizedAppPath, i18nMap);

  return i18nMap;
}

/**
 * Async version of {@link scanTranslationsSync}.
 *
 * @param appPath - Root application directory to scan
 * @returns A populated {@link I18nMap}
 */
export function scanTranslations(appPath: string): I18nMap {
  return scanTranslationsSync(appPath);
}

/** Recursively walk directories and collect i18n files. */
function walkDirSync(
  dir: string,
  normalizedAppPath: string,
  i18nMap: I18nMap,
): void {
  let entries: Iterable<Deno.DirEntry>;
  try {
    entries = Deno.readDirSync(dir);
  } catch {
    return;
  }

  for (const entry of entries) {
    const fullPath = `${dir}/${entry.name}`;

    if (entry.isDirectory) {
      walkDirSync(fullPath, normalizedAppPath, i18nMap);
      continue;
    }

    if (!entry.isFile) continue;

    const match = entry.name.match(/^i18n\.(.+)\.json$/);
    if (!match) continue;

    const locale = match[1];
    const normalizedDir = dir.replace(/\\/g, "/").replace(/^\.\//, "");
    const rel = normalizedDir.startsWith(normalizedAppPath)
      ? normalizedDir.slice(normalizedAppPath.length)
      : normalizedDir;
    const routeDir = rel.length ? rel : "/";

    let translations: Record<string, string>;
    try {
      translations = JSON.parse(Deno.readTextFileSync(fullPath));
    } catch {
      continue;
    }

    if (!i18nMap[routeDir]) i18nMap[routeDir] = {};
    i18nMap[routeDir][locale] = translations;
  }
}

/**
 * Merges translations from root to the deepest matching route segment,
 * following the same hierarchical walk as layout resolution.
 * Deeper keys override shallower ones (shallow merge).
 *
 * @param i18nMap - The pre-scanned translation map
 * @param routePath - The route path (e.g. `/users/profile`)
 * @param locale - Target locale (e.g. `pt-BR`)
 * @returns Merged translation record, or `{}` if locale has no translations
 */
export function mergeTranslations(
  i18nMap: I18nMap,
  routePath: string,
  locale: string,
): Record<string, string> {
  const segments = routePath.split("/").filter(Boolean);
  const result: Record<string, string> = {};

  // Walk root -> leaf, same as findOrderedLayouts
  const paths = ["/"];
  let current = "";
  for (const segment of segments) {
    current += `/${segment}`;
    paths.push(current);
  }

  for (const p of paths) {
    const localeMap = i18nMap[p];
    if (!localeMap) continue;
    const translations = localeMap[locale];
    if (!translations) continue;
    Object.assign(result, translations);
  }

  return result;
}

/**
 * Resolves the active locale from a request using a priority chain:
 * 1. URL prefix (`/pt-BR/about` -> `pt-BR`)
 * 2. Cookie `ten_lang`
 * 3. `Accept-Language` header (best match)
 * 4. First available locale (alphabetically sorted)
 *
 * @param req - Incoming HTTP request
 * @param path - Request pathname
 * @param availableLocales - Known locales from the i18n map
 * @returns The resolved locale and the path with the locale prefix stripped
 */
export function resolveLocale(
  req: Request,
  path: string,
  availableLocales: string[],
): { locale: string | undefined; strippedPath: string } {
  if (availableLocales.length === 0) {
    return { locale: undefined, strippedPath: path };
  }

  const sorted = [...availableLocales].sort();

  // 1. URL prefix
  const segments = path.split("/").filter(Boolean);
  if (segments.length > 0 && sorted.includes(segments[0])) {
    const locale = segments[0];
    const stripped = "/" + segments.slice(1).join("/");
    return { locale, strippedPath: stripped || "/" };
  }

  // 2. Cookie
  const cookieHeader = req.headers.get("cookie") ?? "";
  const cookieLocale = parseCookieValue(cookieHeader, "ten_lang");
  if (cookieLocale && sorted.includes(cookieLocale)) {
    return { locale: cookieLocale, strippedPath: path };
  }

  // 3. Accept-Language
  const acceptLang = req.headers.get("accept-language");
  if (acceptLang) {
    const best = matchAcceptLanguage(acceptLang, sorted);
    if (best) return { locale: best, strippedPath: path };
  }

  // 4. First available (sorted)
  return { locale: sorted[0], strippedPath: path };
}

/** Extract a cookie value by name from a Cookie header string. */
function parseCookieValue(header: string, name: string): string | undefined {
  for (const part of header.split(";")) {
    const [k, ...rest] = part.split("=");
    if (k.trim() === name) return rest.join("=").trim();
  }
  return undefined;
}

/**
 * Parse Accept-Language header and find best match against available locales.
 * Supports exact match and prefix match (e.g. `pt-BR` matches `pt`).
 */
function matchAcceptLanguage(
  header: string,
  available: string[],
): string | undefined {
  const entries: { lang: string; q: number }[] = [];

  for (const part of header.split(",")) {
    const trimmed = part.trim();
    const [lang, ...params] = trimmed.split(";");
    let q = 1;
    for (const p of params) {
      const m = p.trim().match(/^q=(\d+(?:\.\d+)?)$/);
      if (m) q = parseFloat(m[1]);
    }
    if (lang.trim() !== "*") {
      entries.push({ lang: lang.trim(), q });
    }
  }

  // Sort by quality descending
  entries.sort((a, b) => b.q - a.q);

  for (const { lang } of entries) {
    // Exact match
    if (available.includes(lang)) return lang;

    // Prefix match: requested `pt` matches `pt-BR`
    const prefix = lang.split("-")[0];
    const match = available.find(
      (a) => a === prefix || a.startsWith(prefix + "-"),
    );
    if (match) return match;
  }

  return undefined;
}

/**
 * Applies content-based translations to HTML.
 * Protects tags, scripts, styles, and comments from translation.
 * Matches are normalized (whitespace-collapsed) but original whitespace is preserved.
 * Longest keys are matched first to avoid partial replacements.
 *
 * @param html - Source HTML string
 * @param translations - Key-value translation pairs
 * @returns HTML with translated text segments
 */
export function applyTranslations(
  html: string,
  translations: Record<string, string>,
): string {
  if (Object.keys(translations).length === 0) return html;

  // Split HTML into protected (tags/scripts/styles/comments) and text segments
  const protectedRegex =
    /<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<!--[\s\S]*?-->|<[^>]+>/gi;

  const parts: { text: string; isProtected: boolean }[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = protectedRegex.exec(html)) !== null) {
    if (match.index > lastIndex) {
      parts.push({
        text: html.slice(lastIndex, match.index),
        isProtected: false,
      });
    }
    parts.push({ text: match[0], isProtected: true });
    lastIndex = protectedRegex.lastIndex;
  }
  if (lastIndex < html.length) {
    parts.push({ text: html.slice(lastIndex), isProtected: false });
  }

  // Sort keys longest first
  const sortedKeys = Object.keys(translations).sort(
    (a, b) => b.length - a.length,
  );

  // Normalize helper: trim + collapse internal whitespace
  const normalize = (s: string) => s.trim().replace(/\s+/g, " ");

  // Translate text segments
  for (let i = 0; i < parts.length; i++) {
    if (parts[i].isProtected) continue;

    let segment = parts[i].text;

    for (const key of sortedKeys) {
      const normalizedKey = normalize(key);
      if (!normalizedKey) continue;

      if (!normalize(segment).includes(normalizedKey)) {
        continue;
      }

      // Build a regex that matches the key with flexible whitespace
      const escapedKey = normalizedKey.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const flexPattern = escapedKey.replace(/ /g, "\\s+");
      const keyRegex = new RegExp(flexPattern, "g");

      segment = segment.replace(keyRegex, translations[key]);
    }

    parts[i].text = segment;
  }

  return parts.map((p) => p.text).join("");
}

/**
 * Resolves escape-hatch translation markers in the form `{{t:key}}fallback{{/t}}`.
 * If the key exists in translations, the entire block is replaced by the translated value.
 * Otherwise, only the fallback text is kept.
 *
 * @param html - HTML string with escape-hatch markers
 * @param translations - Key-value translation pairs
 * @returns HTML with resolved markers
 */
export function resolveEscapeHatches(
  html: string,
  translations: Record<string, string>,
): string {
  return html.replace(
    /\{\{t:(\w+)\}\}([\s\S]*?)\{\{\/t\}\}/g,
    (_, key: string, fallback: string) => {
      return key in translations ? translations[key] : fallback;
    },
  );
}

/**
 * Renders an HTML language selector navigation element.
 * Each locale gets a link with `hreflang` and `lang` attributes.
 * Uses `Intl.DisplayNames` for endonyms (language names in their own script).
 *
 * @param routePath - Current route path (without locale prefix)
 * @param currentLocale - Currently active locale
 * @param availableLocales - All available locales
 * @returns HTML string for the language selector
 */
export function renderSelector(
  routePath: string,
  currentLocale: string,
  availableLocales: string[],
): string {
  const sorted = [...availableLocales].sort();

  const links = sorted.map((locale) => {
    let displayName: string;
    try {
      const dn = new Intl.DisplayNames([locale], { type: "language" });
      displayName = dn.of(locale) ?? locale;
    } catch {
      displayName = locale;
    }

    const href = `/${locale}${routePath === "/" ? "" : routePath}`;
    const ariaCurrent = locale === currentLocale ? ' aria-current="true"' : "";

    return `<a href="${href}" hreflang="${locale}" lang="${locale}"${ariaCurrent}>${displayName}</a>`;
  });

  return `<nav class="i18n-selector" aria-label="Language">${
    links.join("")
  }</nav>`;
}

/**
 * Renders `<link rel="alternate" hreflang="...">` tags for SEO.
 * Includes an `x-default` entry pointing to the bare route path.
 *
 * @param routePath - Current route path (without locale prefix)
 * @param availableLocales - All available locales
 * @returns HTML string with hreflang link elements
 */
export function renderHreflang(
  routePath: string,
  availableLocales: string[],
): string {
  const sorted = [...availableLocales].sort();
  const links = sorted.map((locale) => {
    const href = `/${locale}${routePath === "/" ? "" : routePath}`;
    return `<link rel="alternate" hreflang="${locale}" href="${href}" />`;
  });

  links.push(
    `<link rel="alternate" hreflang="x-default" href="${routePath}" />`,
  );

  return links.join("\n");
}

/**
 * Sets the `lang` attribute on the `<html>` element.
 * Adds the attribute if missing, or replaces an existing value.
 *
 * @param html - Full HTML document string
 * @param locale - Locale to set (e.g. `pt-BR`)
 * @returns HTML with updated `<html lang="...">` tag
 */
export function setHtmlLang(html: string, locale: string): string {
  return html.replace(/<html([^>]*)>/, (_match, attrs: string) => {
    if (/lang\s*=\s*["']/.test(attrs)) {
      // Replace existing lang value
      const updated = attrs.replace(
        /lang\s*=\s*["'][^"']*["']/,
        `lang="${locale}"`,
      );
      return `<html${updated}>`;
    }
    // Add lang attribute
    return `<html${attrs} lang="${locale}">`;
  });
}

/**
 * Injects hreflang `<link>` elements before the closing `</head>` tag.
 *
 * @param html - Full HTML document string
 * @param hreflangHtml - Pre-rendered hreflang link elements
 * @returns HTML with hreflang links injected into `<head>`
 */
export function injectHreflangLinks(
  html: string,
  hreflangHtml: string,
): string {
  return html.replace("</head>", `${hreflangHtml}\n</head>`);
}

/**
 * Validates translation completeness at dev-time startup.
 * Logs warnings for escape-hatch keys (`{{t:key}}`) missing in any locale.
 *
 * @param i18nMap - The pre-scanned translation map
 * @param templates - Map of routePath to full rendered template HTML (page + layouts)
 */
export function validateTranslations(
  i18nMap: I18nMap,
  templates: Record<string, string>,
): void {
  // Collect all available locales across every directory in the map
  const localeSet = new Set<string>();
  for (const dir of Object.values(i18nMap)) {
    for (const locale of Object.keys(dir)) {
      localeSet.add(locale);
    }
  }

  if (localeSet.size === 0) return;

  const locales = [...localeSet].sort();

  for (const [routePath, template] of Object.entries(templates)) {
    // Extract escape-hatch keys: {{t:key}}
    const keySet = new Set<string>();
    const escapeHatchRegex = /\{\{t:(\w+)\}\}/g;
    let match: RegExpExecArray | null;
    while ((match = escapeHatchRegex.exec(template)) !== null) {
      keySet.add(match[1]);
    }

    if (keySet.size === 0) continue;

    for (const locale of locales) {
      const merged = mergeTranslations(i18nMap, routePath, locale);
      for (const key of keySet) {
        if (!(key in merged)) {
          console.warn(
            `\u26A0 i18n: key "${key}" missing in locale "${locale}" for route ${routePath}`,
          );
        }
      }
    }
  }
}
