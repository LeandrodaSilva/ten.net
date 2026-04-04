# Ten.net Online Playground — Design Spec

**Data:** 2026-04-03 **Status:** Aprovado **Versao base:** v0.16.0

## Objetivo

Playground online interativo que funciona como showcase/demo do Ten.net.
Visitantes (iniciantes em web dev) interagem com demos pre-definidos, podendo
fazer edicoes limitadas (textos em templates, route handlers) e ver o resultado
em tempo real. 100% no browser, zero backend.

## Publico-alvo

Iniciantes em desenvolvimento web que procuram um framework simples para
comecar. A experiencia deve ser autoexplicativa, sem jargao pesado.

## Arquitetura: SW Unico + Manifest Swap

### Visao geral

O playground e uma SPA estatica. Um unico Service Worker controla toda a
aplicacao. Quando o usuario troca de demo ou edita codigo, o playground envia o
novo manifest via `postMessage` ao SW, que atualiza o TenCore internamente. O
preview usa navegacao real dentro do mesmo SW scope.

### Componentes no Main Thread

- **DemoRegistry** — demos pre-compilados com manifests prontos
- **CodeEditor** — edicao limitada de templates e route handlers, modifica o
  manifest em memoria
- **PreviewFrame** — `<iframe>` apontando para `/preview/*`

### Service Worker

- **TenCore** com novo metodo `updateManifest()` — hot-swap sem reinstalar o SW
- Rotas `/preview/*` vao para o TenCore, o resto faz passthrough normal

### Fluxo de request

1. Usuario edita template → manifest atualizado em memoria
2. `postMessage({ type: "UPDATE_MANIFEST", manifest })` → SW atualiza TenCore
3. iframe navega para `/preview/rota` → SW intercepta
4. `TenCore.fetch(request)` → Response com HTML renderizado
5. iframe exibe resultado instantaneamente

## Mudancas no Core do Ten.net

### TenCore.updateManifest(manifest)

- Metodo publico que substitui o manifest interno em runtime
- Permite hot-swap sem reinstalar o Service Worker
- O SW escuta `message` events e chama `core.updateManifest(data.manifest)`
- Util alem do playground — qualquer app SW que precise trocar rotas
  dinamicamente

### SW adapter — pathPrefix

- O adapter filtra rotas: apenas `/preview/*` vai para o TenCore, o resto faz
  passthrough
- Configuravel via opcao `pathPrefix` em
  `fire(core, { pathPrefix: "/preview" })`

## UI Design

### Design System

- **Base:** Material Design 3
- **Primary color:** `#3178c6` (TypeScript Blue)
- **Icons:** Material Symbols Outlined
- **Surfaces:** fundo `#eef1f6`, cards em `#ffffff` com `box-shadow`
- **Elementos selecionados/foco:** fill `#3178c6` com texto branco +
  `box-shadow: 0 2px 8px rgba(49,120,198,0.3)`
- **Elementos inativos:** fill `#f5f7fa` com texto `#1a1c1e`
- **Categorias:** icone Material + texto `#1a1c1e` weight 600 uppercase
- **Border-radius:** 16px containers, 12px items interativos, 20px botoes
- **Sem linhas/borders** — hierarquia via sombras e tonal surfaces
- **Isomorfismo:** mesma linguagem visual no standalone e embed

### Layout Standalone

- **Top bar** — logo, versao, botoes Reset e Run
- **Sidebar esquerda** — busca + categorias com cards de demo
- **Area central** — tabs de arquivos (route.ts, page.html, layout.html) + split
  editor/preview
- **Preview** — barra de URL simulada + iframe com conteudo renderizado

### Layout Embed (docs)

- Compacto — apenas editor + preview lado a lado
- Chips abaixo: "Abrir no Playground" e "Copiar codigo"
- Empilha em telas pequenas (responsivo)

## Demos

### Routing

| Demo            | Descricao                   | Arquivos editaveis  |
| --------------- | --------------------------- | ------------------- |
| Hello World     | Rota basica com GET handler | route.ts, page.html |
| Rotas Dinamicas | Parametros com `[slug]`     | route.ts, page.html |
| API REST        | GET, POST, PUT, DELETE      | route.ts            |

