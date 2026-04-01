/** Middleware function type for the Ten.net request pipeline. */
export type Middleware = (
  req: Request,
  next: () => Promise<Response>,
) => Promise<Response>;
