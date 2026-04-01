import { VERSION } from "../version.ts";
import {
  detectTerminalColorSupport,
  formatBytes,
  formatDuration,
  formatPercent,
  TerminalUi,
  type TerminalWriter,
} from "../terminalUi.ts";

const SPINNER_FRAMES = ["-", "\\", "|", "/"];

function countLabel(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export interface BuildReporterOptions {
  verbose?: boolean;
  color?: boolean;
  interactive?: boolean;
  writer?: TerminalWriter;
}

export interface BuildReporterContext {
  appPath: string;
  publicPath: string;
  outputDir: string;
  mode: "binary" | "compiled TS only";
  totalSteps: number;
}

export interface BuildReporterSummary {
  appPath: string;
  publicPath: string;
  outputDir: string;
  compiledPath: string;
  binaryPath?: string;
  binarySize?: number;
  routes: number;
  pageRoutes: number;
  handlerOnlyRoutes: number;
  staticPages: number;
  dynamicRoutes: number;
  layouts: number;
  assets: number;
  manifestBytes: number;
  compressedBytes: number;
  durationMs: number;
  secretGenerated: boolean;
  secret: string;
  nextStep: string;
  mode: "binary" | "compiled TS only";
}

export interface BuildReporterFailure {
  stage: string;
  message: string;
  details?: string;
}

type StepStatus = "success" | "warning" | "failure";

interface ActiveStep {
  index: number;
  name: string;
  timer?: number;
  frameIndex: number;
}

export class BuildReporter {
  readonly verbose: boolean;
  readonly interactive: boolean;
  readonly ui: TerminalUi;

  #stepIndex = 0;
  #activeStep?: ActiveStep;
  #totalSteps = 0;

  constructor(options?: BuildReporterOptions) {
    this.verbose = options?.verbose ?? true;
    const color = options?.color ?? detectTerminalColorSupport();
    this.ui = new TerminalUi({ color, writer: options?.writer });
    this.interactive = options?.interactive ??
      (this.verbose && Deno.stdout.isTerminal() && Deno.stderr.isTerminal());
  }

  start(context: BuildReporterContext): void {
    if (!this.verbose) return;

    this.#totalSteps = context.totalSteps;

    this.ui.line(this.ui.strong(`Ten.net Build v${VERSION}`));
    this.ui.line(this.ui.muted("Clean build report"));
    this.ui.line();
    this.ui.line(this.ui.section("Context"));
    this.ui.line(this.ui.keyValue("Mode", context.mode));
    this.ui.line(this.ui.keyValue("App", context.appPath));
    this.ui.line(this.ui.keyValue("Public", context.publicPath));
    this.ui.line(this.ui.keyValue("Output", context.outputDir));
    this.ui.line();
  }

  startStep(name: string): number {
    if (!this.verbose) return ++this.#stepIndex;

    const index = ++this.#stepIndex;
    this.#activeStep = { index, name, frameIndex: 0 };

    if (this.interactive) {
      this.#renderSpinnerFrame();
      const timer = setInterval(() => this.#renderSpinnerFrame(), 80);
      this.#activeStep.timer = timer;
    }

    return index;
  }

  finishStep(status: StepStatus, detail?: string): void {
    if (!this.verbose) return;
    if (!this.#activeStep) return;

    const { index, name, timer } = this.#activeStep;
    if (timer) clearInterval(timer);

    const line = this.#formatStepLine(index, name, status, detail);
    if (this.interactive) {
      this.ui.write(`\r${" ".repeat(120)}\r`);
    }
    this.ui.line(line, status === "failure" ? "stderr" : "stdout");
    this.#activeStep = undefined;
  }

  warningBlock(title: string, lines: string[]): void {
    if (!this.verbose || lines.length === 0) return;

    this.ui.line(this.ui.warning(title));
    for (const line of lines) {
      this.ui.line(`  ${line}`);
    }
  }

  reportFailure(failure: BuildReporterFailure): void {
    if (!this.verbose) return;
    if (this.#activeStep) {
      this.finishStep("failure", failure.message);
    }

    this.ui.line();
    this.ui.line(this.ui.danger(this.ui.strong("Build failed")), "stderr");
    this.ui.line(this.ui.keyValue("Stage", failure.stage), "stderr");
    this.ui.line(this.ui.keyValue("Reason", failure.message), "stderr");
    if (failure.details?.trim()) {
      this.ui.line();
      this.ui.line(this.ui.section("Details"), "stderr");
      for (const line of failure.details.trimEnd().split("\n")) {
        this.ui.line(line, "stderr");
      }
    }
  }

  finish(summary: BuildReporterSummary): void {
    if (!this.verbose) return;

    const reduction = summary.manifestBytes === 0
      ? 0
      : (1 - (summary.compressedBytes / summary.manifestBytes)) * 100;

    this.ui.line();
    this.ui.line(this.ui.section("Artifacts"));
    this.ui.line(this.ui.keyValue("Compiled", summary.compiledPath));
    if (summary.binaryPath) {
      const binaryValue = summary.binarySize
        ? `${summary.binaryPath} (${formatBytes(summary.binarySize)})`
        : summary.binaryPath;
      this.ui.line(this.ui.keyValue("Binary", binaryValue));
    }
    this.ui.line();
    this.ui.line(this.ui.section("Summary"));
    this.ui.line(
      this.ui.keyValue(
        "Routes",
        `${summary.routes} total, ${
          countLabel(summary.pageRoutes, "page route")
        }`,
      ),
    );
    this.ui.line(
      this.ui.keyValue(
        "Pages",
        `${countLabel(summary.handlerOnlyRoutes, "handler-only route")}, ${
          countLabel(summary.staticPages, "static page")
        }`,
      ),
    );
    this.ui.line(
      this.ui.keyValue("Dynamic", countLabel(summary.dynamicRoutes, "route")),
    );
    this.ui.line(
      this.ui.keyValue("Layouts", countLabel(summary.layouts, "layout")),
    );
    this.ui.line(
      this.ui.keyValue("Assets", countLabel(summary.assets, "asset")),
    );
    this.ui.line(
      this.ui.keyValue(
        "Manifest",
        `${formatBytes(summary.manifestBytes)} -> ${
          formatBytes(summary.compressedBytes)
        } (${formatPercent(reduction)} smaller)`,
      ),
    );
    this.ui.line(
      this.ui.keyValue("Duration", formatDuration(summary.durationMs)),
    );
    this.ui.line();
    this.ui.line(this.ui.section("Secret"));
    if (summary.secretGenerated) {
      this.ui.line(
        this.ui.keyValue(
          "Status",
          this.ui.warning("Auto-generated; save this value before deploying."),
        ),
      );
      this.ui.line(this.ui.keyValue("Value", this.ui.strong(summary.secret)));
    } else {
      this.ui.line(this.ui.keyValue("Status", "Provided externally"));
    }
    this.ui.line();
    this.ui.line(this.ui.section("Next"));
    this.ui.line(summary.nextStep);
  }

  #renderSpinnerFrame(): void {
    if (!this.#activeStep) return;
    const frame =
      SPINNER_FRAMES[this.#activeStep.frameIndex % SPINNER_FRAMES.length];
    this.#activeStep.frameIndex += 1;
    const prefix = this.#stepPrefix(this.#activeStep.index);
    const text = `${prefix} ${this.ui.accent(frame)} ${this.#activeStep.name}`;
    this.ui.write(`\r${text}`);
  }

  #stepPrefix(index: number): string {
    return this.ui.muted(`[${index}/${this.#totalSteps}]`);
  }

  #formatStepLine(
    index: number,
    name: string,
    status: StepStatus,
    detail?: string,
  ): string {
    const statusLabel = status === "success"
      ? this.ui.success("OK  ")
      : status === "warning"
      ? this.ui.warning("WARN")
      : this.ui.danger("FAIL");

    const base = `${this.#stepPrefix(index)} ${statusLabel} ${name.padEnd(22)}`;
    return detail ? `${base} ${detail}` : base;
  }
}
