import { parseArgs } from "@std/cli/parse-args";
import { printBuildHelp, printVersion } from "../cliShared.ts";
import { build } from "./build.ts";

export async function main() {
  const args = parseArgs(Deno.args, {
    string: ["secret", "output", "app-path", "public-path", "target"],
    boolean: ["help", "version", "no-compile"],
    alias: { h: "help", v: "version" },
    default: {
      output: "./dist",
      "app-path": "./app",
      "public-path": "./public",
      "no-compile": false,
      target: "deno",
    },
  });

  if (args.version) {
    printVersion();
    return;
  }

  if (args.help) {
    printBuildHelp();
    return;
  }

  try {
    await build({
      appPath: args["app-path"],
      publicPath: args["public-path"],
      output: args.output,
      secret: args.secret,
      compile: !args["no-compile"],
      target: args.target as "deno" | "browser",
    });
  } catch {
    Deno.exit(1);
  }
}

if (import.meta.main) {
  main();
}
