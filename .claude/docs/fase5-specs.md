# Fase 5 — Specs Tecnicas: Controle de Acesso Avancado

> Criado em: 2026-03-29 Status: Planejado Depende de: Fase 4 (concluida na
> branch feat/fase4-blog-system)

## Objetivo

Sistema de controle de acesso avancado com roles customizaveis, matriz de
permissoes editavel via admin, audit log de acoes e middleware de autorizacao
dinamico. Backward-compatible: se nao configurado, qualquer user logado pode
tudo (comportamento atual).

## Entrega

1. **RolesPlugin** — CRUD de roles (admin, editor, viewer, custom)
2. **PermissionsMatrix** — role x plugin x acao (create/read/update/delete)
3. **Expansao do UsersPlugin** — atribuicao de roles aos usuarios
4. **Middleware de autorizacao dinamico** — substituir ROLE_PERMISSIONS
   hardcoded por lookup no KV
5. **AuditLogPlugin** — registrar quem fez o que, quando (Deno KV)
6. **UI no admin** — telas de roles, permissoes, audit log no dashboard

## Decisoes Tecnicas

1. **Backward-compatible**: Se nenhuma role customizada existir no KV, o sistema
   usa o `ROLE_PERMISSIONS` hardcoded atual de `src/auth/types.ts`. Nenhuma
   config necessaria para manter o comportamento existente.
2. **RolesPlugin segue o padrao de PostsPlugin/CategoriesPlugin**: Extende
   `Plugin`, tem `validate()`, usa DenoKvStorage, CRUD auto-gerado pelo
   AdminPlugin.
3. **PermissionsMatrix armazenada no KV**: Cada entrada e uma combinacao
   `role_slug + resource + permission`. Nao e um plugin separado — e uma camada
   de dados gerenciada pelo RolesPlugin com UI dedicada.
4. **AuditLogPlugin e append-only**: Apenas create (nunca update/delete via
   admin). Entradas com TTL de 90 dias (Deno KV `expireIn`). Listagem readonly
   no admin.
5. **UsersPlugin expandido**: Adiciona campo `role_id` (referencia a role) e
   validacao. Campo `role` existente migra para `role_id` apontando para a role
   correspondente no RolesPlugin.
6. **Middleware dinamico**: O `authMiddleware` consulta primeiro o KV para
   permissoes customizadas. Se nao encontrar, fallback para `ROLE_PERMISSIONS`
   hardcoded.
7. **Audit log automatico**: Intercepta todas as operacoes CRUD do AdminPlugin
   (create/update/delete) e registra no AuditLogPlugin. Nao requer acao manual
   do usuario.
8. **Resources sao dinamicos**: A lista de resources e derivada dos plugins
   registrados (via `plugin.slug`), nao hardcoded. Novos plugins automaticamente
   aparecem na matriz de permissoes.
9. **UI da matriz**: Tabela interativa (role nas linhas, resources nas colunas,
   checkboxes para cada permissao). Renderizada via React SSR como os demais
   componentes.
10. **Audit log no dashboard**: O componente `Logs` existente
    (`src/admin/components/logs.tsx`) sera expandido para exibir entradas reais
    do AuditLogPlugin.

## Data Models

### RolesPlugin (novo)

```typescript
// src/plugins/rolesPlugin.ts
model = {
  name: "string", // Nome da role (ex: "Admin", "Editor", "Viewer")
  slug: "string", // Slug unico (ex: "admin", "editor", "viewer")
  description: "string", // Descricao da role
  is_system: "boolean", // true para roles built-in (admin, editor, viewer)
};
```

**Validacao (RolesPlugin.validate):**

- `name`: obrigatorio
- `slug`: obrigatorio, formato lowercase-com-hyphens, unico
- `description`: opcional
- `is_system`: default false; roles com `is_system=true` nao podem ser deletadas

**Validacao async (RolesPlugin.validateAsync):**

- Slug unico via storage index

### PermissionEntry (armazenado no KV, gerenciado pelo RolesPlugin)

```typescript
// src/models/Permission.ts
export interface PermissionEntry {
  id: string; // UUID
  role_slug: string; // Slug da role (ex: "editor")
  resource: string; // Slug do plugin (ex: "post-plugin") ou "dashboard"
  permissions: string; // JSON array: '["read","create","update","delete"]'
  updated_at: string; // ISO date
}
```

