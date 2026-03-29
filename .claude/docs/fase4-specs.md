# Fase 4 — Specs Tecnicas: Sistema de Blog/Posts

> Criado em: 2026-03-28
> Status: Planejado
> Depende de: Fase 3 (concluida na v0.6.0)

## Objetivo

Blog gerenciavel pelo admin com posts, categorias e autor. Rotas publicas
`/blog` e `/blog/{slug}`, listagem paginada, template configuravel e RSS feed
automatico.

## Decisoes Tecnicas

1. **PostsPlugin e CategoriesPlugin ja existem** como stubs em `src/plugins/`.
   Esta fase expande ambos com validacao, relacoes e rotas publicas.
2. **Rotas publicas**: Gerenciadas por um novo `BlogRouteRegistry` (inspirado no
   `DynamicRouteRegistry` da Fase 3), registrado no `AdminPlugin.init()`.
3. **Relacionamentos**: Via IDs armazenados no item (nao joins). Post guarda
   `category_ids: string[]` (JSON serializado) e `author_id: string`.
4. **Paginacao publica**: Query param `?page=N`, 10 posts por pagina (padrao).
5. **RSS**: Rota GET `/blog/rss.xml` gerada automaticamente, sem dependencia
   externa.
6. **Templates**: Reutiliza o `renderDynamicPage()` existente. Posts publicados
   sao renderizados com layouts do `app/`.
7. **Hot-registration**: Posts publicados sao adicionados ao BlogRouteRegistry
   em tempo real (mesmo padrao de PagePlugin + DynamicRouteRegistry).
8. **Storage**: Usa o mesmo Deno KV ja configurado pelo AdminPlugin. Indices em
   `slug`, `status`, `category_ids`.
9. **Admin forms**: Campos `category_ids` e `author_id` usam o tipo `select`
   (novo tipo de campo no CrudForm). Categories listadas como multi-select,
   author como single-select.

## Data Models

### PostsPlugin (expandido)

```typescript
// src/plugins/postsPlugin.ts
model = {
  title: "string",       // Titulo do post
  slug: "string",        // URL slug (unico, validado)
  excerpt: "string",     // Resumo para listagem e SEO
  body: "string",        // Conteudo HTML completo
  cover_image: "string", // URL da imagem de capa (opcional)
  status: "string",      // "draft" | "published"
  category_ids: "string", // JSON array de category IDs (ex: '["id1","id2"]')
  author_id: "string",   // ID do autor (user ou string)
  published_at: "string", // ISO date, preenchido ao publicar
};
```

**Validacao (PostsPlugin.validate):**
- `slug`: obrigatorio, formato lowercase-com-hyphens, unico
- `title`: obrigatorio
- `status`: "draft" ou "published"
- `body`: obrigatorio quando status = "published"
- `published_at`: auto-preenchido na primeira publicacao
- `excerpt`, `cover_image`, `author_id`: opcionais
- `category_ids`: opcional, deve ser JSON array valido quando presente

**Validacao async (PostsPlugin.validateAsync):**
- Slug unico via storage index (mesmo padrao de PagePlugin)

### CategoriesPlugin (expandido)

```typescript
// src/plugins/categoriesPlugin.ts
model = {
  name: "string",        // Nome da categoria
  slug: "string",        // URL slug (unico)
  description: "string", // Descricao (opcional)
};
```

**Validacao (CategoriesPlugin.validate):**
- `name`: obrigatorio
- `slug`: obrigatorio, formato lowercase-com-hyphens, unico
- `description`: opcional

**Validacao async (CategoriesPlugin.validateAsync):**
- Slug unico via storage index

## Rotas Publicas

### GET `/blog` — Listagem paginada

- Query params: `?page=N` (default 1), `?category={slug}` (filtro opcional)
- Filtra apenas posts com `status === "published"`
- Ordena por `published_at` decrescente
- Renderiza via `renderDynamicPage()` com template "blog-list"
- Retorna HTML com lista de posts (titulo, excerpt, cover_image, published_at,
  categories)
- Paginacao: links prev/next

### GET `/blog/{slug}` — Post individual

