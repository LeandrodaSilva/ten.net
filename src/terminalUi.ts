type TerminalTarget = "stdout" | "stderr";
const ANSI_PATTERN = new RegExp(String.raw`\u001b\[[0-9;]*m`, "g");

export interface TerminalWriter {
  write(text: string, target?: TerminalTarget): void;
}

export interface TerminalUiOptions {
  color?: boolean;
  writer?: TerminalWriter;
}

class StreamTerminalWriter implements TerminalWriter {
  #encoder = new TextEncoder();

  write(text: string, target: TerminalTarget = "stdout"): void {
    const stream = target === "stderr" ? Deno.stderr : Deno.stdout;
    stream.writeSync(this.#encoder.encode(text));
  }
}

export function defaultWriter(): TerminalWriter {
  return new StreamTerminalWriter();
}

export function detectTerminalColorSupport(): boolean {
  return !Deno.noColor && Deno.stdout.isTerminal();
}

function wrapAnsi(enabled: boolean, code: string, text: string): string {
  if (!enabled) return text;
  return `\x1b[${code}m${text}\x1b[0m`;
}

export class TerminalUi {
  readonly color: boolean;
  readonly writer: TerminalWriter;

  constructor(options?: TerminalUiOptions) {
    this.color = options?.color ?? detectTerminalColorSupport();
    this.writer = options?.writer ?? defaultWriter();
  }

  write(text: string, target: TerminalTarget = "stdout"): void {
    this.writer.write(text, target);
  }

  line(text = "", target: TerminalTarget = "stdout"): void {
    this.write(`${text}\n`, target);
  }

  strong(text: string): string {
    return wrapAnsi(this.color, "1", text);
  }

  accent(text: string): string {
    return wrapAnsi(this.color, "36", text);
  }

  success(text: string): string {
    return wrapAnsi(this.color, "32", text);
  }

  warning(text: string): string {
    return wrapAnsi(this.color, "33", text);
  }

  danger(text: string): string {
    return wrapAnsi(this.color, "31", text);
  }

  muted(text: string): string {
    return wrapAnsi(this.color, "90", text);
  }

  section(title: string): string {
    return this.strong(title);
  }

  keyValue(label: string, value: string, labelWidth = 10): string {
    return `${this.muted(label.padEnd(labelWidth))} ${value}`;
  }
}

export function formatTable(
  ui: TerminalUi,
  rows: Array<[label: string, value: string]>,
  labelIndent = "  ",
): string[] {
  const width = rows.reduce((max, [label]) => Math.max(max, label.length), 0);
  return rows.map(([label, value]) =>
    `${labelIndent}${ui.accent(label.padEnd(width))}  ${value}`
  );
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export function formatDuration(durationMs: number): string {
  if (durationMs < 1000) return `${Math.round(durationMs)} ms`;
  return `${(durationMs / 1000).toFixed(2)} s`;
}

export function formatPercent(reduction: number): string {
  return `${reduction.toFixed(1)}%`;
}

export function stripAnsi(text: string): string {
  return text.replace(ANSI_PATTERN, "");
}
