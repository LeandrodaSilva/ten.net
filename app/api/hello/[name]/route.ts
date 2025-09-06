export function GET(_req: Request, ctx: {
  params: {
    name: string
  }
}): Response {
  return new Response(`Hello ${ctx.params.name}`);
}