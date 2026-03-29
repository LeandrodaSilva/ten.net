# Fase 2 — Specs Tecnicas: Storage Persistente com Deno KV

> Criado em: 2026-03-28 Status: Em implementacao Decisoes aprovadas pelo Leandro

## Decisoes Aprovadas

1. **KV path configuravel**: Sim, como opcao no AdminPlugin. Default: undefined
2. **Indices**: Plugin declara quais campos indexar (opcao B) — evita limite
   atomico
3. **Backup/export**: Nao nesta fase
4. **Fallback se KV falhar**: Erro claro, sem fallback silencioso
5. **Storage option**: `storage: "memory" | "kv"` no AdminPlugin, default "kv"

## Ordem de Execucao

```
R1 (paralelo): T1 (DenoKvStorage) + T4 (DenoKvUserStore)
R2 (paralelo): T2 (Indices) + T3 (Schema) + T5 (DenoKvSessionStore + refactor auth DI)
R3:            T6 (AdminPlugin integracao)
R4:            T7 (Testes)
```

## API Resultante

```typescript
// Deno KV (default):
await app.useAdmin(new AdminPlugin({ plugins: [PagePlugin] }));

// In-memory:
await app.useAdmin(
  new AdminPlugin({ plugins: [PagePlugin], storage: "memory" }),
);
```

## Tarefas

### T1: DenoKvStorage implementando Storage

- src/storage/denoKvStorage.ts
- CRUD + busca textual + paginacao + count via meta key
- Chaves: ["plugins", slug, "items", id]

### T2: Indices secundarios

- Campos indexados definidos pelo plugin (indexFields)
- Chaves: ["plugins", slug, "index", field, value_lower, id]
- Atomico com item e count

### T3: Schema versionado

- src/storage/schema.ts
- ["_meta", "schema_version"] → number
- runMigrations() antes de qualquer operacao

### T4: DenoKvUserStore

- src/storage/denoKvUserStore.ts
- ["auth", "users", username] → User
- seedDefaultAdmin so cria se nao existe

### T5: DenoKvSessionStore + refactor auth DI

- src/storage/denoKvSessionStore.ts
- TTL nativo via expireIn
- Refatorar authMiddleware e loginHandler para aceitar sessionStore injetado

### T6: AdminPlugin integracao

- storage option no AdminPluginOptions
- Abre Deno.openKv() uma vez, compartilha entre stores
- Injeta stores corretos baseado na opcao

### T7: Testes

- deno-kv-storage.test.ts, deno-kv-user-store.test.ts,
  deno-kv-session-store.test.ts, schema-migration.test.ts
- Deno.openKv(":memory:") para CI
- Coverage >= 90%
