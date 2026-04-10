import { VERSION } from "./version.ts";
import { formatTable, TerminalUi } from "./terminalUi.ts";

function buildHeader(ui: TerminalUi, title: string): string[] {
  return [ui.strong(`${title} v${VERSION}`), ui.muted("Clean terminal output")];
}

export function printVersion(): void {
  const ui = new TerminalUi();
  ui.line(`tennet v${VERSION}`);
}

export function printCliHelp(): void {
  const ui = new TerminalUi();
  const lines = [
    ...buildHeader(ui, "Ten.net CLI"),
    "",
    ui.section("Usage"),
    "  tennet <command> [options]",
    "",
    ui.section("Commands"),
    ...formatTable(ui, [
      ["build", "Compile the application into an obfuscated binary"],
    ]),
    "",
    ui.section("Examples"),
    "  deno run -A jsr:@leproj/tennet/cli build",
    "  deno run -A jsr:@leproj/tennet/cli build --secret=mysecret --output=./out",
    "  deno run -A jsr:@leproj/tennet/cli build --no-compile",
  ];

  ui.line(lines.join("\n"));
}

export function printBuildHelp(): void {
  const ui = new TerminalUi();
  const lines = [
    ...buildHeader(ui, "Ten.net Build"),
    "",
    ui.section("Usage"),
    "  deno task build [options]",
    "  tennet build [options]",
    "",
    ui.section("Options"),
    ...formatTable(ui, [
      ["--secret <string>", "Obfuscation secret (auto-generated if omitted)"],
      ["--output <string>", "Output directory (default: ./dist)"],
      ["--app-path <string>", "Application root directory (default: ./app)"],
      [
        "--public-path <string>",
        "Public/static assets directory (default: ./public)",
      ],
      ["--no-compile", "Generate compiled TS only, skip binary compilation"],
      ["--help, -h", "Show build help"],
      ["--version, -v", "Show CLI version"],
    ]),
    "",
    ui.section("Notes"),
    "  Colors and spinners are enabled only in interactive terminals.",
    "  Generated secrets are shown once in the final summary.",
  ];

  ui.line(lines.join("\n"));
}