### AuditLogPlugin (novo)

```typescript
// src/plugins/auditLogPlugin.ts
model = {
  action: "string", // "create" | "update" | "delete"
  resource: "string", // Plugin slug (ex: "post-plugin")
  resource_id: "string", // ID do item afetado
  user_id: "string", // ID do usuario que executou a acao
  username: "string", // Username para exibicao
  details: "string", // JSON com dados relevantes (ex: campos alterados)
  timestamp: "string", // ISO date
};
```

**Validacao:**

- Todos os campos obrigatorios exceto `details` (opcional)
- `action`: deve ser "create", "update" ou "delete"
- Plugin e append-only: override `validate()` para rejeitar updates
- Admin UI mostra apenas listagem (sem form de criacao/edicao)

### UsersPlugin (expandido)

```typescript
// src/plugins/usersPlugin.ts — modelo expandido
model = {
  email: "string", // Email do usuario
  display_name: "string", // Nome de exibicao
  role_id: "string", // ID da role (referencia RolesPlugin)
  status: "string", // "active" | "inactive"
};
```

**Validacao (UsersPlugin.validate):**

- `email`: obrigatorio, formato email basico
- `display_name`: obrigatorio
- `role_id`: obrigatorio
- `status`: "active" ou "inactive"

**Validacao async (UsersPlugin.validateAsync):**

- `email` unico via storage index
- `role_id` deve existir no RolesPlugin storage

## Rotas Admin

### RolesPlugin (auto-geradas pelo CRUD generico)

- GET/POST `/admin/plugins/role-plugin` — listar/criar roles
- GET/POST `/admin/plugins/role-plugin/{id}` — editar role
- POST `/admin/plugins/role-plugin/{id}/delete` — deletar role (bloqueado para
  is_system=true)

### Rota customizada: Matriz de Permissoes

- GET `/admin/roles/permissions` — exibir matriz de permissoes (tabela role x
  resource x acao)
- POST `/admin/roles/permissions` — salvar alteracoes na matriz

### AuditLogPlugin (readonly no admin)

- GET `/admin/plugins/audit-log-plugin` — listar audit log (paginado, readonly)
- GET `/admin/plugins/audit-log-plugin/{id}` — detalhe de uma entrada

**Nota:** As rotas POST (create/update/delete) sao desabilitadas para o
AuditLogPlugin. O CRUD generico gera as rotas, mas o handler retorna 403 para
operacoes de escrita.

### UsersPlugin (existente, expandido)

- Mesmas rotas existentes, agora com campo `role_id` como select populado com
  roles do RolesPlugin

## Middleware de Autorizacao Dinamico

### Fluxo de autorizacao atualizado

```
Request -> authMiddleware
  1. Extrair session (cookie)
  2. Obter role do usuario (session.role ou session.role_slug)
  3. Verificar permissoes:
     a. Buscar no KV: ["permissions", role_slug, resource]
     b. Se encontrou -> usar permissoes do KV
     c. Se NAO encontrou -> fallback para ROLE_PERMISSIONS hardcoded
  4. Permitir ou retornar 403
```

### Mudancas em `src/auth/types.ts`

```typescript
// Role passa a aceitar strings customizadas
export type Role = string; // Era: "admin" | "editor" | "viewer"

// ROLE_PERMISSIONS mantido como fallback
export const ROLE_PERMISSIONS: Record<string, Record<string, Permission[]>> = {
  admin: {/* ... mesmo conteudo atual ... */},
  editor: {/* ... */},
  viewer: {/* ... */},
};
```

### Mudancas em `src/auth/authMiddleware.ts`

```typescript
// Nova funcao que consulta KV antes do fallback
async function hasPermissionDynamic(
  kv: Deno.Kv | null,
  role: string,
  resource: Resource,
  permission: Permission,
): Promise<boolean> {
  // Tentar buscar permissao customizada no KV
  if (kv) {
    const entry = await kv.get<string[]>(["permissions", role, resource]);
    if (entry.value) {
      return entry.value.includes(permission);
    }
  }
  // Fallback para hardcoded
  return hasPermission(role, resource, permission);
}
```

## Chaves KV

