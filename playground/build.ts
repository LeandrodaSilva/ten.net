import * as esbuild from "esbuild";
import { denoPlugins } from "esbuild-deno-loader";

async function build(): Promise<void> {
  await Deno.mkdir("playground/dist", { recursive: true });

  await esbuild.build({
    plugins: [...denoPlugins()],
    entryPoints: ["playground/sw.ts"],
    outfile: "playground/dist/sw.js",
    bundle: true,
    format: "esm",
    target: "es2022",
    minify: true,
  });

  await esbuild.build({
    plugins: [...denoPlugins()],
    entryPoints: ["playground/src/app.ts"],
    outfile: "playground/dist/app.js",
    bundle: true,
    format: "esm",
    target: "es2022",
    minify: true,
  });

  await Deno.copyFile("playground/src/theme/tokens.css", "playground/dist/tokens.css");
  await Deno.copyFile("playground/src/theme/components.css", "playground/dist/components.css");

  let html = await Deno.readTextFile("playground/index.html");
  html = html.replace("./src/app.ts", "./app.js");
  html = html.replace("./src/theme/tokens.css", "./tokens.css");
  html = html.replace("./src/theme/components.css", "./components.css");
  await Deno.writeTextFile("playground/dist/index.html", html);

  console.log("Playground built to playground/dist/");
  esbuild.stop();
}

build();
