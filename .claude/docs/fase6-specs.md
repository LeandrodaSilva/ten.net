# Fase 6 — Specs Tecnicas: Widgets e Page Builder

> Criado em: 2026-03-29 Status: Planejado Depende de: Fase 5 (concluida, v0.7.0)

## Objetivo

Sistema de page builder visual estilo Django CMS. Equipes de marketing montam
paginas arrastando widgets (componentes visuais) em placeholders definidos nos
templates, sem necessidade de codigo.

## Entrega

1. **WidgetRegistry** — singleton in-memory para definicoes de widgets
2. **WidgetStore** — CRUD de instancias de widgets no Deno KV
3. **Placeholder syntax** — `{{widgets:nome}}` nos templates de paginas
4. **10 widgets built-in** — Hero, RichText, Image, CTA Button, Spacer,
   ContactForm, Gallery, HTML raw, Embed, Columns/Grid
5. **Page Builder editor** — UI admin com drag-and-drop (Sortable.js)
6. **Preview ao vivo** — iframe com renderizacao em tempo real
7. **API publica** — `widgetRegistry.register()` para widgets customizados
8. **Permissoes por widget** — integrado com sistema de roles (Fase 5)

## Decisoes Tecnicas

1. **WidgetRegistry (in-memory) + WidgetStore (KV)**: Separacao limpa entre
   definicao (codigo, registrada ao startup) e instancia (dados, persistida no
   KV). Registry nao persiste — definicoes sao codigo, nao data.

2. **Placeholder syntax `{{widgets:nome}}`**: Extensao natural do template
   engine existente (`{{variable}}`). Resolve no rendering pipeline antes de
   injetar nos layouts.

3. **`widgets_enabled: boolean` na PagePlugin**: Ativa o novo pipeline de
   widgets. Se `false` (ou ausente), usa pipeline legado com `body` HTML. Zero
   breaking change para paginas existentes.

4. **Schema KV dedicado para widgets**:
   ```
   ["widgets", pageId, "instance", widgetId] → WidgetInstance
   ```
   Cada widget e uma entrada separada (nao array unico) para evitar o limite de
   64KB do KV e permitir operacoes atomicas.

5. **Sortable.js via CDN**: Alinhado com padrao existente (Tailwind CDN).
   Carregado apenas nas rotas do builder, nunca no front publico. Inicializado
   via `<Script>` component (padrao existente).

6. **Nesting limitado a 1 nivel**: Columns/Grid aceita widgets filhos, mas
   filhos nao podem conter sub-placeholders. Evita recursao infinita e
   complexidade exponencial.

7. **Backward-compatible**: Paginas sem `widgets_enabled` continuam funcionando
   com `body` HTML legado. Migration v3 seta `widgets_enabled: false` em todas
   as paginas existentes.

8. **Widgets restritos por permissao**: HTML raw e Embed sao restritos por role.
   Integrado com PermissionsStore (Fase 5). Widgets restritos nao aparecem na
   paleta para roles sem permissao.

## Data Model

### WidgetInstance (persistido no KV)

```typescript
interface WidgetInstance {
  id: string;
  type: WidgetType; // "hero" | "rich-text" | "custom:my-widget"
  placeholder: string; // "main", "sidebar"
  order: number; // posicao dentro do placeholder (0-based)
  data: Record<string, unknown>; // props especificas do widget
  created_at: string;
  updated_at: string;
}
```

### WidgetDefinition (registrada no Registry, nao persistida)

```typescript
interface WidgetDefinition {
  type: WidgetType;
  label: string;
  description: string;
  icon?: string;
  fields: WidgetFieldSchema[];
  render(data: Record<string, unknown>): string; // retorna HTML
  defaultPlaceholder?: string;
}
```

### WidgetFieldSchema

```typescript
interface WidgetFieldSchema {
  name: string;
  label: string;
  type:
    | "text"
    | "textarea"
    | "rich-text"
    | "image"
    | "url"
    | "select"
    | "number";
  required?: boolean;
  options?: { value: string; label: string }[];
  default?: unknown;
}
```

## Sub-fases

### 6a — Fundacao (Types, Registry, Store)

**Arquivos novos:**

