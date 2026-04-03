/**
 * Command-line interface for the Ten.net build tool.
 * Run with `deno run -A jsr:@leproj/tennet/cli build` to compile
 * an application into an encrypted standalone binary.
 *
 * @module
 */

import { parseArgs } from "@std/cli/parse-args";
import { build } from "./build/build.ts";
import { printBuildHelp, printCliHelp, printVersion } from "./cliShared.ts";
import { TerminalUi } from "./terminalUi.ts";

export async function main() {
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
    printVersion();
    return;
  }

  const command = args._.length > 0 ? String(args._[0]) : undefined;

  if (!command) {
    printCliHelp();
    return;
  }

  if (command === "build" && args.help) {
    printBuildHelp();
    return;
  }

  if (args.help) {
    printCliHelp();
    return;
  }

  if (command === "build") {
    try {
      await build({
        appPath: args["app-path"],
        publicPath: args["public-path"],
        output: args.output,
        secret: args.secret,
        compile: !args["no-compile"],
      });
    } catch {
      Deno.exit(1);
    }
  } else {
    const ui = new TerminalUi();
    ui.line(ui.danger(`Unknown command: ${command}`), "stderr");
    printCliHelp();
    Deno.exit(1);
  }
}

if (import.meta.main) {
  main();
}
