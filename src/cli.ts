/**
 * Command-line interface for the Ten.net build tool.
 * Run with `deno run -A jsr:@leproj/tennet/cli build` to compile
 * an application into an encrypted standalone binary.
 *
 * @module
 */

import { parseArgs } from "@std/cli/parse-args";
import denoJson from "../deno.json" with { type: "json" };
import { build } from "./build/build.ts";

const VERSION = denoJson.version;

function printHelp() {
  console.log(`
Ten.net CLI v${VERSION}

Usage:
  tennet <command> [options]

Commands:
  build    Compile the application into an encrypted binary

Build Options:
  --secret <string>       Encryption secret (auto-generated if omitted)
  --output <string>       Output directory (default: ./dist)
  --app-path <string>     Application root directory (default: ./app)
  --public-path <string>  Public/static assets directory (default: ./public)
  --no-compile            Generate compiled TS only, skip binary compilation

Examples:
  deno run -A jsr:@leproj/tennet/cli build
  deno run -A jsr:@leproj/tennet/cli build --secret=mysecret --output=./out
  deno run -A jsr:@leproj/tennet/cli build --no-compile
`);
}

async function main() {
  const args = parseArgs(Deno.args, {
    string: ["secret", "output", "app-path", "public-path"],
    boolean: ["help", "version", "no-compile"],
    alias: { h: "help", v: "version" },
    default: {
      output: "./dist",
      "app-path": "./app",
      "public-path": "./public",
      "no-compile": false,
    },
  });

  if (args.version) {
    console.log(`tennet v${VERSION}`);
    return;
  }

  if (args.help || args._.length === 0) {
    printHelp();
    return;
  }

  const command = String(args._[0]);

  if (command === "build") {
    try {
      const result = await build({
        appPath: args["app-path"],
        publicPath: args["public-path"],
        output: args.output,
        secret: args.secret,
        compile: !args["no-compile"],
      });

      console.log(
        `\nStats: ${result.stats.routes} routes, ${result.stats.layouts} layouts, ${result.stats.assets} assets`,
      );
    } catch (e) {
      console.error(String(e));
      Deno.exit(1);
    }
  } else {
    console.error(`Unknown command: ${command}`);
    printHelp();
    Deno.exit(1);
  }
}

if (import.meta.main) {
  main();
}
