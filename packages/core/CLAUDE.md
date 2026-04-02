# packages/core

Framework core: server, file-based routing, HTML templates, build system, plugin
base.

## Key Files

- `src/ten.ts` — Core `Ten` class (339 loc). Static methods: `Ten.net()`,
  `Ten.build()`. Instance: `use()`, `useAdmin()`, `start()`
- `src/mod.ts` — Public exports: `Ten`, `Plugin`, `Route`, `Middleware`,
  `DynamicRouteRegistry`, `BlogRouteRegistry`
- `src/routerEngine.ts` — Scans `app/` directory, transpiles `.ts` routes,
  builds Route objects
- `src/viewEngine.ts` — Renders `{{key}}` placeholders in HTML templates, nests
  layouts
- `src/paramsEngine.ts` — Extracts URL params from dynamic `[param]` segments

## Subsystems

- **build/** — Compiles app to encrypted binary. Collector scans `app/`, code
  generator produces embedded TS, crypto provides AES-256-GCM. Entry:
  `buildCommand.ts`
- **routing/** — `DynamicRouteRegistry` (admin pages), `BlogRouteRegistry`
  (posts + RSS), `widgetPageHandler` (resolves `{{widgets:name}}`)
- **models/** — `Plugin` (abstract base), `Route` (path + regex + handlers),
  `Storage` (pluggable interface + InMemoryStorage), `Permission`
- **utils/** — `evaluateModuleCode`, `getRegexRoute`, `transpileRoute`,
  `findOrderedLayouts`, `htmlEscape`, `toSlug`
- **embedded/** — `embeddedRouterEngine` creates Routes from AppManifest in
  compiled mode
- **middleware/** — `Middleware` type definition (req, next) => Response

## Patterns

- Route pattern `/users/[id]` → regex `^/users/[^/]+$` → params `{ id: "123" }`
- Template: `{{key}}` = XSS-escaped, `{{{key}}}` = raw HTML (unescaped)
- Layouts nest hierarchically: found root→deepest, applied deepest→root
- Route handlers export named functions: `GET`, `POST`, `PUT`, `DELETE`
- Only GET requests render page templates; other methods return data
- Plugin: extend `Plugin` with `name`, `description`, `model` schema, `storage`

## Gotchas

- `evaluateModuleCode()` uses Function constructor (not `import()`) for
  `deno
  compile` compatibility — `import()` fails with blob/data URIs in
  binaries
- Slug `"404"` is special in DynamicRouteRegistry — stored separately, matched
  in `Ten._handle404()`
- Dynamic pages skip admin layouts (`route.isAdmin` check in viewEngine)
- `Route.isViewForMethod()` — only GET renders pages; POST/PUT/DELETE return
  response data
- Build entry is `buildCommand.ts` (not `build.ts`)

## Dependencies

`@deno/emit` (transpilation), `@std/*` (assertions, path, fs, cli). No
dependency on admin or widgets packages.
