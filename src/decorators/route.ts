export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "OPTIONS" | "HEAD";

export type RouteDef = {
  method: HttpMethod;
  pattern: URLPattern;
  controller: new (...args: any[]) => any;
  action: string;
  paramOrder?: string[];
};

export const routesRegistry: RouteDef[] = [];

function extractParamOrderFromPattern(pattern: string): string[] {
  // Captura :paramName na ordem em que aparecem
  const names: string[] = [];
  const re = /:([A-Za-z_][A-Za-z0-9_]*)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(pattern)) !== null) {
    names.push(m[1]);
  }
  return names;
}

export function route(method: HttpMethod, pattern: string | URLPattern) {
  return function (target: any, propertyKey: string, _descriptor: PropertyDescriptor) {
    const ctor = target.constructor as new (...args: any[]) => any;
    const isString = typeof pattern === "string";
    const urlPattern = isString ? new URLPattern({ pathname: pattern as string }) : (pattern as URLPattern);
    const paramOrder = isString ? extractParamOrderFromPattern(pattern as string) : undefined;
    routesRegistry.push({ method, pattern: urlPattern, controller: ctor, action: propertyKey, paramOrder });
  };
}
