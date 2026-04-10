import type { Route } from "./models/Route.ts";
import type { AppManifest } from "./build/manifest.ts";
import type { I18nMap } from "./core/types.ts";
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
}

export async function viewEngine(args: IViewEngine) {
  const {
    _appPath,
    route,
    req,
    params,
    embedded,
  } = args;
  let pageModule = route.page;
  let layoutContents: string[] = [];
  let documentLayout: string | undefined;

  if (false === route.isAdmin) {
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
      const layouts = await findOrderedLayouts(_appPath, route.path);
      documentLayout = await findDocumentLayoutRoot(_appPath);
      for (const layoutPath of layouts) {
        layoutContents.push(await Deno.readTextFile(layoutPath));
      }
    }
  }

  if (layoutContents) {
    // Wrap with layouts (leaf → root)
    for (let i = layoutContents.length - 1; i >= 0; i--) {
      pageModule = layoutContents[i].replace("{{content}}", pageModule);
    }
    // Document is the OUTERMOST layer
    if (documentLayout) {
      pageModule = documentLayout.replace("{{content}}", pageModule);
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
        (_appPath
          ? await findSelectorTemplate(_appPath, route.path)
          : undefined);

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
}
