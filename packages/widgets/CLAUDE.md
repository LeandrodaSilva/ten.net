# packages/widgets

Widget system: registry, KV-backed store, permissions, audit logging, media
storage, and 10 builtin widgets.

## Key Files

- `src/widgetStore.ts` — KV CRUD for widget instances (210 loc). Atomic ops, CAS
  reorder, ID validation regex
- `src/mediaStore.ts` — Chunked media storage (248 loc). 60KB chunks (< 64KB KV
  limit), 5MB max, magic byte validation
- `src/types.ts` — Type definitions (122 loc): `WidgetInstance`,
  `WidgetDefinition`, `WidgetFieldSchema`, `WidgetType`, `PlaceholderMap`
- `src/widgetRegistry.ts` — Singleton registry (35 loc): `register()`, `get()`,
  `all()`
- `src/widgetPermissionsStore.ts` — Role-based widget access (56 loc). Fallback:
  restricted → admin-only, others → all roles
- `src/widgetAuditLogger.ts` — Semantic audit logging (117 loc): logCreate,
  logUpdate, logDelete, logReorder, logDuplicate

## Builtin Widgets

hero, rich-text, image, gallery, columns, cta-button, spacer, html (restricted),
embed (restricted), contact-form. All render to HTML strings with Tailwind
classes. Registered via `registerBuiltinWidgets()`.

## KV Key Schemas

- Widgets: `["widgets", pageId, "instance", widgetId]`
- Permissions: `["widget-permissions", roleSlug, widgetType]`
- Media items: `["media", "items", id]`
- Media chunks: `["media", "chunks", id, chunkIndex]` (60KB each)
- Media manifest: `["media", "manifest", id]`
- Media index: `["media", "index", "name", lowerName, id]`

## Patterns

- Each widget: `WidgetDefinition` with `type`, `label`, `fields`,
  `render(instance, context?) → string`
- Custom widgets use `custom:${string}` type convention
- Restricted widgets (`html`, `embed`): `restricted: true` → admin-only by
  default, overridable via WidgetPermissionsStore
- URL sanitization: `sanitizeUrl()` blocks `javascript:`, `data:`, `vbscript:`
- HTML escaping: `escapeHtml()` for text, `escapeAttr()` for attributes
- Nested widgets: columns creates sub-placeholders
  `columns:{instanceId}:col:{n}`, receives children via `context.subWidgets`
- Media upload: validate MIME + magic bytes → chunk → store metadata + index

## Gotchas

- `widgetRegistry` is singleton in-memory — not persisted, must call
  `registerBuiltinWidgets()` at startup
- Audit failures are silently swallowed — never block widget CRUD operations
- Media chunking: 60KB per chunk to stay under Deno KV's 64KB value limit
- `widgetStore.loadForPage()` uses single KV list op — auto-sorts by placeholder
  then order
- SVG serving includes `Content-Security-Policy: script-src 'none'` to prevent
  XSS

## Dependencies

`@leproj/tennet` (Plugin, Storage interfaces). No dependency on admin package.