- Busca post por slug via storage index
- Apenas posts publicados (draft retorna 404)
- Renderiza `body` via `renderDynamicPage()` com template "blog-post"
- Inclui meta tags SEO (title, description = excerpt, og:image = cover_image)
- Resolve category_ids para nomes das categorias
- Exibe autor (se author_id presente)

### GET `/blog/rss.xml` — Feed RSS 2.0

- Content-Type: `application/rss+xml; charset=utf-8`
- Ultimos 20 posts publicados, ordenados por published_at
- Campos: title, link, description (excerpt), pubDate, category, author
- Channel: title configuravel (default: site title), link, description

### GET `/blog/category/{slug}` — Posts por categoria

- Filtra posts publicados que contem a categoria
- Mesma renderizacao e paginacao de `/blog`
- Titulo inclui nome da categoria

## Rotas Admin (ja existentes via CRUD generico)

As rotas admin ja sao geradas automaticamente pelo `AdminPlugin._addPluginCrudRoutes()`:
- GET/POST `/admin/plugins/post-plugin` — listar/criar
- GET/POST `/admin/plugins/post-plugin/{id}` — editar
- POST `/admin/plugins/post-plugin/{id}/delete` — deletar
- GET/POST `/admin/plugins/category-plugin` — listar/criar
- GET/POST `/admin/plugins/category-plugin/{id}` — editar
- POST `/admin/plugins/category-plugin/{id}/delete` — deletar

**Melhorias no admin:**
- Campo `category_ids` renderiza como multi-select com opcoes das categorias
- Campo `author_id` renderiza como select
- Campo `status` renderiza como select (draft/published)
- Campo `body` renderiza como textarea (novo tipo no form-field)
- `published_at` e auto-preenchido e readonly no form

## BlogRouteRegistry

Novo modulo `src/routing/blogRouteRegistry.ts`, inspirado no
`DynamicRouteRegistry`:

```typescript
export class BlogRouteRegistry {
  private _posts = new Map<string, BlogPost>();
  private _postStorage: Storage | null = null;
  private _categoryStorage: Storage | null = null;

  setStorage(postStorage: Storage, categoryStorage: Storage): void;
  async loadFromStorage(): Promise<void>;
  register(post: StorageItem): void;
  unregister(id: string): void;
  match(pathname: string): BlogPost | null;
  listPublished(options: { page, category?, limit? }): BlogPost[];
  getCategories(categoryIds: string[]): Category[];
  generateRSS(siteTitle: string, siteUrl: string): string;
}
```

## Novo tipo de campo: select/textarea no CrudForm

O `CrudForm` e `FormField` existentes suportam `text` e `checkbox`. Fase 4
adiciona:

- **textarea**: Para campos `body` e `excerpt` (conteudo longo)
- **select**: Para campos com opcoes pre-definidas (`status`, `author_id`)
- **multi-select**: Para `category_ids` (checkboxes ou multi-select HTML)

Isso requer:
1. Expandir `FormFieldProps.type` com `"textarea" | "select"`
2. Expandir `FormFieldProps` com `options?: { value: string; label: string }[]`
3. Renderizar `<textarea>` e `<select>` conforme o tipo
4. AdminPlugin precisa resolver as opcoes dinamicamente ao gerar os campos

## Chaves KV (complementar ao schema existente)

```
["plugins", "post-plugin", "items", "{id}"]             -> StorageItem (post)
["plugins", "post-plugin", "index", "slug", "{slug}", "{id}"]  -> id
["plugins", "post-plugin", "index", "status", "published", "{id}"] -> id
["plugins", "post-plugin", "meta", "count"]              -> number
["plugins", "category-plugin", "items", "{id}"]          -> StorageItem (category)
["plugins", "category-plugin", "index", "slug", "{slug}", "{id}"] -> id
["plugins", "category-plugin", "meta", "count"]          -> number
```

## Ordem de Execucao

