export async function POST(_req: Request): Promise<Response> {
  const formData = await _req.formData();
  const name = formData.get("name");
  console.log(name);
  return new Response(
    JSON.stringify({
      name,
    }),
    {
      status: 302,
      headers: {
        Location: `/form/congrats?name=${name}`,
      },
    },
  );
}
