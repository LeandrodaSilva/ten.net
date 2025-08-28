export function controller<T extends new (...args: any[]) => any>(constructor: T) {
  return class extends constructor {
    public req!: Request;
    public request!: Request;

    constructor(...args: any[]) {
      super(...args);
      const maybeReq: Request | undefined = args.find((a) => a instanceof Request)
        ?? (typeof args[0] === "object" && args[0] && (args[0] as any).request instanceof Request
          ? (args[0] as any).request
          : undefined);

      if (maybeReq) {
        (this as any).req = maybeReq;
        (this as any).request = maybeReq;
      }
    }
  } as T;
}