```
Rodada 1 (paralelo): T1 (PostsPlugin validacao) + T2 (CategoriesPlugin validacao)
Rodada 2 (paralelo): T3 (form-field textarea/select) + T4 (BlogRouteRegistry)
Rodada 3 (sequencial): T5 (rotas publicas /blog, /blog/{slug})
Rodada 4 (paralelo): T6 (RSS feed) + T7 (hot-registration no AdminPlugin)
Rodada 5 (paralelo): T8 (admin form melhorias: select dinamico) + T9 (filtro por categoria)
Rodada 6 (final): T10 (testes completos)
```

### Diagrama de dependencias

```
T1 (PostsPlugin) ──────┐
                        ├──> T4 (BlogRouteRegistry) ──> T5 (rotas publicas)
T2 (CategoriesPlugin) ─┤                                  │
                        │                                  ├──> T6 (RSS)
T3 (form-field) ───────>├──> T8 (admin forms melhorias)    ├──> T7 (hot-reg)
                        │                                  └──> T9 (categoria)
                        │
                        └──> T10 (testes)
```

## Tarefas

### T1: Expandir PostsPlugin com validacao completa

**Agente:** backend

**Arquivos:**
- `src/plugins/postsPlugin.ts`

**O que fazer:**
- Adicionar campo `published_at: "string"` ao model
- Implementar `validate()` override: slug format, status enum, body required on
  publish
- Implementar `validateAsync()`: slug uniqueness via storage index
- Marcar campos opcionais: `excerpt`, `cover_image`, `author_id`, `category_ids`
- Auto-preencher `published_at` na primeira publicacao

**Criterios de aceite:**
- [ ] PostsPlugin.validate() rejeita slug invalido
- [ ] PostsPlugin.validate() rejeita status != draft|published
- [ ] PostsPlugin.validate() exige body quando status = published
- [ ] PostsPlugin.validateAsync() rejeita slug duplicado
- [ ] Campos opcionais nao geram erro de validacao
- [ ] published_at preenchido automaticamente

### T2: Expandir CategoriesPlugin com validacao

**Agente:** backend

**Arquivos:**
- `src/plugins/categoriesPlugin.ts`

**O que fazer:**
- Implementar `validate()` override: slug format, name required
- Implementar `validateAsync()`: slug uniqueness
- Marcar `description` como opcional

**Criterios de aceite:**
- [ ] CategoriesPlugin.validate() rejeita slug invalido
- [ ] CategoriesPlugin.validate() exige name
- [ ] CategoriesPlugin.validateAsync() rejeita slug duplicado
- [ ] description e opcional

### T3: Expandir FormField com textarea e select

**Agente:** frontend

**Arquivos:**
- `src/admin/components/form-field.tsx`

**O que fazer:**
- Adicionar tipos `"textarea" | "select"` ao `FormFieldProps.type`
- Adicionar prop `options?: { value: string; label: string }[]`
- Adicionar prop `multiple?: boolean` (para multi-select)
- Renderizar `<textarea>` com Tailwind classes para tipo textarea
- Renderizar `<select>` com `<option>` para tipo select
- Manter compatibilidade total com text/checkbox existentes

**Criterios de aceite:**
- [ ] textarea renderiza com rows=6, classes Tailwind consistentes
- [ ] select renderiza opcoes corretamente
- [ ] multi-select funciona com multiple=true
- [ ] Campos text e checkbox nao sao afetados
- [ ] Snapshot tests atualizados

### T4: Criar BlogRouteRegistry

**Agente:** backend

**Arquivos:**
- `src/routing/blogRouteRegistry.ts` (novo)

**O que fazer:**
- Implementar `BlogRouteRegistry` com interface similar ao DynamicRouteRegistry
- `setStorage(postStorage, categoryStorage)` para vincular storages
- `loadFromStorage()` carrega posts publicados e ordena por published_at
- `register(post)` adiciona post publicado ao registry
- `unregister(id)` remove post do registry
- `match(pathname)` faz match de `/blog/{slug}`
- `listPublished({ page, category, limit })` retorna lista paginada
- `getCategories(categoryIds)` resolve IDs para objetos de categoria
- `generateRSS(siteTitle, siteUrl)` gera XML do feed RSS 2.0

