# Fase 3 — Specs Tecnicas: Paginas e Rotas Dinamicas

> Criado em: 2026-03-28 Status: Em implementacao Decisoes aprovadas pelo Leandro

## Decisoes Aprovadas

1. **Lookup no KV em runtime** — nao pre-registrar rotas dinamicas
2. **Prioridade**: file-based > admin > dinamicas > 404 custom > 404 padrao
3. **Redirect ao mudar slug**: nao nesta fase (sub-fase 3.1)
4. **Editor**: textarea HTML + preview (WYSIWYG na Fase 6)
5. **Permissoes**: qualquer admin (granular na Fase 5)
6. **Template**: = layout.html do filesystem

## Ordem de Execucao

```
R1: T1 — PagePlugin model expandido
R2: T2 — DynamicRouteRegistry
R3: T3 (ten.ts) + T5 (handler renderizacao) — paralelo
R4: T4 — Hot-registration (hooks CRUD)
R5: T6 (preview) + T7 (404 custom) — paralelo
R6: T8 — Testes
```

## Data Model PagePlugin

```typescript
model = {
  slug: "string",
  title: "string",
  body: "string",
  status: "string", // "draft" | "published"
  seo_title: "string",
  seo_description: "string",
  template: "string",
  author_id: "string",
};
```

## Tarefas

### T1: PagePlugin model expandido + validacoes

### T2: DynamicRouteRegistry (register, unregister, match, loadFromStorage)

### T3: Integracao ten.ts (_routeRequest consulta registry)

### T4: Hot-registration (hooks CRUD no AdminPlugin)

### T5: Handler de pagina dinamica (renderDynamicPage)

### T6: Preview (/admin/preview/{id})

### T7: 404 customizavel (slug "404")

### T8: Testes completos
