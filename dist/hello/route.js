// app/hello/route.ts
function GET(_req) {
  return new Response(JSON.stringify({
    name: "Leandro"
  }), {
    headers: {
      "Content-Type": "application/json"
    }
  });
}
export {
  GET
};
