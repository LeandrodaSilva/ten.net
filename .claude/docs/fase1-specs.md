# Fase 1 — Specs Tecnicas: Admin como Plugin Opcional

> Criado em: 2026-03-28 Status: Em implementacao Decisoes aprovadas pelo Leandro

## Decisoes Aprovadas

1. **API**: `app.useAdmin(admin)` — metodo dedicado, explicito
2. **Seed**: Lazy init no primeiro login — zero mudanca na API
3. **Dashboard vazio**: Empty state se `plugins: []`
4. **Plugin base**: Gera CRUD JSON standalone, Admin decora com UI
5. **Auth**: Defaults fixos agora, configuravel na Fase 5
6. **Mover plugins**: `src/plugins/` → `src/admin/plugins/`
7. **sessionStore/requestSession**: Ficam como exports do core
8. **securityHeaders globais**: Ficam no core

## Ordem de Execucao

```
Bloco 1 (sequencial):
  T1 — Simplificar Plugin.ts (remover logica admin)
  T2 — Reescrever AdminPlugin como orquestrador

Bloco 2 (paralelo):
  T3 — Limpar ten.ts (remover imports, add useAdmin)
  T4 — Criar src/admin/mod.ts
  T5 — Atualizar deno.json exports

Bloco 3 (sequencial):
  T6 — Atualizar demo.ts
  T7 — Verificar build system

Bloco 4 (final):
  T8 — Testes completos
```

## API Resultante

```typescript
// Sem admin (zero overhead):
import { Ten } from "@leproj/tennet";
const app = Ten.net();
await app.start();

// Com admin:
import { Ten } from "@leproj/tennet";
import { AdminPlugin, PagePlugin, PostsPlugin } from "@leproj/tennet/admin";

const app = Ten.net();
await app.useAdmin(
  new AdminPlugin({
    plugins: [PagePlugin, PostsPlugin],
  }),
);
await app.start();
```

## Tarefas

### T1: Simplificar Plugin.ts

- Remover TODOS os imports de admin/auth/React
- Remover _addIndexRoute, _addCrudRoutes, _fieldType, _index, _listItems,
  _createItem, _getItem, _updateItem, _deleteItem, getRoutes, _routes
- Manter: name, description, model, slug, validate, storage

### T2: Reescrever AdminPlugin como orquestrador

- Aceita `plugins: Plugin[]` no construtor
- `async init()` retorna `{ routes, middlewares }`
- Gera dashboard, CRUD routes, auth routes, favicon
- Migra logica de Plugin.ts para ca
- Registra auth/CSRF/security middlewares

### T3: Limpar ten.ts

- Remover 15 imports de admin/auth/plugins
- Remover registro automatico no start()
- Adicionar `useAdmin(admin)` com interface AdminPluginLike
- Remover favicon handler de _routeRequest

### T4: Criar src/admin/mod.ts

- Exportar AdminPlugin, todos os plugins de conteudo, Plugin base, tipos

### T5: Atualizar deno.json

- Adicionar `"./admin": "./src/admin/mod.ts"` nos exports

### T6: Atualizar demo.ts

- Usar nova API com useAdmin()

### T7: Verificar build system

- Build sem admin funciona
- Documentar como incluir admin no build

### T8: Testes

- ten-no-admin.test.ts — app sem admin, /admin retorna 404
- admin-plugin.test.ts — AdminPlugin com sub-plugins, CRUD, auth
- Atualizar plugin.test.ts, plugin-crud.test.ts, ten.test.ts

## Security Checklist

- sessionStore/requestSession como singletons compartilhados (nao dentro do
  AdminPlugin)
- AdminPlugin registra middlewares via useAdmin() com ordem correta
- Plugin.ts NAO importa auth
- RBAC pode virar dinamico (Resource = string) em fase futura
- securityHeaders globais no core, admin-specific no AdminPlugin
