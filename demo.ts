import { Ten } from "./src/mod.ts";

const result = await Deno.bundle({
  entrypoints: [
    "./app/hello/route.ts",
    "./app/form/route.ts",
  ],
  outputDir: "dist",
  platform: "deno",
  minify: false,
});
console.log(result);

if (import.meta.main) {
  const app = Ten.net();
  await app.start();
}