**Criterios de aceite:**
- [ ] loadFromStorage carrega apenas posts publicados
- [ ] Posts ordenados por published_at desc
- [ ] match funciona para /blog/{slug}
- [ ] listPublished pagina corretamente (10 por pagina)
- [ ] listPublished filtra por categoria quando informada
- [ ] getCategories resolve IDs para nomes
- [ ] generateRSS gera XML valido com ultimos 20 posts
- [ ] Posts draft nao aparecem

### T5: Rotas publicas /blog e /blog/{slug}

**Agente:** backend

**Arquivos:**
- `src/plugins/adminPlugin.tsx` — adicionar rotas publicas no init()
- `src/routing/blogRouteRegistry.ts` — referencia

**O que fazer:**
- Adicionar logica no `AdminPlugin.init()` para detectar PostsPlugin e
  CategoriesPlugin
- Criar `BlogRouteRegistry`, vincular storages, carregar do storage
- Registrar rota GET `/blog` que renderiza listagem paginada via
  renderDynamicPage
- Registrar rota GET `/blog/{slug}` que renderiza post individual
- Resolver categorias e autor nos dados do post
- Aplicar layouts e document.html do app/
- Retornar 404 para posts draft ou slug inexistente
- Passar BlogRouteRegistry no retorno de init() para hot-registration

**Criterios de aceite:**
- [ ] GET /blog retorna HTML com lista de posts publicados
- [ ] GET /blog?page=2 retorna segunda pagina
- [ ] GET /blog/{slug} retorna HTML do post
- [ ] GET /blog/{slug-inexistente} retorna 404
- [ ] Posts draft nao aparecem em /blog nem /blog/{slug}
- [ ] Categorias resolvidas e exibidas no post
- [ ] SEO meta tags presentes (title, description, og:image)
- [ ] Layouts do app/ aplicados

### T6: RSS Feed automatico

**Agente:** backend

**Arquivos:**
- `src/plugins/adminPlugin.tsx` — adicionar rota /blog/rss.xml
- `src/routing/blogRouteRegistry.ts` — metodo generateRSS

**O que fazer:**
- Registrar rota GET `/blog/rss.xml` no AdminPlugin.init()
- Gerar RSS 2.0 XML via BlogRouteRegistry.generateRSS()
- Content-Type: `application/rss+xml; charset=utf-8`
- Ultimos 20 posts publicados
- Campos: title, link (URL completa), description (excerpt), pubDate (RFC 822),
  category, author

**Criterios de aceite:**
- [ ] GET /blog/rss.xml retorna XML valido
- [ ] Content-Type correto
- [ ] Apenas posts publicados no feed
- [ ] Maximo 20 itens
- [ ] Dates no formato RFC 822
- [ ] Links absolutos (baseados na URL da request)

### T7: Hot-registration de posts no AdminPlugin

**Agente:** backend

**Arquivos:**
- `src/plugins/adminPlugin.tsx` — CRUD handlers do PostsPlugin

**O que fazer:**
- Na rota POST create: se PostsPlugin e status=published, registrar no
  BlogRouteRegistry
- Na rota POST update: re-registrar/desregistrar conforme status
- Na rota POST delete: desregistrar do BlogRouteRegistry
- Mesmo padrao ja usado para PagePlugin + DynamicRouteRegistry

**Criterios de aceite:**
- [ ] Criar post publicado adiciona ao blog publico imediatamente
- [ ] Mudar post para draft remove do blog publico
- [ ] Deletar post remove do blog publico
- [ ] Posts nao-publicados nunca aparecem nas rotas publicas

### T8: Melhorias no admin form para posts

**Agente:** frontend

**Arquivos:**
- `src/plugins/adminPlugin.tsx` — _addPluginCrudRoutes e _fieldType
- `src/admin/components/crud-form.tsx` — se necessario

**O que fazer:**
- Expandir `_fieldType()` para mapear campos especificos do PostsPlugin:
  - `body` -> textarea
  - `excerpt` -> textarea
  - `status` -> select com opcoes ["draft", "published"]
  - `category_ids` -> select multiple com opcoes das categorias
  - `author_id` -> select com opcoes (por enquanto input text)
  - `published_at` -> text readonly
- Quando gerando campos para PostsPlugin, resolver categorias do storage para
  popular opcoes do select
