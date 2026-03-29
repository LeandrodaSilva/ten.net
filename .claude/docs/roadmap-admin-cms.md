# Roadmap Ten.net CMS — De Microframework a CMS Completo

> Criado em: 2026-03-28
> Atualizado em: 2026-03-29
> Status: Fases 0-3 concluidas (v0.6.0). Proxima: Fase 4 (Blog/Posts)

## Visao do Produto

O Ten.net deve evoluir para um **CMS completo inspirado no Django CMS**:

1. Criar paginas dinamicamente pelo painel admin
2. Criar rotas dinamicamente pelo painel admin
3. Sistema de postagens/blog gerenciavel pelo admin
4. Controle de acesso (permissoes, roles) configuravel pelo admin
5. Widgets/componentes arrastaveis para montar paginas (como Django CMS
   placeholders + plugins)
6. Tudo persistido com **Deno KV**

### Decisoes Arquiteturais

- **Admin plugin OPCIONAL e SEPARADO** do core — desenvolvedor opta por
  `app.use(new AdminPlugin())`
- **Storage: Deno KV** — zero config, funciona local e em Deno Deploy
- **Plugin de Pages** fica no core; Admin e opt-in
- **Abordagem granular** — feature por feature, cada fase entrega valor

---

## Fases

### Fase 0 — Wiring: CRUD Funcional [M] — CONCLUIDA (PR #21, v0.4.x)

**Objetivo:** Fazer funcionar o que ja existe. Conectar componentes CrudList,
CrudForm, DataTable, SidebarNav nas rotas reais.

**Entrega:** Admin panel com CRUD funcional — listar, criar, editar, deletar
itens de qualquer plugin.

**Tarefas:**

- [ ] T2: Criar `renderAdminPage` — mecanismo para passar dados reais do backend
      aos componentes React SSR
- [ ] T6: JavaScript inline para confirmacao de delete e dismiss de alerts
- [ ] T1: Substituir PluginList por CrudList + DataTable nas rotas de listagem
- [ ] T3: Montar SidebarNav no aside esquerdo do Dashboard
- [ ] T4: Criar rota/view para /{plugin}/new usando CrudForm
- [ ] T5: Criar rota/view para /{plugin}/{id} (edicao) usando CrudForm
- [ ] T7: Remover mock data e logs ficticios

---

### Fase 1 — Admin como Plugin Opcional [G]

**Objetivo:** Extrair admin do core. Zero overhead se nao usado.

**Entrega:** `app.use(new AdminPlugin({ plugins: [...] }))` — entrypoint
`@leproj/tennet/admin` no JSR.

**Tarefas:**

- [ ] Remover registro automatico de plugins do `ten.ts:start()`
- [ ] Criar `AdminPlugin` como orquestrador que aceita sub-plugins
- [ ] Mover auth system para dentro do AdminPlugin
- [ ] Criar entrypoint `src/admin/mod.ts`
- [ ] Adicionar entrypoint `./admin` no `deno.json`
- [ ] Atualizar demo.ts
- [ ] Garantir build system funciona com e sem admin
- [ ] Testes: app sem admin (zero overhead) + app com admin

---

### Fase 2 — Storage Persistente com Deno KV [M]

**Objetivo:** Dados que sobrevivem ao restart. Zero config.

**Entrega:** `DenoKvStorage` implementando interface `Storage`. Schema
versionado, indices secundarios.

**Data Model KV:**

```
["plugins", "{slug}", "items", "{id}"]           → StorageItem
["plugins", "{slug}", "index", "{field}", "{value}", "{id}"] → true
["plugins", "{slug}", "meta", "count"]           → number
["auth", "users", "{user_id}"]                   → User
["auth", "sessions", "{session_id}"]             → Session
["settings", "{key}"]                            → value
```

---

### Fase 3 — Paginas e Rotas Dinamicas [G]

**Objetivo:** Criar paginas pelo admin sem tocar em codigo.

**Entrega:** Usuario cria pagina (`/sobre`, `/promo/natal`), define conteudo,
pagina fica disponivel imediatamente.

**Features:** Pages expandido (slug, body HTML, status, SEO meta), rotas
dinamicas em runtime, hot-registration sem restart, templates selecionaveis,
preview, 404 customizavel.

---

### Fase 4 — Sistema de Blog/Posts [M]

**Objetivo:** Blog gerenciavel pelo admin.

**Entrega:** Posts com categorias/autor, rotas publicas `/blog`, RSS feed
automatico.

**Features:** Relacionamentos (post → categories, author), listagem paginada,
template configuravel, RSS.

---

### Fase 5 — Controle de Acesso Avancado [M]

**Objetivo:** Permissoes granulares pelo admin.

**Entrega:** Roles customizadas, matriz de permissoes editavel, audit log real.

**Features:** CRUD de roles, matriz role x recurso x acao, CRUD de usuarios,
audit log.

---

### Fase 6 — Widgets e Page Builder [GG]

**Objetivo:** Montar paginas arrastando componentes (estilo Django CMS).

**Entrega:** Sistema de placeholders + widgets drag-and-drop. Widgets built-in +
API para customizados.

**Features:** Placeholders em templates, Widget registry, drag-and-drop
(Sortable.js), widgets built-in (Hero, RichText, Image, Gallery, ContactForm,
HTML, Embed), API para widgets customizados, preview ao vivo.

---

## Diagrama de Dependencias

```
Fase 0 [M] ─── Wiring: CRUD funcional
  │
Fase 1 [G] ─── Admin opcional
  │
Fase 2 [M] ─── Deno KV Storage
  │
  ├── Fase 3 [G] ─── Paginas dinamicas
  │     ├── Fase 4 [M] ─── Blog/Posts
  │     └── Fase 6 [GG] ── Page Builder
  │
  └── Fase 5 [M] ─── Controle de acesso
```

## Priorizacao RICE

| Fase | Reach | Impact | Confidence | Effort | Score | Prioridade |
| ---- | ----- | ------ | ---------- | ------ | ----- | ---------- |
| 0    | 10    | 5      | 5          | 3      | 83    | 1a         |
| 1    | 8     | 4      | 4          | 4      | 32    | 2a         |
| 2    | 10    | 5      | 4          | 3      | 67    | 3a         |
| 3    | 9     | 5      | 4          | 4      | 45    | 4a         |
| 5    | 7     | 4      | 4          | 3      | 37    | 5a         |
| 4    | 6     | 3      | 4          | 3      | 24    | 6a         |
| 6    | 8     | 5      | 3          | 5      | 24    | 7a         |