- `src/widgets/types.ts`
- `src/widgets/widgetRegistry.ts`
- `src/widgets/widgetStore.ts`
- `src/test/widget-registry.test.ts`
- `src/test/widget-store.test.ts`

**Arquivos modificados:**

- `src/plugins/pagePlugin.ts` — campo `widgets_enabled: boolean`
- `src/storage/schema.ts` — `CURRENT_SCHEMA_VERSION = 3`

### 6b — Widgets Built-in Essenciais + Rendering Pipeline

**Arquivos novos:**

- `src/widgets/builtins/richText.ts`
- `src/widgets/builtins/image.ts`
- `src/widgets/builtins/hero.ts`
- `src/widgets/builtins/index.ts`
- `src/routing/widgetPageHandler.ts`
- `src/admin/components/widget-form.tsx`
- `src/test/widget-page-handler.test.ts`

**Arquivos modificados:**

- `src/routing/dynamicPageHandler.ts` — async + PlaceholderMap
- `src/ten.ts` — `_handleDynamicPage` async
- `src/plugins/adminPlugin.tsx` — rotas builder

### 6c — Drag-and-Drop e UX do Editor

**Arquivos novos:**

- `src/admin/components/page-builder-editor.tsx`
- `src/admin/components/widget-palette.tsx`
- `src/admin/components/widget-card.tsx`
- `src/test/page-builder-admin.test.ts`

**Arquivos modificados:**

- `src/plugins/adminPlugin.tsx` — reorder route
- `src/admin/app.tsx` — Sortable.js CDN

### 6d — Preview ao Vivo + Widgets Secundarios

**Widgets:** CTA Button, Spacer, ContactForm, Gallery

**Features:** Live preview iframe, responsive toggle

### 6e — Widgets Avancados, Permissoes e API Publica

**Widgets:** HTML raw, Embed, Columns/Grid

**Features:** Permissoes por widget, audit log, API publica, duplicacao

## Widgets Built-in (priorizacao)

| #  | Widget       | Sub-fase | Campos                                                             |
| -- | ------------ | -------- | ------------------------------------------------------------------ |
| 1  | RichText     | 6b       | `content` (textarea HTML)                                          |
| 2  | Image        | 6b       | `src`, `alt`, `caption`, `width`                                   |
| 3  | Hero         | 6b       | `heading`, `subheading`, `cta_text`, `cta_url`, `background_color` |
| 4  | CTA Button   | 6d       | `text`, `url`, `style`, `new_tab`                                  |
| 5  | Spacer       | 6d       | `height`, `unit`                                                   |
| 6  | ContactForm  | 6d       | `title`, `email_to`, `submit_label`, `fields`                      |
| 7  | Gallery      | 6d       | `images` (JSON), `columns`                                         |
| 8  | Embed        | 6e       | `url`, `title`, `width`, `height`                                  |
| 9  | HTML raw     | 6e       | `code` (HTML livre)                                                |
| 10 | Columns/Grid | 6e       | `columns`, `proportions`, sub-widgets                              |

## Rotas Admin

```
GET  /admin/pages/[id]/builder         → Page Builder editor
POST /admin/pages/[id]/builder         → salva widgets (JSON body)
POST /admin/pages/[id]/builder/reorder → reordena widgets (JSON body)
GET  /admin/pages/[id]/builder/preview → preview ao vivo
```

## Rendering Pipeline

```
GET /minha-pagina
  → dynamicRegistry.match("/minha-pagina")
  → item.widgets_enabled === true?
    → widgetStore.loadForPage(pageId) via kv.list
    → groupByPlaceholder(instances)
    → forEach: widgetRegistry.get(type).render(data) → HTML
    → body.replace("{{widgets:main}}", renderedMain)
    → renderDynamicPage(body) → layouts → document.html → Response
  → widgets_enabled === false
    → renderDynamicPage legado (sem mudanca)
```

## Versoes Alvo

| Sub-fase | Versao         |
| -------- | -------------- |
| 6a       | v0.8.0-alpha.1 |
| 6b       | v0.8.0-alpha.2 |
| 6c       | v0.8.0-beta.1  |
| 6d       | v0.8.0-beta.2  |
| 6e       | v0.8.0         |
