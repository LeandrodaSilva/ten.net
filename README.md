# Ten.net

Um microframework minimalista para Deno focado em controllers, decorators e injeção de dependências simples. Use `@route` para mapear endpoints, `@controller` para dar ergonomia ao acesso ao Request, `@log` para inspecionar chamadas e `@validate/@required` para validação rápida de parâmetros.

- Roteamento com URLPattern nativo do Deno
- Controllers com helpers de resposta (`Ok`, `Error`, `NotFound`)
- Injeção de dependência por tipo, por nome e por fábrica (`addScoped`/`resolve`)
- Injeção automática de `Request` no controller
- Decorators para rotas, logging e validação

## Table of Contents

- [Instalação e Requisitos](#instalação-e-requisitos)
- [Comece Rápido](#comece-rápido)
- [Conceitos e Exemplos](#conceitos-e-exemplos)
  - [Controllers e Rotas](#controllers-e-rotas)
  - [Parâmetros de rota e URLPattern](#parâmetros-de-rota-e-urlpattern)
  - [Injeção de Dependências](#injeção-de-dependências)
  - [Acesso ao Request](#acesso-ao-request)
  - [Respostas Helpers](#respostas-helpers)
  - [Validação com @validate e @required](#validação-com-validate-e-required)
  - [Logging com @log](#logging-com-log)
- [Referência de API](#referência-de-api)
  - [Classe Ten](#classe-ten)
  - [Decorators](#decorators)
  - [BaseController](#basecontroller)
  - [Tipos](#tipos)
- [Arquitetura](#arquitetura)
- [Dúvidas e Dicas](#dúvidas-e-dicas)
- [Licença](#licença)

## Instalação e Requisitos

- Deno 1.42+ (URLPattern e Deno.serve nativos)
- Este pacote é local; importe a partir do `mod.ts` do projeto ou publique conforme sua preferência.

## Comece Rápido

Crie um `main.ts` com um controller de exemplo e suba o servidor.

```ts
// main.ts
import { Ten, route, controller, BaseController } from "./mod.ts";

@controller
class HelloController extends BaseController {
  @route("GET", "/hello/:name")
  getHello(name: string) {
    return this.Ok({ message: `Hello, ${name}!` });
  }
}

const app = Ten.create()
  .addControllers(); // registra rotas decoradas

// Porta via variável de ambiente PORT (ex.: 8000)
// Execute: PORT=8000 deno run --allow-net --allow-env main.ts
app.start();
```

Execute:

```bash
PORT=8000 deno run --allow-net --allow-env main.ts
```

Acesse: http://localhost:8000/hello/world

## Conceitos e Exemplos

### Controllers e Rotas

- Use `@controller` em classes para habilitar conveniências (como `this.req`).
- Use `@route(method, pattern)` em métodos para expor endpoints.

```ts
import { controller, route, BaseController } from "./mod.ts";

@controller
class UserController extends BaseController {
  @route("GET", "/users")
  list() {
    return this.Ok([{ id: 1, name: "Ada" }]);
  }
}
```

### Parâmetros de rota e URLPattern

- Padrões são `URLPattern` nativo: `"/users/:id"`.
- Parâmetros nomeados são extraídos e passados como argumentos do método na ordem em que aparecem.
- O último argumento recebido pelo método pode ser o objeto `groups` do `URLPattern` (caso você o declare).

```ts
@route("GET", "/users/:id/books/:bookId")
getBook(id: string, bookId: string, groups?: Record<string, string>) {
  // id === groups!.id, bookId === groups!.bookId
  return this.Ok({ id, bookId, all: groups });
}
```

### Injeção de Dependências

- Registre serviços com `addScoped`.
- Injete por tipo (nome da classe) ou por nome (nome do parâmetro no ctor do controller).

```ts
class UserService {
  findAll() { return [{ id: 1, name: "Ada" }]; }
}

@controller
class UserController extends BaseController {
  constructor(private userService: UserService) { super(); }

  @route("GET", "/users")
  list() { return this.Ok(this.userService.findAll()); }
}

const app = Ten.net()
  .addScoped(UserService) // chave derivada: "userService"
  .addControllers();
```

Outras formas de registro:

```ts
// Por chave literal
app.addScoped("db", class Db { /*...*/ });

// Por token + implementação
abstract class ILogger { log(msg: string): void {} }
class ConsoleLogger implements ILogger { log(msg: string) { console.log(msg); } }
app.addScoped(ILogger, ConsoleLogger);

// Fábrica
app.addScoped(() => new UserService());
```

Resolvendo manualmente:

```ts
const svc = app.resolve("userService");
```

### Acesso ao Request

- Se o construtor do controller tiver parâmetro `Request` ou `req`/`request`, o `Request` será injetado.
- Além disso, `@controller` define `this.req` e `this.request` automaticamente quando possível.

```ts
@controller
class EchoController extends BaseController {
  constructor(private req: Request) { super(); }

  @route("GET", "/echo")
  echo() { return this.Ok({ url: this.req.url }); }
}
```

### Respostas Helpers

`BaseController` expõe helpers padronizados:

- `Ok(data)` -> 200
- `Error(error)` -> 500
- `NotFound()` -> 404

```ts
return this.Ok({ ok: true });
```

### Validação com `@validate` e `@required`

Garanta que parâmetros posicionais foram fornecidos (útil para rotas com path params):

```ts
import { validate, required } from "./mod.ts";

@controller
class BookController extends BaseController {
  @validate
  @route("GET", "/books/:id")
  getById(@required id: string) {
    return this.Ok({ id });
  }
}
```

Se o parâmetro exigido não vier na URL, um erro é lançado antes da execução do método.

### Logging com `@log`

Loga chamadas, argumentos, retornos e resolve de `Promise` (inclui leitura do corpo de `Response` via `clone`).

```ts
import { log } from "./mod.ts";

@controller
class HealthController extends BaseController {
  @log
  @route("GET", "/health")
  check() { return this.Ok({ status: "ok" }); }
}
```

## Referência de API

### Classe `Ten`

- `static net() | init() | create()`
  - Cria uma nova instância de `Ten`.
- `handler(req: Request): Promise<Response> | Response`
  - Manipulador para Deno.serve; realiza o matching de rotas e invoca a action.
- `start()`
  - Sobe um servidor com `Deno.serve({ port: Deno.env.get("PORT") }, handler)`. Defina `PORT` (ex.: 8000).
- `addControllers()`
  - Carrega todas as rotas registradas via decorators no `routesRegistry`.
- `addScoped(...)`
  - Sobrecargas para registrar serviços por chave, por token/classe ou por fábrica. Instâncias ficam acessíveis em `this[key]` e via `resolve`.
- `resolve(key | token)`
  - Recupera um serviço por chave literal ou pelo construtor/tipo.

Tipagem genérica: `Ten<S>` propaga serviços registrados para a instância para melhor autocompletar.

### Decorators

- `@controller`
  - Adiciona `req/request` à instância quando possível.
- `@route(method: "GET"|"POST"|..., pattern: string|URLPattern)`
  - Registra a rota e extrai a ordem dos parâmetros nomeados quando `pattern` é string.
- `@log`
  - Loga execução de métodos (sync/async) e corpo das Responses (via clone).
- `@validate` + `@required`
  - Valida presença de argumentos posicionais anotados como `@required`.

### `BaseController`

- `Ok(data: any): Response`
- `Error(error: any): Response`
- `NotFound(): Response`

### Tipos

- `ITen { handler(req: Request): Response }`

## Arquitetura

- Registrador de rotas: `@route` adiciona `RouteDef` no `routesRegistry` com `{ method, pattern(URLPattern), controller, action, paramOrder }`.
- Despacho: `Ten.handler` varre rotas, confere método e casa o `URLPattern` com a URL da requisição.
- Binding de parâmetros:
  - Extrai `groups` do `URLPattern` e mapeia para os argumentos conforme `paramOrder` (ordem dos `:params`).
  - O método recebe `(...orderedParams, groups)`.
- Injeção de dependências e Request:
  - No `new Controller(...args)`, injeta `Request` por tipo ou nome (`req`/`request`).
  - Injeta serviços por tipo (nome da classe -> camelCase, removendo prefixo `I` se parecer interface) ou por nome do parâmetro.
  - Serviços também ficam em `this[key]` na instância de `Ten`.
- Helpers e decorators:
  - `@controller` garante `this.req/this.request` quando o Request está disponível.
  - `@validate/@required` usam metadados para checar argumentos exigidos.
  - `@log` instrumenta o método e promete.

## Dúvidas e Dicas

- 404 Not Found: verifique o método HTTP, o `pattern` e se `addControllers()` foi chamado.
- Porta do servidor: defina `PORT` como número. Ex.: `PORT=8000 deno run --allow-net --allow-env main.ts`.
- Importações: quando usar fora deste repositório, aponte para o `mod.ts` publicado/versão raw.

## Licença

MIT License

Copyright (c) 2025 Leandro da Silva

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