```
# RolesPlugin
["plugins", "role-plugin", "items", "{id}"]                          -> StorageItem (role)
["plugins", "role-plugin", "index", "slug", "{slug}", "{id}"]       -> id
["plugins", "role-plugin", "meta", "count"]                          -> number

# Permissions Matrix (acesso direto, nao via plugin storage)
["permissions", "{role_slug}", "{resource}"]                         -> string[] (permissions array)

# AuditLogPlugin
["plugins", "audit-log-plugin", "items", "{id}"]                    -> StorageItem (log entry)
["plugins", "audit-log-plugin", "index", "action", "{action}", "{id}"] -> id
["plugins", "audit-log-plugin", "index", "resource", "{resource}", "{id}"] -> id
["plugins", "audit-log-plugin", "index", "user_id", "{user_id}", "{id}"] -> id
["plugins", "audit-log-plugin", "meta", "count"]                    -> number

# UsersPlugin (expandido)
["plugins", "user-plugin", "items", "{id}"]                         -> StorageItem (user)
["plugins", "user-plugin", "index", "email", "{email}", "{id}"]     -> id
["plugins", "user-plugin", "index", "role_id", "{role_id}", "{id}"] -> id
["plugins", "user-plugin", "meta", "count"]                         -> number
```

## Seed de Roles Built-in

Na inicializacao do AdminPlugin, se o RolesPlugin estiver registrado e o storage
estiver vazio, semear 3 roles built-in:

```typescript
const builtInRoles = [
  {
    name: "Admin",
    slug: "admin",
    description: "Full access to all resources",
    is_system: "true",
  },
  {
    name: "Editor",
    slug: "editor",
    description: "Create and edit content",
    is_system: "true",
  },
  {
    name: "Viewer",
    slug: "viewer",
    description: "Read-only access",
    is_system: "true",
  },
];
```

Apos semear as roles, semear as permissoes correspondentes no KV (espelhando o
`ROLE_PERMISSIONS` hardcoded atual).

## Ordem de Execucao

```
Rodada 1 (paralelo): T1 (RolesPlugin) + T2 (AuditLogPlugin) + T3 (PermissionEntry model)
Rodada 2 (paralelo): T4 (Expandir UsersPlugin) + T5 (Permissions matrix storage)
Rodada 3 (sequencial): T6 (Middleware de autorizacao dinamico)
Rodada 4 (paralelo): T7 (Audit log interceptor no AdminPlugin) + T8 (Seed de roles built-in)
Rodada 5 (paralelo): T9 (UI: tela de roles) + T10 (UI: matriz de permissoes) + T11 (UI: audit log)
Rodada 6 (paralelo): T12 (UI: select de role no UsersPlugin form) + T13 (UI: audit log no dashboard)
Rodada 7 (final): T14 (Testes completos)
```

### Diagrama de dependencias

```
T1 (RolesPlugin) ────────┐
                          ├──> T4 (UsersPlugin expand) ──> T12 (UI: role select)
T2 (AuditLogPlugin) ─────┤                                    │
                          ├──> T7 (audit interceptor) ───> T11 (UI: audit log)
T3 (PermissionEntry) ────┤                                    │
                          ├──> T5 (permissions storage) ──> T6 (middleware dinamico)
                          │                                    │
                          ├──> T8 (seed roles) ────────────────┘
                          │
                          ├──> T9 (UI: roles) ────────> T10 (UI: matriz permissoes)
                          │
                          └──> T13 (UI: dashboard logs)
                                    │
                                    └──> T14 (testes)
```

## Tarefas

### T1: Criar RolesPlugin com validacao completa

**Agente:** backend

**Arquivos:**

- `src/plugins/rolesPlugin.ts` (novo)

**O que fazer:**

- Criar classe `RolesPlugin` extendendo `Plugin`
- Definir model: `name`, `slug`, `description`, `is_system`
- Implementar `validate()`: slug format (lowercase-com-hyphens), name required,
  description opcional, is_system default false
- Implementar `validateAsync()`: slug uniqueness via storage index
- Impedir delecao de roles com `is_system=true` (override ou flag para o
  AdminPlugin)

**Criterios de aceite:**

- [ ] RolesPlugin.validate() rejeita slug invalido
- [ ] RolesPlugin.validate() exige name
- [ ] RolesPlugin.validateAsync() rejeita slug duplicado
- [ ] description e opcional
- [ ] is_system default false
- [ ] Roles com is_system=true nao podem ser deletadas

### T2: Criar AuditLogPlugin append-only

**Agente:** backend

**Arquivos:**

