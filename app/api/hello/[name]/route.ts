export function GET(_req: Request, ctx: {
  params: {
    name: string;
  };
}): Response {
  return new Response(
    JSON.stringify({
      message: `Hello ${ctx.params.name}`,
    }),
    {
      headers: {
        "Content-Type": "application/json",
      },
    },
  );
}
