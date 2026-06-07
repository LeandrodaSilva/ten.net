import type { Route } from "./models/Route.ts";
import type { AppManifest } from "./build/manifest.ts";
import type { I18nMap, TemplateRenderer } from "./core/types.ts";
import { escapeHtml } from "./utils/htmlEscape.ts";

type ViewDataHandler = (
  req: Request,
  ctx?: { params: Record<string, string>; locale?: string },
) => Response | Promise<Response>;

interface IViewEngine {
  _appPath: string;
  route: Route;
  req: Request;
  params: Record<string, string>;
  handler?: ViewDataHandler;
  embedded?: AppManifest;
  tailwindCss?: string;
  locale?: string;
  i18n?: I18nMap;
  /**
   * Optional cache of assembled, layout-wrapped template shells keyed by route
   * path. When provided, the static parts of a view (page + layouts + document)
   * are built once and reused across requests, avoiding repeated filesystem
   * reads and string wrapping. Invalidated by the owner when routes change.
   */
  shellCache?: Map<string, string>;
  /**
   * Optional custom template renderer. When provided, it replaces the built-in
   * `{{key}}` mustache substitution for view routes that return JSON data.
   */
  renderer?: TemplateRenderer;
}

/**
 * Build the static template "shell" — the page wrapped by its ordered layouts
 * and the root document — before any per-request variable substitution.
 *
 * The shell never changes between requests for a given route, so it is the
 * precompilable part of a view and is memoized via {@link IViewEngine.shellCache}.
 */
async function buildShell(
  route: Route,
  appPath: string,
  embedded?: AppManifest,
): Promise<string> {
  let shell = route.page;
  let layoutContents: string[] = [];
  let documentLayout: string | undefined;

  if (route.isAdmin === false) {
    if (embedded) {
      documentLayout = embedded.documentHtml;
      layoutContents = embedded.layouts[route.path] ?? [];
    } else {
      const { findOrderedLayouts } = await import(
        "./utils/findOrderedLayouts.ts"
      );
      const { findDocumentLayoutRoot } = await import(
        "./utils/findDocumentLayoutRoot.ts"
      );
      const layouts = await findOrderedLayouts(appPath, route.path);
      documentLayout = await findDocumentLayoutRoot(appPath);
      for (const layoutPath of layouts) {
        layoutContents.push(await Deno.readTextFile(layoutPath));
      }
    }
  }

  // Wrap with layouts (leaf → root)
  for (let i = layoutContents.length - 1; i >= 0; i--) {
    shell = layoutContents[i].replace("{{content}}", shell);
  }
  // Document is the OUTERMOST layer
  if (documentLayout) {
    shell = documentLayout.replace("{{content}}", shell);
  }
  return shell;
}

export async function viewEngine(args: IViewEngine) {
  const {
    _appPath,
    route,
    req,
    params,
    embedded,
    shellCache,
  } = args;

  // Resolve the assembled template shell (cached when a cache is provided).
  let pageModule = shellCache?.get(route.path);
  if (pageModule === undefined) {
    pageModule = await buildShell(route, _appPath, embedded);
    shellCache?.set(route.path, pageModule);
  }

  const handler = args.handler ?? route.run;
  if (handler) {
    const routeResponse = await handler(req, {
      params,
      locale: args.locale,
    }) as Response;

    if (routeResponse) {
      const contentType = routeResponse.headers.get("Content-Type") ?? "";
      if (!contentType.toLowerCase().includes("application/json")) {
        throw new Error(
          `View route ${route.path} must return application/json data.`,
        );
      }

      let body: Record<string, unknown>;
      try {
        body = await routeResponse.json();
      } catch (error) {
        throw new Error(
          `View route ${route.path} returned invalid JSON data.`,
          { cause: error },
        );
      }
      if (!body || typeof body !== "object" || Array.isArray(body)) {
        throw new Error(
          `View route ${route.path} must return a JSON object.`,
        );
      }

      if (args.renderer) {
        // Custom renderer replaces the built-in mustache substitution.
        pageModule = await args.renderer(pageModule, body, {
          route: route.path,
          locale: args.locale,
        });
      } else {
        const keys = Object.keys(body);

        keys.forEach((key) => {
          // Triple-brace: raw output (unescaped)
          pageModule = String(pageModule).replaceAll(
            `{{{${key}}}}`,
            String(body[key]),
          );
          // Double-brace: escaped output (XSS-safe)
          pageModule = String(pageModule).replaceAll(
            `{{${key}}}`,
            escapeHtml(String(body[key])),
          );
        });
      }
    }
  }

  // i18n translation (after variable replacement)
  if (args.locale && args.i18n) {
    const {
      mergeTranslations,
      resolveEscapeHatches,
      applyTranslations,
      renderSelector,
      renderSelectorFromTemplate,
      findSelectorTemplate,
      renderHreflang,
      setHtmlLang,
      injectHreflangLinks,
    } = await import("./i18nEngine.ts");

    const translations = mergeTranslations(
      args.i18n,
      route.path,
      args.locale,
    );

    // Resolve escape hatches first
    pageModule = resolveEscapeHatches(pageModule, translations);

    // Apply automatic text translations
    pageModule = applyTranslations(pageModule, translations);

    // Render language selector
    const availableLocales = [
      ...new Set(
        Object.values(args.i18n).flatMap((dir) => Object.keys(dir)),
      ),
    ].sort();

    // Try custom selector template (hierarchical lookup)
    let selectorHtml: string;
    const customTemplate = embedded?.selectorTemplates?.[route.path] ??
      (_appPath ? await findSelectorTemplate(_appPath, route.path) : undefined);

    if (customTemplate) {
      selectorHtml = renderSelectorFromTemplate(
        customTemplate,
        route.path,
        args.locale,
        availableLocales,
      );
    } else {
      selectorHtml = renderSelector(
        route.path,
        args.locale,
        availableLocales,
      );
    }
    pageModule = pageModule.replaceAll("{{i18n:selector}}", selectorHtml);

    // Set HTML lang attribute
    pageModule = setHtmlLang(pageModule, args.locale);

    // Inject hreflang links
    pageModule = injectHreflangLinks(
      pageModule,
      renderHreflang(
        route.path,
        availableLocales,
        new URL(req.url).origin,
      ),
    );
  }

  // Inject Tailwind CSS inline (dev mode only — embedded already has it baked in)
  if (args.tailwindCss && !embedded) {
    const { injectTailwindCss } = await import("./tailwind/inject.ts");
    pageModule = injectTailwindCss(pageModule, args.tailwindCss);
  }

  return pageModule;
}
