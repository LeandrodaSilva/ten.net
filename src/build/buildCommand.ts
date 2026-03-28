import { parseArgs } from "@std/cli/parse-args";
import { build } from "./build.ts";

async function main() {
  const args = parseArgs(Deno.args, {
    string: ["secret", "output", "app-path", "public-path"],
    boolean: ["no-compile"],
    default: {
      output: "./dist",
      "app-path": "./app",
      "public-path": "./public",
      "no-compile": false,
    },
  });

  try {
    await build({
      appPath: args["app-path"],
      publicPath: args["public-path"],
      output: args.output,
      secret: args.secret,
      compile: !args["no-compile"],
    });
  } catch (e) {
    console.error(String(e));
    Deno.exit(1);
  }
}

if (import.meta.main) {
  main();
}
