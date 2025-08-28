import {Reflection} from "@denorid/reflection";
import {RouteDef, routesRegistry} from "./decorators/route.ts";
import {ITen} from "./types.ts";

function getParamNames(fn: Function): string[] {
  const str = fn.toString()
    .replace(/\/\*.*?\*\//gs, "")
    .replace(/\/\/.*$/gm, "");
  const argsMatch = str.match(/constructor\s*\(([^)]*)\)/) || str.match(/^[^(]*\(([^)]*)\)/);
  if (!argsMatch) return [];
  return argsMatch[1]
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => s.replace(/=.*/, "").trim())
    .map((s) => s.replace(/[{}\[\]]/g, "").trim());
}

function toKey(name: string) {
  if (!name) return name;
  if (name.length > 1 && name[0] === "I" && name[1] === name[1].toUpperCase()) {
    name = name.slice(1);
  }
  return name.charAt(0).toLowerCase() + name.slice(1);
}

export class Ten<S extends Record<string, any> = {}> implements ITen {
  static net() {
    return new this();
  }

  static init() {
    return Ten.net();
  }

  static create() {
    return Ten.net();
  }

  private readonly _services: Record<string, unknown> = {};
  private readonly _routes: RouteDef[] = [];

  public async handler(req: Request) {
    const method = req.method.toUpperCase();

    for (const r of this._routes) {
      if (r.method !== method) continue;
      const match = r.pattern.exec(req.url);
      if (!match) continue;

      const Ctor = r.controller as any;

      // Tenta obter tipos dos parâmetros do construtor
      let paramTypes: any[] | undefined;
      try {
        paramTypes =
          (Reflection.getMetadata &&
            Reflection.getMetadata("design:paramtypes", Ctor)) ||
          (Reflection.getOwnMetadata &&
            Reflection.getOwnMetadata("design:paramtypes", Ctor)) ||
          undefined;
      } catch {
        paramTypes = undefined;
      }

      const paramNames = getParamNames(Ctor);
      const argCount = Math.max(paramTypes?.length || 0, paramNames.length);

      const args: any[] = new Array(argCount).fill(undefined);

      for (let i = 0; i < argCount; i++) {
        const t = paramTypes?.[i];
        const n = paramNames[i];

        // Injeção do Request por tipo ou por nome
        if (t === Request || n === "req" || n === "request") {
          args[i] = req;
          continue;
        }

        // Injeção por tipo (classe conhecida registrada no Ten) -> pelo nome da classe
        if (typeof t === "function" && t?.name) {
          const key = toKey(t.name);
          if ((this as any)[key]) {
            args[i] = (this as any)[key];
            continue;
          }
        }

        // Injeção por nome (ex.: userService)
        if (n && (this as any)[n]) {
          args[i] = (this as any)[n];
          continue;
        }

        // Fallback: undefined
        args[i] = undefined;
      }

      const controller = new Ctor(...args);
      const action = (controller as any)[r.action].bind(controller);

      // Extrai grupos do URLPattern
      const groups = match.pathname?.groups ?? {};
      const orderedParams: any[] = r.paramOrder?.map((k) => groups[k]) ?? [];

      const result = action(...orderedParams, groups);
      if (result instanceof Promise) {
        return result;
      }
      return result as Response;
    }

    return new Response(JSON.stringify({
      success: false,
      error: "Not Found",
    }), {
      status: 404,
    });
  }

  public start() {
    Deno.serve({ port: Deno.env.get("PORT") }, this.handler.bind(this));
  }

  public addControllers(): Ten<S> {
    this._routes.push(...routesRegistry);
    return this as any;
  }

  // Tipagem avançada: quando a chave é literal, propagamos T para o tipo de retorno
  public addScoped<K extends string, I, T extends I>(
    key: K,
    impl: abstract new () => T,
  ): Ten<S & Record<K, T>>;
  public addScoped<K extends string, I, T extends I>(
    key: K,
    factory: () => T,
  ): Ten<S & Record<K, T>>;

  // Demais sobrecargas (mantêm compatibilidade)
  public addScoped<I, T extends I>(
    token: abstract new () => I,
    impl: abstract new () => T,
  ): this;
  public addScoped<I, T extends I>(impl: abstract new () => T): this;
  public addScoped<I, T extends I>(
    token: abstract new () => I,
    factory: () => T,
  ): this;
  public addScoped<I, T extends I>(factory: () => T): this;

  public addScoped<I, T extends I>(
    a: any,
    b?: any,
  ): any {
    try {
      const meta = Reflection?.getOwnMetadata?.();
      if (meta) console.debug("addScoped(): metadata", meta);
    } catch (_) { /* ignore */ }

    const isCtor = (x: unknown): x is abstract new (...args: any[]) => any =>
      typeof x === "function" && !!(x as any).prototype;

    const toKey = (name: string) => {
      if (
        name.length > 1 && name[0] === "I" && name[1] === name[1].toUpperCase()
      ) {
        name = name.slice(1);
      }
      return name.charAt(0).toLowerCase() + name.slice(1);
    };

    let key: string;
    let instance: I;

    if (typeof a === "string") {
      key = a;
      if (isCtor(b)) {
        instance = new b();
      } else if (typeof b === "function") {
        instance = b();
      } else {
        throw new Error("addScoped(key, impl|factory): impl/factory inválido");
      }
    } else if (isCtor(a)) {
      if (isCtor(b)) {
        key = toKey(a.name || "service");
        instance = new b();
      } else if (typeof b === "function") {
        key = toKey(a.name || "service");
        instance = b();
      } else {
        key = toKey(a.name || "service");
        instance = new a();
      }
    } else if (typeof a === "function") {
      instance = (a as () => I)();
      key = "service";
    } else {
      throw new Error("Uso inválido de addScoped");
    }

    (this as any)[key] = instance;
    this._services[key] = instance;

    return this as any;
  }

  // resolve com chave literal preserva tipo do serviço
  public resolve<K extends keyof S>(key: K): S[K];
  public resolve<I>(token: abstract new () => I): I;
  public resolve(a: any): any {
    const toKey = (name: string) => {
      if (
        name.length > 1 && name[0] === "I" && name[1] === name[1].toUpperCase()
      ) {
        name = name.slice(1);
      }
      return name.charAt(0).toLowerCase() + name.slice(1);
    };

    const key = typeof a === "string" ? a : toKey(a?.name ?? "service");
    const service = this._services[key];
    if (!service) throw new Error(`Serviço não encontrado: ${key}`);
    return service;
  }
}

// Mapeia propriedades de S para a instância de Ten (melhora a descoberta em editores)
export interface Ten<S extends Record<string, any>> extends S {}