- `src/plugins/auditLogPlugin.ts` (novo)

**O que fazer:**

- Criar classe `AuditLogPlugin` extendendo `Plugin`
- Definir model: `action`, `resource`, `resource_id`, `user_id`, `username`,
  `details`, `timestamp`
- Implementar `validate()`: action enum (create/update/delete), campos
  obrigatorios, details opcional
- Marcar plugin como readonly (propriedade `readonly = true` ou similar)
- Metodo `log(entry)` para facilitar criacao de entradas com timestamp
  automatico
- Entradas com TTL de 90 dias no Deno KV (`expireIn: 90 * 24 * 60 * 60 * 1000`)

**Criterios de aceite:**

- [ ] AuditLogPlugin.validate() rejeita action invalida
- [ ] AuditLogPlugin.validate() exige campos obrigatorios
- [ ] details e opcional
- [ ] Metodo log() preenche timestamp automaticamente
- [ ] Plugin marcado como readonly
- [ ] Entradas criadas com TTL de 90 dias

### T3: Criar modelo PermissionEntry

**Agente:** backend

**Arquivos:**

- `src/models/Permission.ts` (novo)

**O que fazer:**

- Definir interface `PermissionEntry` com campos: `id`, `role_slug`, `resource`,
  `permissions` (JSON array string), `updated_at`
- Definir tipo `PermissionAction = "read" | "create" | "update" | "delete"`
- Exportar funcoes helper:
  - `parsePermissions(json: string): PermissionAction[]`
  - `serializePermissions(perms: PermissionAction[]): string`
  - `buildPermissionKey(roleSlug: string, resource: string): Deno.KvKey`
- Manter compatibilidade com o tipo `Permission` existente em
  `src/auth/types.ts`

**Criterios de aceite:**

- [ ] Interface PermissionEntry exportada corretamente
- [ ] Helpers parsePermissions/serializePermissions funcionam
- [ ] buildPermissionKey gera chave KV correta
- [ ] Tipo PermissionAction compativel com Permission existente

### T4: Expandir UsersPlugin com role_id e validacao

**Agente:** backend

**Arquivos:**

- `src/plugins/usersPlugin.ts`

**O que fazer:**

- Substituir campo `role: "string"` por `role_id: "string"`
- Adicionar campo `status: "string"` (se nao existir) com valores
  "active"/"inactive"
- Implementar `validate()`: email formato basico, display_name required, role_id
  required, status enum
- Implementar `validateAsync()`: email uniqueness via storage index, role_id
  existencia no RolesPlugin storage
- Marcar campo `status` default "active"

**Criterios de aceite:**

- [ ] UsersPlugin.validate() exige email, display_name, role_id
- [ ] UsersPlugin.validate() rejeita status invalido
- [ ] UsersPlugin.validateAsync() rejeita email duplicado
- [ ] UsersPlugin.validateAsync() rejeita role_id inexistente
- [ ] Campo role_id substitui campo role no model

### T5: Implementar Permissions Matrix storage

**Agente:** backend

**Arquivos:**

- `src/auth/permissionsStore.ts` (novo)

**O que fazer:**

- Criar classe `PermissionsStore` que encapsula operacoes no KV para permissoes:
  - `get(roleSlug, resource): Promise<PermissionAction[] | null>`
  - `set(roleSlug, resource, permissions): Promise<void>`
  - `getAll(roleSlug): Promise<Record<string, PermissionAction[]>>`
  - `getAllForMatrix(roleSlugs, resources): Promise<MatrixData>`
  - `delete(roleSlug): Promise<void>` (remove todas permissoes de uma role)
- Tipo `MatrixData` para representar a matriz completa para renderizacao
- Aceitar `Deno.Kv` ou `null` (quando null, fallback para ROLE_PERMISSIONS)

**Criterios de aceite:**

- [ ] get() retorna permissoes do KV
- [ ] get() retorna null quando nao configurado
- [ ] set() salva permissoes no KV
- [ ] getAll() retorna todas permissoes de uma role
- [ ] getAllForMatrix() retorna dados formatados para UI
- [ ] delete() remove todas permissoes de uma role
- [ ] Fallback para ROLE_PERMISSIONS quando KV nao tem dados

### T6: Middleware de autorizacao dinamico

**Agente:** backend

**Arquivos:**

- `src/auth/authMiddleware.ts`
- `src/auth/types.ts`