- Campo `published_at` e readonly quando ja preenchido

**Criterios de aceite:**
- [ ] body e excerpt renderizam como textarea
- [ ] status renderiza como select com draft/published
- [ ] category_ids renderiza como multi-select com categorias do storage
- [ ] published_at aparece readonly quando preenchido
- [ ] Outros plugins nao sao afetados

### T9: Filtro por categoria na listagem

**Agente:** backend

**Arquivos:**
- `src/routing/blogRouteRegistry.ts`
- `src/plugins/adminPlugin.tsx` — rota GET /blog/category/{slug}

**O que fazer:**
- Adicionar rota GET `/blog/category/{slug}` no AdminPlugin.init()
- Filtrar posts publicados que contem a categoria (pelo category slug)
- Resolver slug da categoria para ID via CategoriesPlugin storage index
- Mesma renderizacao e paginacao de /blog
- Titulo da pagina inclui nome da categoria

**Criterios de aceite:**
- [ ] GET /blog/category/{slug} retorna posts filtrados
- [ ] Paginacao funciona com filtro
- [ ] Categoria inexistente retorna 404
- [ ] Titulo da pagina inclui nome da categoria

### T10: Testes completos da Fase 4

**Agente:** tester

**Arquivos:**
- `src/test/posts-plugin-validation.test.ts` (novo)
- `src/test/categories-plugin-validation.test.ts` (novo)
- `src/test/blog-route-registry.test.ts` (novo)
- `src/test/blog-public-routes.test.ts` (novo)
- `src/test/rss-feed.test.ts` (novo)
- `src/test/form-field.test.ts` (novo ou expandir existente)
- Atualizar snapshots se necessario

**O que fazer:**
- Testes unitarios para PostsPlugin.validate e validateAsync
- Testes unitarios para CategoriesPlugin.validate e validateAsync
- Testes unitarios para BlogRouteRegistry (register, unregister, match, list,
  rss)
- Testes de integracao para rotas publicas /blog, /blog/{slug}, /blog/rss.xml,
  /blog/category/{slug}
- Testes para hot-registration (criar/editar/deletar post atualiza rotas)
- Testes para novos tipos de FormField (textarea, select)
- Testes para CrudForm com campos especiais
- Usar `Deno.openKv(":memory:")` para CI
- Manter coverage >= 90%

**Criterios de aceite:**
- [ ] Todos os testes passam com `deno task test`
- [ ] Coverage >= 90%
- [ ] `deno task check` sem erros de tipo
- [ ] `deno task lint` sem warnings
- [ ] Nenhum teste existente quebrado

## Resumo de Arquivos Impactados

| Arquivo | Tarefas | Tipo |
| --- | --- | --- |
| `src/plugins/postsPlugin.ts` | T1 | Expandir com validacao e published_at |
| `src/plugins/categoriesPlugin.ts` | T2 | Expandir com validacao |
| `src/admin/components/form-field.tsx` | T3 | Adicionar textarea e select |
| `src/routing/blogRouteRegistry.ts` | T4, T5, T6, T9 | NOVO — registry + RSS |
| `src/plugins/adminPlugin.tsx` | T5, T6, T7, T8, T9 | Rotas publicas, hot-reg, form |
| `src/admin/components/crud-form.tsx` | T8 | Ajustes se necessario |
| `src/admin/mod.ts` | — | Ja exporta PostsPlugin e CategoriesPlugin |
| `src/test/*.test.ts` | T10 | 5-6 novos arquivos de teste |

## Notas

- O PostsPlugin e CategoriesPlugin ja estao registrados no `demo.ts` e
  exportados em `src/admin/mod.ts`. Nao e necessario alterar esses arquivos.
- A relacao post->categories e por referencia (IDs), nao por foreign key
  enforced. Se uma categoria for deletada, os posts que a referenciam simplesmente
  nao mostram essa categoria (graceful degradation).
- O RSS feed nao precisa de dependencia externa. XML gerado manualmente com
  template string.
- Templates "blog-list" e "blog-post" sao convencionais. Se o app/ nao tiver
  templates especificos, usa o layout/document padrao.
