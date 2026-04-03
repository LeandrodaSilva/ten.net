import { build } from "@leproj/tennet/build";

const result = await build({
  appPath: "./example/sw/app",
  output: "./example/sw/dist",
  target: "browser",
  compile: false,
});

console.log(`\nSW build complete: ${result.swPath}`);
console.log(`Bundle size: ${result.swSize} bytes`);
console.log(`\nTo test: deno run --allow-all example/sw/serve.ts`);