**O que fazer:**

- Alterar tipo `Role` de union type para `string` (aceitar roles customizadas)
- Adicionar parametro opcional `kv: Deno.Kv | null` ao `authMiddleware()`
- Criar funcao `hasPermissionDynamic()` que consulta KV antes do fallback
- Atualizar `extractResource()` para suportar recursos dinamicos (qualquer
  plugin slug)
- Manter `ROLE_PERMISSIONS` como fallback quando KV nao tem dados
- Atualizar tipo `Resource` para aceitar `string` (nao apenas union hardcoded)
- Manter compatibilidade total: sem KV configurado, comportamento identico ao
  atual

**Criterios de aceite:**

- [ ] Role aceita qualquer string (nao apenas admin/editor/viewer)
- [ ] Resource aceita qualquer string (nao apenas union hardcoded)
- [ ] hasPermissionDynamic() consulta KV primeiro
- [ ] Fallback para ROLE_PERMISSIONS funciona
- [ ] Sem KV, comportamento identico ao atual (backward-compatible)
- [ ] extractResource() suporta plugins dinamicos
- [ ] Testes existentes do authMiddleware continuam passando

### T7: Audit log interceptor no AdminPlugin

**Agente:** backend

**Arquivos:**

- `src/plugins/adminPlugin.tsx`

**O que fazer:**

- Detectar AuditLogPlugin nos plugins registrados durante `init()`
- Interceptar operacoes CRUD (create/update/delete) de todos os plugins
- Apos cada operacao bem-sucedida, criar entrada no AuditLogPlugin:
  - `action`: tipo da operacao
  - `resource`: slug do plugin
  - `resource_id`: ID do item
  - `user_id`: extraido da session
  - `username`: extraido da session
  - `details`: JSON com campos relevantes (ex: titulo do item)
  - `timestamp`: ISO date
- Usar `expireIn: 90 * 24 * 60 * 60 * 1000` ao salvar no KV
- Nao logar operacoes do proprio AuditLogPlugin (evitar recursao)
- Bloquear rotas POST (create/update/delete) do AuditLogPlugin com 403

**Criterios de aceite:**

- [ ] Criar item em qualquer plugin gera entrada de audit
- [ ] Atualizar item gera entrada de audit
- [ ] Deletar item gera entrada de audit
- [ ] Entradas contem user_id e username da session
- [ ] Entradas contem resource e resource_id
- [ ] Nao gera audit de audit (sem recursao)
- [ ] Rotas de escrita do AuditLogPlugin retornam 403
- [ ] Entradas com TTL de 90 dias

### T8: Seed de roles built-in na inicializacao

**Agente:** backend

**Arquivos:**

- `src/plugins/adminPlugin.tsx`
- `src/auth/permissionsStore.ts`

**O que fazer:**

- Na inicializacao do AdminPlugin (`init()`), se RolesPlugin estiver registrado:
  1. Verificar se o storage do RolesPlugin esta vazio
  2. Se vazio, semear 3 roles built-in (admin, editor, viewer) com
     `is_system=true`
  3. Semear permissoes correspondentes no KV, espelhando `ROLE_PERMISSIONS`
- Usar `PermissionsStore.set()` para cada combinacao role x resource
- Nao sobrescrever dados existentes (idem ao `seedDefaultAdmin`)

**Criterios de aceite:**

- [ ] Roles built-in criadas na primeira inicializacao
- [ ] Permissoes correspondentes semeadas no KV
- [ ] Nao sobrescreve roles/permissoes existentes
- [ ] Roles criadas com is_system=true
- [ ] Funciona com storage vazio (primeira execucao)

### T9: UI — Tela de Roles (CRUD)

**Agente:** frontend

**Arquivos:**

- `src/admin/components/roles-list.tsx` (novo)

**O que fazer:**

- Criar componente `RolesList` para listar roles no admin
- Exibir: nome, slug, descricao, badge "System" para is_system=true
- Botao "Editar" para cada role
- Botao "Deletar" desabilitado para roles system
- Link para a matriz de permissoes
- Seguir padrao visual do `CrudList` existente
- Usar Tailwind CSS classes consistentes com o design system

**Criterios de aceite:**

- [ ] Lista todas as roles com nome, slug, descricao
- [ ] Badge visual para roles system
- [ ] Botao delete desabilitado para is_system=true
- [ ] Link para matriz de permissoes
- [ ] Design consistente com CrudList
- [ ] Responsivo

