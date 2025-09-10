export function GET(_req: Request): Response {
  const query = new URL(_req.url).searchParams;
  const name = query.get("name");
  console.log(name);
  return new Response(JSON.stringify({
    name
  }), {
    headers: {
      "Content-Type": "application/json"
    }
  });
}