# Fase 0 — Specs Tecnicas: Wiring CRUD Funcional

> Criado em: 2026-03-28 Tech Lead: Especificacao completa Status: Em
> implementacao

## Problema Central

`appWithChildren` renderiza HTML estatico no momento do registro da rota (em
`Plugin.getRoutes()`), nao no momento da request. Os dados reais do backend
nunca chegam aos componentes React.

**Solucao:** Criar `renderAdminPage()` — funcao que renderiza componentes React
com props no momento da request, retornando HTML direto sem passar pelo
viewEngine/mustache.

---

## Ordem de Execucao

```
Rodada 1 (paralelo): T2 (fundacao) + T6 (JS inline)
Rodada 2 (paralelo): T1 (CrudList) + T3 (SidebarNav)
Rodada 3 (paralelo): T4 (form /new) + T5 (form /edit)
Rodada 4 (final):    T7 (limpeza)
```

### Diagrama de dependencias

```
T6 (independente) ─────────────────────────────────────────>

T2 (fundacao) ──┬──> T1 (CrudList) ──┬──> T4 (new) ──┬──> T7 (cleanup)
                │                     └──> T5 (edit) ──┘
                └──> T3 (sidebar) ─────────────────────┘
```

---

## TAREFA 2: Criar renderAdminPage — Passar dados reais do backend para React SSR

**Prioridade:** FUNDACAO — todas as outras dependem desta

### Objetivo

Criar mecanismo para que handlers de rota passem dados reais (items do Storage,
paginacao, query params) para componentes React durante SSR.

### Arquivos a modificar

1. `src/admin/app.tsx` — Criar `renderAdminPage`
2. `src/models/Plugin.ts` — Todos os metodos `_addIndexRoute`, `_addCrudRoutes`

### Mudancas tecnicas

**`src/admin/app.tsx` — Nova funcao:**

```typescript
export function renderAdminPage<P extends Record<string, unknown>>(
  Component: (props: P) => React.ReactElement,
  props: P,
  navItems?: SidebarNavItem[],
): string {
  return `<!DOCTYPE html>${
    renderToString(
      <App>
        <Component {...props} />
      </App>,
    )
  }`;
}
```

Manter `appWithChildren` para compatibilidade.

**`src/models/Plugin.ts` — Rotas admin com SSR React:**

- `route.hasPage = false` para que `route.run` seja chamado diretamente (sem
  viewEngine)
- `route.run` retorna
  `new Response(html, { headers: { "Content-Type": "text/html" } })`

### Fluxo de dados

```
Request → middleware → _routeRequest → route.run() → busca dados Storage
  → renderAdminPage(Component, props) → renderToString → Response HTML
```

### Criterios de aceite

- [ ] `renderAdminPage` existe em `app.tsx` e aceita componentes com props
- [ ] Rotas admin retornam HTML renderizado com dados reais
- [ ] `appWithChildren` original continua funcionando para admin index
- [ ] Query params `?success=` e `?error=` sao passados aos componentes

### Riscos

- Mudar `hasPage` para `false` faz rotas admin nao passarem pelo `viewEngine` —
  verificar que nao quebra nada

---

## TAREFA 6: JavaScript inline para confirmacao de delete e dismiss de alerts

**Prioridade:** INDEPENDENTE — pode ser paralela com tudo

### Objetivo

Ativar `data-confirm` (delete) e `data-dismiss-alert` (fechar alerts) que ja
existem nos componentes mas nao tem JS ativo.

### Arquivos a modificar

1. `src/admin/app.tsx` — Adicionar logica ao `Script` existente (linhas 32-38)

### Mudancas tecnicas

```tsx
<Script>
  {() => {
    const doc = globalThis.document;
    if (!doc) return;

    // Confirm delete
    doc.addEventListener("submit", (e: Event) => {
      const form = e.target as HTMLFormElement;
      const btn = form.querySelector("[data-confirm]") as HTMLElement | null;
      if (btn) {
        const msg = btn.getAttribute("data-confirm") || "Are you sure?";
        if (!confirm(msg)) e.preventDefault();
      }
    });

    // Dismiss alerts
    doc.querySelectorAll("[data-dismiss-alert]").forEach((btn: Element) => {
      btn.addEventListener("click", () => {
        const alert = btn.closest("[role='alert']");
        if (alert) alert.remove();
      });
    });
  }}
</Script>;
```