### Templates

| Demo           | Descricao                          | Arquivos editaveis                |
| -------------- | ---------------------------------- | --------------------------------- |
| Page + Layout  | Templates com `{{variavel}}`       | route.ts, page.html, layout.html  |
| Nested Layouts | Layouts hierarquicos `{{content}}` | page.html, layout.html (2 niveis) |

### Forms

| Demo                  | Descricao                                | Arquivos editaveis  |
| --------------------- | ---------------------------------------- | ------------------- |
| Formulario de Contato | POST handler, validacao, feedback visual | route.ts, page.html |

### Showcase

| Demo                     | Descricao                                                                   | Arquivos editaveis               |
| ------------------------ | --------------------------------------------------------------------------- | -------------------------------- |
| Landing Page Promocional | LP completa: hero, features, pricing, formulario de contato. Visual polido. | route.ts, page.html, layout.html |

### Offline / SW

| Demo             | Descricao                                                                                                                                                                                 | Arquivos editaveis  |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| TODO App Offline | CRUD com IndexedDB, 100% offline, badge online/offline, sync simulado (mock endpoint interceptado pelo proprio SW) ao reconectar. Demonstra TenCore + IndexedDBStorage + StorageSync API. | route.ts, page.html |

## Componente Embed

Web component `<tennet-playground>`:

```html
<tennet-playground demo="hello-world"></tennet-playground>
<tennet-playground demo="todo-offline" height="400"></tennet-playground>
```

- Registra um SW compartilhado entre todos os embeds da pagina
- Atributo `demo` referencia um manifest pre-compilado
- Responsivo — empilha editor/preview em telas pequenas

## Editor de Codigo

**CodeMirror 6** (~130kb gzipped)

- Syntax highlight para TypeScript e HTML
- Edicao limitada — sem autocomplete completo, sem LSP
- Tema escuro consistente com o dark surface do editor (`#1b1b1f`)
- Compartilhado entre standalone e embed

## Estrutura de Arquivos

```
playground/
  index.html              # SPA standalone
  sw.ts                   # Service Worker do playground
  src/
    app.ts                # Bootstrap, registra SW, monta UI
    components/
      sidebar.ts          # Navegacao com categorias e cards
      editor.ts           # CodeMirror wrapper
      preview.ts          # iframe + comunicacao com SW
      tabs.ts             # Tabs de arquivos
      url-bar.ts          # Barra de URL simulada
    demos/
      registry.ts         # Indice de todos os demos
      hello-world/        # Manifest + arquivos editaveis
      dynamic-routes/
      api-rest/
      page-layout/
      nested-layouts/
      contact-form/
      landing-page/       # LP promocional completa
      todo-offline/       # TODO app offline + sync
    embed/
      tennet-playground.ts  # Web component <tennet-playground>
    theme/
      tokens.css          # Design tokens M3 + TS Blue
      components.css      # Estilos dos componentes
```

## Hospedagem e Deploy

- Build gera arquivos estaticos em `playground/dist/`
- esbuild bundla SPA + demos + SW
- Demos pre-compilados em build time — manifests gerados a partir dos diretorios
  com route.ts/page.html/layout.html
- Deploy em CDN/hosting estatico (GitHub Pages, Cloudflare Pages, Vercel)
- URL: `play.ten.net` ou `ten.net/playground`
- Embed distribuido como entrypoint JSR: `@leproj/tennet-playground`

## Decisoes Tecnicas

| Decisao     | Escolha                    | Motivo                                                        |
| ----------- | -------------------------- | ------------------------------------------------------------- |
| Arquitetura | SW Unico + Manifest Swap   | Demonstra SW real, navegacao funciona, um unico SW simplifica |
| Runtime     | 100% browser, zero backend | Hosting estatico, escala infinita, custo zero                 |
| Editor      | CodeMirror 6               | Equilibrio peso/DX, bom para embeds                           |
| Design      | M3 + TS Blue               | Minimalista, sombras, sem linhas, identidade TypeScript       |
| Embed       | Web Component              | Encapsulado, funciona em qualquer doc site                    |
| Core change | updateManifest()           | Feature util alem do playground                               |
