export function GET(_req: Request): Response {
  return new Response(
    JSON.stringify({
      name: "Leandro",
    }),
    {
      headers: {
        "Content-Type": "application/json",
      },
    },
  );
}