### Criterios de aceite

- [ ] Delete mostra `confirm()` com mensagem contextual
- [ ] Cancelar impede o submit
- [ ] X no Alert remove o alert do DOM

---

## TAREFA 1: Substituir PluginList por CrudList + DataTable nas rotas de listagem

**Depende de:** T2

### Objetivo

Rotas GET `/admin/plugins/{slug}` exibem tabela real com dados do Storage em vez
de mock data.

### Arquivos a modificar

1. `src/models/Plugin.ts` — Linhas 2, 229, 264
2. `src/admin/components/plugin-list.tsx` — Remover (na T7)

### Mudancas tecnicas

**`src/models/Plugin.ts` — `_addIndexRoute()`:**

```typescript
route.hasPage = false;
route.run = async (req: Request) => {
  const listResponse = await this._listItems(req);
  const data = await listResponse.json();
  const url = new URL(req.url);

  const columns = Object.keys(this.model).map((key) => ({
    key,
    label: key.charAt(0).toUpperCase() + key.slice(1),
  }));

  const html = renderAdminPage(CrudList, {
    pluginName: this.name,
    pluginSlug: this.slug,
    columns,
    rows: data.items,
    total: data.total,
    page: data.page,
    totalPages: data.totalPages,
    success: url.searchParams.get("success") ?? undefined,
    error: url.searchParams.get("error") ?? undefined,
  });

  return new Response(html, {
    status: 200,
    headers: { "Content-Type": "text/html" },
  });
};
```

### CrudList Props

```typescript
interface CrudListProps {
  pluginName: string;
  pluginSlug: string;
  columns: DataTableColumn[];
  rows: Record<string, unknown>[];
  total: number;
  page: number;
  totalPages: number;
  success?: string;
  error?: string;
}
```

### Criterios de aceite

- [ ] Tabela exibe colunas baseadas no model do plugin
- [ ] Tabela vazia mostra EmptyState com botao "Add"
- [ ] Paginacao aparece quando >20 items
- [ ] Actions Edit e Delete por row
- [ ] Alert de sucesso apos create/update/delete

---

## TAREFA 3: Montar SidebarNav no aside esquerdo do Dashboard

**Depende de:** T2

### Objetivo

Preencher o `<aside>` esquerdo (atualmente vazio) com navegacao para todos os
plugins.

### Arquivos a modificar

1. `src/layout/dashboard.tsx` — Importar e renderizar `SidebarNav`, adicionar
   prop `navItems`
2. `src/admin/app.tsx` — Passar lista de plugins para Dashboard

### Mudancas tecnicas

**`src/layout/dashboard.tsx`:**

```typescript
interface DashboardProps {
  children: ReactElement;
  navItems?: SidebarNavItem[];
}
```

Renderizar `<SidebarNav items={navItems} />` no aside. Item fixo "Dashboard" no
topo → `/admin`.

**Construcao dos navItems (em Plugin.ts):**

```typescript
const navItems = this._plugins
  .filter(p => toSlug(p.name) !== "admin-plugin")
  .map(p => ({
    label: p.name.replace("Plugin", ""),
    href: `/admin/plugins/${toSlug(p.name)}`,
    icon: /* SVG puzzle-piece generico */,
    active: toSlug(p.name) === this.slug
  }));
```

### Criterios de aceite

- [ ] Sidebar em TODAS as paginas admin
- [ ] Cada plugin registrado como link
- [ ] Item ativo destacado (`bg-gray-50 text-indigo-600`)
- [ ] "Dashboard" fixo no topo

---

## TAREFA 4: Criar rota/view para /{plugin}/new usando CrudForm

**Depende de:** T2

### Objetivo

GET `/admin/plugins/{slug}/new` renderiza formulario de criacao.

### Arquivos a modificar

1. `src/models/Plugin.ts` — Adicionar rota GET `/new` em `_addCrudRoutes()`

### Mudancas tecnicas

```typescript
const newRoute = new Route({
  path: `${basePath}/new`,
  regex: /^...\/new$/,
  hasPage: false,
});
newRoute.method = "GET";
newRoute.run = (_req: Request) => {
  const fields = Object.entries(this.model).map(([key, type]) => ({
    name: key,
    label: capitalize(key),
    type: this._fieldType(type),
    required: type !== "boolean",
  }));
  return new Response(
    renderAdminPage(CrudForm, {
      pluginName: this.name,
      pluginSlug: this.slug,
      fields,
      action: basePath,
      isEdit: false,
    }),
    { status: 200, headers: { "Content-Type": "text/html" } },
  );
};
```