### T10: UI — Matriz de Permissoes

**Agente:** frontend

**Arquivos:**

- `src/admin/components/permissions-matrix.tsx` (novo)

**O que fazer:**

- Criar componente `PermissionsMatrix` que renderiza tabela interativa
- Linhas: roles; Colunas: resources (plugins); Celulas: checkboxes para cada
  permissao (read/create/update/delete)
- Recebe `MatrixData` do backend (roles, resources, permissoes atuais)
- Form POST para `/admin/roles/permissions` com todos os checkboxes
- Botao "Save" para persistir alteracoes
- Roles system editaveis (admin pode ajustar permissoes de roles built-in)
- Alert de sucesso/erro apos salvar

**Criterios de aceite:**

- [ ] Tabela exibe todas roles vs todos resources
- [ ] Checkboxes refletem permissoes atuais
- [ ] Form POST envia dados corretos
- [ ] UI responsiva (scroll horizontal se muitos resources)
- [ ] Feedback visual apos salvar (success/error alert)
- [ ] Design consistente com admin panel

### T11: UI — Tela de Audit Log

**Agente:** frontend

**Arquivos:**

- `src/admin/components/audit-log-list.tsx` (novo)

**O que fazer:**

- Criar componente `AuditLogList` para exibir entradas do audit log
- Colunas: timestamp (formatado), username, action (badge colorido), resource,
  resource_id
- Paginacao (reutilizar componente `Pagination` existente)
- Filtro por action (create/update/delete) e por resource
- Link para detalhe do item (se existir)
- Sem botoes de create/edit/delete (readonly)
- Exibir details expandivel por entrada

**Criterios de aceite:**

- [ ] Lista entradas com timestamp, user, action, resource
- [ ] Badges coloridos por tipo de action
- [ ] Paginacao funcional
- [ ] Filtros por action e resource
- [ ] Sem botoes de escrita (readonly)
- [ ] Details expandivel
- [ ] Design consistente com admin panel

### T12: UI — Select de role no form do UsersPlugin

**Agente:** frontend

**Arquivos:**

- `src/plugins/adminPlugin.tsx`

**O que fazer:**

- Expandir `_getFieldConfig()` para mapear campos do UsersPlugin:
  - `role_id` -> select com opcoes das roles do RolesPlugin storage
  - `status` -> select com opcoes ["active", "inactive"]
- Resolver roles do RolesPlugin storage para popular opcoes do select
- Seguir mesmo padrao de `category_ids` no PostsPlugin

**Criterios de aceite:**

- [ ] role_id renderiza como select com roles do storage
- [ ] status renderiza como select com active/inactive
- [ ] Outros plugins nao sao afetados
- [ ] Padrao consistente com category_ids do PostsPlugin

### T13: UI — Audit log no dashboard

**Agente:** frontend

**Arquivos:**

- `src/admin/components/logs.tsx`
- `src/plugins/adminPlugin.tsx`

**O que fazer:**

- Expandir componente `Logs` para receber e exibir entradas reais do
  AuditLogPlugin
- Exibir ultimas 10 entradas no dashboard
- Cada entrada: icone por tipo de action, username, descricao curta, timestamp
  relativo (ex: "2 min ago")
- Manter fallback para "No recent activity" quando nao ha entradas
- Dashboard route (`_addDashboardRoute`) busca ultimas entradas do
  AuditLogPlugin storage

**Criterios de aceite:**

- [ ] Dashboard exibe ultimas 10 entradas de audit
- [ ] Icone diferente por tipo de action
- [ ] Timestamp relativo legivel
- [ ] Fallback para "No recent activity" quando vazio
- [ ] Nao quebra se AuditLogPlugin nao estiver registrado

### T14: Testes completos da Fase 5

**Agente:** tester

**Arquivos:**

- `src/test/roles-plugin.test.ts` (novo)
- `src/test/audit-log-plugin.test.ts` (novo)
- `src/test/permission-entry.test.ts` (novo)
- `src/test/permissions-store.test.ts` (novo)
- `src/test/users-plugin-validation.test.ts` (novo)
- `src/test/auth-middleware-dynamic.test.ts` (novo)
- `src/test/audit-interceptor.test.ts` (novo)
- `src/test/roles-seed.test.ts` (novo)
- `src/test/permissions-matrix.test.ts` (novo — snapshot)
- `src/test/audit-log-list.test.ts` (novo — snapshot)
- `src/test/roles-list.test.ts` (novo — snapshot)
- Atualizar snapshots existentes se necessario