**IMPORTANTE:** Rota `/new` DEVE ser registrada ANTES de `/{id}` para evitar
conflito de regex.

**Helper:**

```typescript
private _fieldType(type: string): FormFieldProps["type"] {
  switch (type) {
    case "boolean": return "checkbox";
    default: return "text";
  }
}
```

### Criterios de aceite

- [ ] Formulario com campos do model
- [ ] Breadcrumb: Home > Plugin > New
- [ ] Cancel volta para listagem
- [ ] Submit cria item e redireciona com sucesso

---

## TAREFA 5: Criar rota/view para /{plugin}/{id} (edicao) usando CrudForm

**Depende de:** T2

### Objetivo

GET `/admin/plugins/{slug}/{id}` renderiza formulario preenchido com dados do
item.

### Arquivos a modificar

1. `src/models/Plugin.ts` — Modificar rota GET `/{id}` em `_addCrudRoutes()`

### Mudancas tecnicas

```typescript
getRoute.hasPage = false;
getRoute.run = async (_req: Request, ctx?) => {
  const id = ctx?.params?.id;
  const item = await this.storage.get(id);
  if (!item) return new Response("Not found", { status: 404 });

  const fields = /* derivar do model */;
  const values = /* mapear item para Record<string, string> */;

  return new Response(renderAdminPage(CrudForm, {
    pluginName: this.name, pluginSlug: this.slug,
    fields, values, action: `${basePath}/${id}`,
    isEdit: true, itemId: id,
  }), { status: 200, headers: { "Content-Type": "text/html" } });
};
```

### Criterios de aceite

- [ ] Formulario preenchido com valores atuais
- [ ] Breadcrumb: Home > Plugin > Edit
- [ ] Save atualiza e redireciona com sucesso
- [ ] ID inexistente retorna 404

---

## TAREFA 7: Remover mock data e logs ficticios

**Depende de:** T1, T3, T4, T5

### Objetivo

Eliminar todos os dados hardcoded/mock do admin.

### Arquivos a modificar/remover

1. `src/admin/components/plugin-list.tsx` — **REMOVER**
2. `src/admin/components/plugins.tsx` — Refatorar para props dinamicas
3. `src/admin/components/logs.tsx` — Estado vazio

### Mudancas tecnicas

**`plugins.tsx`:** Receber `plugins: Array<{ name, slug, description }>` como
prop.

**`logs.tsx`:** Substituir dados ficticios por:

```tsx
export const Logs = () => (
  <div className="text-center py-6">
    <h3 className="text-sm font-semibold text-gray-900">No recent activity</h3>
    <p className="mt-1 text-sm text-gray-500">
      Activity will appear here as you use the admin panel.
    </p>
  </div>
);
```

### Criterios de aceite

- [ ] Nenhum dado mock no admin
- [ ] `plugin-list.tsx` removido
- [ ] Dashboard mostra apenas plugins registrados
- [ ] Logs mostra estado vazio
- [ ] Todos os testes passam

---

## Resumo de Arquivos Impactados

| Arquivo                                | Tarefas            | Tipo                                           |
| -------------------------------------- | ------------------ | ---------------------------------------------- |
| `src/admin/app.tsx`                    | T2, T3, T6         | Criar renderAdminPage, JS inline               |
| `src/models/Plugin.ts`                 | T1, T3, T4, T5, T7 | Trocar PluginList, sidebar, rotas /new e /edit |
| `src/layout/dashboard.tsx`             | T3                 | Receber e renderizar SidebarNav                |
| `src/admin/components/plugins.tsx`     | T7                 | Receber plugins como props                     |
| `src/admin/components/logs.tsx`        | T7                 | Estado vazio                                   |
| `src/admin/components/plugin-list.tsx` | T7                 | REMOVER                                        |

## Notas sobre Testes

- 25 arquivos de teste em `src/test/`
- CI exige 90% de cobertura
- Apos cada tarefa: `deno task test` + `deno task check`
- Testes impactados: Route, Plugin, viewEngine, componentes admin (snapshots)