**O que fazer:**

- Testes unitarios para RolesPlugin.validate e validateAsync
- Testes unitarios para AuditLogPlugin.validate e metodo log()
- Testes unitarios para PermissionEntry helpers
- Testes unitarios para PermissionsStore (get/set/getAll/delete/fallback)
- Testes unitarios para UsersPlugin.validate e validateAsync expandidos
- Testes unitarios para authMiddleware com permissoes dinamicas (KV e fallback)
- Testes de integracao para audit log interceptor no AdminPlugin
- Testes para seed de roles built-in
- Snapshot tests para PermissionsMatrix, AuditLogList, RolesList components
- Testes para rotas readonly do AuditLogPlugin (POST retorna 403)
- Testes para protecao contra delecao de roles system
- Usar `Deno.openKv(":memory:")` para CI
- Manter coverage >= 90%

**Criterios de aceite:**

- [ ] Todos os testes passam com `deno task test`
- [ ] Coverage >= 90%
- [ ] `deno task check` sem erros de tipo
- [ ] `deno task lint` sem warnings
- [ ] Nenhum teste existente quebrado
- [ ] Backward-compatibility verificada (sem roles customizadas = comportamento
      anterior)

## Resumo de Arquivos Impactados

| Arquivo                                       | Tarefas          | Tipo                                       |
| --------------------------------------------- | ---------------- | ------------------------------------------ |
| `src/plugins/rolesPlugin.ts`                  | T1               | NOVO — Plugin de roles                     |
| `src/plugins/auditLogPlugin.ts`               | T2               | NOVO — Plugin de audit log                 |
| `src/models/Permission.ts`                    | T3               | NOVO — Interface e helpers de permissao    |
| `src/plugins/usersPlugin.ts`                  | T4               | Expandir com role_id e validacao           |
| `src/auth/permissionsStore.ts`                | T5, T8           | NOVO — Store para matriz de permissoes     |
| `src/auth/authMiddleware.ts`                  | T6               | Middleware dinamico com KV lookup          |
| `src/auth/types.ts`                           | T6               | Role e Resource passam a aceitar string    |
| `src/plugins/adminPlugin.tsx`                 | T7, T8, T12, T13 | Interceptor, seed, field config, dashboard |
| `src/admin/components/roles-list.tsx`         | T9               | NOVO — Lista de roles                      |
| `src/admin/components/permissions-matrix.tsx` | T10              | NOVO — Matriz de permissoes                |
| `src/admin/components/audit-log-list.tsx`     | T11              | NOVO — Lista de audit log                  |
| `src/admin/components/logs.tsx`               | T13              | Expandir com dados reais do audit log      |
| `src/admin/mod.ts`                            | —                | Exportar RolesPlugin e AuditLogPlugin      |
| `src/test/*.test.ts`                          | T14              | 12 novos arquivos de teste                 |

## Notas

- O tipo `Role` em `src/auth/types.ts` muda de union type
  (`"admin" | "editor" |
  "viewer"`) para `string`. Isso e a mudanca mais
  impactante em termos de backward-compatibility. Todos os locais que usam
  `Role` precisam ser revisados, mas como o TypeScript aceita `string` como
  superset, nao deve quebrar nada.
- A relacao user->role e por referencia (`role_id`). Se uma role for deletada
  (nao-system), os usuarios com essa role perdem acesso ate serem reassociados
  (comportamento seguro: deny by default).
- O AuditLogPlugin usa `expireIn` do Deno KV para TTL automatico de 90 dias.
  Isso significa que entradas antigas sao removidas automaticamente pelo KV, sem
  necessidade de job de limpeza.
- A matriz de permissoes nao usa o plugin storage padrao. As permissoes ficam em
  chaves KV dedicadas (`["permissions", role_slug, resource]`) para lookup
  rapido no middleware (single key get, sem scan).
- O componente `Logs` existente ja esta preparado como placeholder. A Fase 5
  apenas popula com dados reais.
- Roles system (admin, editor, viewer) podem ter suas permissoes editadas via
  matriz, mas nao podem ser deletadas. Isso permite customizacao granular
  mantendo roles base.
