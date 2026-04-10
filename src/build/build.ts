/**
 * Build API for compiling a Ten.net application into an obfuscated,
 * standalone binary. Handles manifest collection, gzip compression,
 * AES-256-GCM packaging, and optional `deno compile`.
 *
 * @module
 */

import { encodeBase64 } from "@std/encoding";
import { BuildReporter } from "./buildReporter.ts";
import { collectManifest } from "./collector.ts";
import {
  compressData,
  deriveKey,
  encrypt,
  exportKeyRaw,
  generateSalt,
  generateSecret,
} from "./crypto.ts";
import {
  generateCompiledApp,
  generateServiceWorkerApp,
  generateServiceWorkerAppEncrypted,
} from "./codeGenerator.ts";
import type { AppManifest } from "./manifest.ts";
import { bundleRoutes } from "./bundleRoutes.ts";
import { formatBytes } from "../terminalUi.ts";

/** Configuration options for {@linkcode Ten.build}. */
export interface BuildOptions {
  /** Path to the app directory (default: "./app") */
  appPath?: string;
  /** Path to the public/static directory (default: "./public") */
  publicPath?: string;
  /** Output directory for compiled artifacts (default: "./dist") */
  output?: string;
  /** Obfuscation secret. If omitted, one is auto-generated. */
  secret?: string;
  /** Whether to compile to binary after generating TS (default: true) */
  compile?: boolean;
  /** Whether to bundle routes to outputDir with auto-discovery (default: false) */
  bundle?: boolean;
  /** Whether to minify bundled output (default: false) */
  minify?: boolean;
  /** Whether to print progress to stdout (default: true) */
  verbose?: boolean;
  /** Build target: "deno" (default) or "browser" (Service Worker) */
  target?: "deno" | "browser";
  /** Seed data to embed in the manifest for browser storage pre-population. */
  seed?: Record<string, Array<{ id: string; [key: string]: unknown }>>;
  /** Sync configuration for the generated Service Worker. */
  sync?: {
    serverUrl: string;
    endpoint: string;
    storeName: string;
    interval?: number;
    headers?: Record<string, string>;
  };
}

/** Result returned by {@linkcode Ten.build} after compilation. */
export interface BuildResult {
  /** The secret used (may have been auto-generated) */
  secret: string;
  /** Path to the generated compiled TypeScript file */
  compiledPath: string;
  /** Path to the binary (undefined if compile=false) */
  binaryPath?: string;
  /** Binary file size in bytes (undefined if compile=false) */
  binarySize?: number;
  /** Path to bundled SW file (only for target=browser) */
  swPath?: string;
  /** SW bundle size in bytes */
  swSize?: number;
  /** Manifest statistics */
  stats: {
    routes: number;
    layouts: number;
    assets: number;
    manifestBytes: number;
    compressedBytes: number;
  };
}

class BuildStageError extends Error {
  stage: string;
  details?: string;

  constructor(stage: string, message: string, details?: string) {
    super(message);
    this.name = "BuildStageError";
    this.stage = stage;
    this.details = details;
  }
}

function getTotalSteps(shouldBundle: boolean, shouldCompile: boolean): number {
  return 5 + (shouldBundle ? 1 : 0) + (shouldCompile ? 1 : 0);
}

function getBuildMode(
  shouldCompile: boolean,
): "binary" | "compiled TS only" {
  return shouldCompile ? "binary" : "compiled TS only";
}

function summarizeManifest(
  manifest: AppManifest,
  manifestBytes: number,
  compressedBytes: number,
) {
  const routes = manifest.routes.length;
  const pageRoutes = manifest.routes.filter((route) => route.hasPage).length;
  const handlerOnlyRoutes =
    manifest.routes.filter((route) =>
      !route.hasPage && route.transpiledCode.trim().length > 0
    ).length;
  const staticPages =
    manifest.routes.filter((route) =>
      route.hasPage && route.transpiledCode.trim().length === 0
    ).length;
  const dynamicRoutes =
    manifest.routes.filter((route) => /\[[^/]+\]/.test(route.path)).length;
  const layouts = Object.values(manifest.layouts).reduce(
    (sum, layoutEntries) => sum + layoutEntries.length,
    0,
  );
  const assets = Object.keys(manifest.assets).length;

  return {
    routes,
    pageRoutes,
    handlerOnlyRoutes,
    staticPages,
    dynamicRoutes,
    layouts,
    assets,
    manifestBytes,
    compressedBytes,
  };
}

function normalizeBuildError(stage: string, error: unknown): BuildStageError {
  if (error instanceof BuildStageError) return error;
  if (error instanceof Error) {
    return new BuildStageError(stage, error.message);
  }
  return new BuildStageError(stage, String(error));
}

function decodeCommandOutput(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes).trim();
}

function buildCommandDetails(
  stdout: Uint8Array,
  stderr: Uint8Array,
): string | undefined {
  const stdoutText = decodeCommandOutput(stdout);
  const stderrText = decodeCommandOutput(stderr);
  const sections: string[] = [];

  if (stderrText) {
    sections.push(stderrText);
  }
  if (stdoutText) {
    sections.push(`stdout:\n${stdoutText}`);
  }

  return sections.length > 0 ? sections.join("\n\n") : undefined;
}

function buildNextStepMessage(
  shouldCompile: boolean,
  compiledPath: string,
  binaryPath?: string,
): string {
  if (shouldCompile && binaryPath) {
    return `Run \`${binaryPath}\` to start the compiled app.`;
  }

  return `Run the generated file with Deno from \`${compiledPath}\`, or rerun without \`--no-compile\` to produce a binary.`;
}

async function runBuildStep<T>(
  reporter: BuildReporter,
  name: string,
  action: () => Promise<T> | T,
  onSuccess?: (result: T) => string | undefined,
): Promise<T> {
  reporter.startStep(name);

  try {
    const result = await action();
    reporter.finishStep("success", onSuccess?.(result));
    return result;
  } catch (error) {
    const buildError = normalizeBuildError(name, error);
    reporter.finishStep("failure", buildError.message);
    throw buildError;
  }
}

/** Compile a Ten.net application into an obfuscated standalone binary. */
export async function build(options?: BuildOptions): Promise<BuildResult> {
  const appPath = options?.appPath ?? "./app";
  const publicPath = options?.publicPath ?? "./public";
  const outputDir = options?.output ?? "./dist";
  const shouldCompile = options?.compile ?? true;
  const shouldBundle = options?.bundle ?? false;
  const minify = options?.minify ?? false;
  const verbose = options?.verbose ?? true;
  const target = options?.target ?? "deno";
  const reporter = new BuildReporter({ verbose });
  const startedAt = performance.now();
  let secret = options?.secret;
  const secretGenerated = !secret;

  if (!secret) {
    secret = generateSecret();
  }

  reporter.start({
    appPath,
    publicPath,
    outputDir,
    mode: getBuildMode(shouldCompile),
    totalSteps: getTotalSteps(shouldBundle, shouldCompile),
  });

  try {
    if (shouldBundle) {
      reporter.startStep("Bundle routes");
      try {
        const bundleResult = await bundleRoutes({
          appPath,
          outputDir,
          minify,
        });

        if (bundleResult.success) {
          reporter.finishStep(
            "success",
            `Bundled ${bundleResult.outputFiles} file(s) to ${outputDir}`,
          );
        } else {
          reporter.finishStep(
            "warning",
            `${bundleResult.errors.length} warning(s) while bundling routes`,
          );
          reporter.warningBlock("Bundle messages", bundleResult.errors);
        }
      } catch (error) {
        const buildError = normalizeBuildError("Bundle routes", error);
        reporter.finishStep("failure", buildError.message);
        throw buildError;
      }
    }

    const manifest = await runBuildStep(
      reporter,
      "Collect manifest",
      () => collectManifest(appPath, publicPath),
      (result) => {
        const pageRoutes = result.routes.filter((route) =>
          route.hasPage
        ).length;
        const assets = Object.keys(result.assets).length;
        const layouts = Object.values(result.layouts).reduce(
          (sum, layoutEntries) => sum + layoutEntries.length,
          0,
        );

        return `${result.routes.length} routes, ${pageRoutes} page routes, ${layouts} layouts, ${assets} assets`;
      },
    );

    if (options?.seed) {
      manifest._seed = options.seed;
    }

    const jsonBytes = await runBuildStep(
      reporter,
      "Compress manifest",
      async () => {
        const manifestBytes = new TextEncoder().encode(
          JSON.stringify(manifest),
        );
        const compressed = await compressData(manifestBytes);
        return { manifestBytes, compressed };
      },
      ({ manifestBytes, compressed }) => {
        const reduction = manifestBytes.length === 0
          ? 0
          : (1 - (compressed.length / manifestBytes.length)) * 100;

        return `${formatBytes(manifestBytes.length)} -> ${
          formatBytes(compressed.length)
        } (${reduction.toFixed(1)}% smaller)`;
      },
    );

    const encryptedPayload = await runBuildStep(
      reporter,
      "Obfuscate manifest",
      async () => {
        const salt = generateSalt();
        const key = await deriveKey(secret, salt);
        const { iv, ciphertext } = await encrypt(jsonBytes.compressed, key);
        const keyRaw = await exportKeyRaw(key);
        return { iv, ciphertext, keyRaw };
      },
      () => "Obfuscated manifest payload ready",
    );

    const manifestSummary = summarizeManifest(
      manifest,
      jsonBytes.manifestBytes.length,
      jsonBytes.compressed.length,
    );

    if (target === "browser") {
      // --- Browser (Service Worker) pipeline ---
      if (options?.secret) {
        reporter.warningBlock("Browser target with --secret", [
          "The AES key is embedded in the SW bundle — this is obfuscation, not real protection.",
          "Assets and manifest data in the bundle are publicly accessible.",
        ]);
      }

      const manifestJson = JSON.stringify(manifest);
      const swGenOptions = options?.sync ? { sync: options.sync } : undefined;
      const swCode = await runBuildStep(
        reporter,
        "Generate SW app",
        () => {
          if (options?.secret) {
            return generateServiceWorkerAppEncrypted(
              encodeBase64(encryptedPayload.ciphertext),
              encodeBase64(encryptedPayload.iv),
              encodeBase64(encryptedPayload.keyRaw),
              swGenOptions,
            );
          }
          return generateServiceWorkerApp(manifestJson, swGenOptions);
        },
        () => "Service Worker bootstrap created",
      );

      const swTsPath = `${outputDir}/_sw_app.ts`;
      await runBuildStep(
        reporter,
        "Write artifact",
        async () => {
          await Deno.mkdir(outputDir, { recursive: true });
          await Deno.writeTextFile(swTsPath, swCode);
          return swTsPath;
        },
        (path) => path,
      );

      const swBundlePath = `${outputDir}/sw.js`;
      const bundleOutcome = await runBuildStep(
        reporter,
        "Bundle SW",
        async () => {
          const esbuild = await import("esbuild");
          const { denoPlugins } = await import("esbuild-deno-loader");

          await esbuild.build({
            // deno-lint-ignore no-explicit-any
            plugins: [...denoPlugins()] as any,
            entryPoints: [swTsPath],
            outfile: swBundlePath,
            bundle: true,
            format: "esm",
            target: "es2022",
            minify: minify,
          });
          esbuild.stop();

          let swSize: number | undefined;
          try {
            const stat = await Deno.stat(swBundlePath);
            swSize = stat.size;
          } catch {
            // Best-effort size measurement
          }

          return { swPath: swBundlePath, swSize };
        },
        ({ swPath, swSize }) =>
          swSize ? `${swPath} (${formatBytes(swSize!)})` : swPath,
      );

      // Write register.html
      const registerHtml = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Ten.net SW</title></head>
<body>
<script>
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js", { type: "module", scope: "/" })
    .then(r => console.log("[Ten.net] SW registered:", r.scope))
    .catch(e => console.error("[Ten.net] SW registration failed:", e));
}
</script>
</body>
</html>`;
      await Deno.writeTextFile(`${outputDir}/register.html`, registerHtml);

      const result: BuildResult = {
        secret,
        compiledPath: swTsPath,
        swPath: bundleOutcome.swPath,
        swSize: bundleOutcome.swSize,
        stats: {
          routes: manifestSummary.routes,
          layouts: manifestSummary.layouts,
          assets: manifestSummary.assets,
          manifestBytes: manifestSummary.manifestBytes,
          compressedBytes: manifestSummary.compressedBytes,
        },
      };

      reporter.finish({
        appPath,
        publicPath,
        outputDir,
        compiledPath: result.compiledPath,
        binaryPath: result.swPath,
        binarySize: result.swSize,
        routes: manifestSummary.routes,
        pageRoutes: manifestSummary.pageRoutes,
        handlerOnlyRoutes: manifestSummary.handlerOnlyRoutes,
        staticPages: manifestSummary.staticPages,
        dynamicRoutes: manifestSummary.dynamicRoutes,
        layouts: manifestSummary.layouts,
        assets: manifestSummary.assets,
        manifestBytes: manifestSummary.manifestBytes,
        compressedBytes: manifestSummary.compressedBytes,
        durationMs: performance.now() - startedAt,
        secretGenerated,
        secret,
        nextStep:
          `Serve ${outputDir}/ with an HTTP server and open register.html to install the Service Worker.`,
        mode: "browser (Service Worker)",
      });

      return result;
    }

    // --- Deno (default) pipeline ---
    const compiledCode = await runBuildStep(
      reporter,
      "Generate compiled app",
      () =>
        generateCompiledApp(
          encodeBase64(encryptedPayload.ciphertext),
          encodeBase64(encryptedPayload.iv),
          encodeBase64(encryptedPayload.keyRaw),
        ),
      () => "Embedded bootstrap created",
    );

    const compiledPath = `${outputDir}/_compiled_app.ts`;
    await runBuildStep(
      reporter,
      "Write artifact",
      async () => {
        await Deno.mkdir(outputDir, { recursive: true });
        await Deno.writeTextFile(compiledPath, compiledCode);
        return compiledPath;
      },
      (path) => path,
    );

    const result: BuildResult = {
      secret,
      compiledPath,
      stats: {
        routes: manifestSummary.routes,
        layouts: manifestSummary.layouts,
        assets: manifestSummary.assets,
        manifestBytes: manifestSummary.manifestBytes,
        compressedBytes: manifestSummary.compressedBytes,
      },
    };

    if (shouldCompile) {
      const compileOutcome = await runBuildStep(
        reporter,
        "Compile binary",
        async () => {
          const compileArgs = [
            "compile",
            "--allow-net",
            "--allow-env",
          ];

          if (import.meta.url.startsWith("file://")) {
            const denoJsonPath = new URL("../../deno.json", import.meta.url)
              .pathname;
            compileArgs.push(`--config=${denoJsonPath}`);
          }

          const binaryPath = `${outputDir}/app`;
          compileArgs.push(`--output=${binaryPath}`, compiledPath);

          const compileResult = await new Deno.Command("deno", {
            args: compileArgs,
            stdout: "piped",
            stderr: "piped",
          }).output();

          if (!compileResult.success) {
            throw new BuildStageError(
              "Compile binary",
              "Binary compilation failed.",
              buildCommandDetails(compileResult.stdout, compileResult.stderr),
            );
          }

          let binarySize: number | undefined;
          try {
            const stat = await Deno.stat(binaryPath);
            binarySize = stat.size;
          } catch {
            // File stats are best-effort here; the summary still has the path.
          }

          return { binaryPath, binarySize };
        },
        ({ binaryPath, binarySize }) =>
          binarySize
            ? `${binaryPath} (${formatBytes(binarySize)})`
            : binaryPath,
      );

      result.binaryPath = compileOutcome.binaryPath;
      result.binarySize = compileOutcome.binarySize;
    }

    reporter.finish({
      appPath,
      publicPath,
      outputDir,
      compiledPath: result.compiledPath,
      binaryPath: result.binaryPath,
      binarySize: result.binarySize,
      routes: manifestSummary.routes,
      pageRoutes: manifestSummary.pageRoutes,
      handlerOnlyRoutes: manifestSummary.handlerOnlyRoutes,
      staticPages: manifestSummary.staticPages,
      dynamicRoutes: manifestSummary.dynamicRoutes,
      layouts: manifestSummary.layouts,
      assets: manifestSummary.assets,
      manifestBytes: manifestSummary.manifestBytes,
      compressedBytes: manifestSummary.compressedBytes,
      durationMs: performance.now() - startedAt,
      secretGenerated,
      secret,
      nextStep: buildNextStepMessage(
        shouldCompile,
        compiledPath,
        result.binaryPath,
      ),
      mode: getBuildMode(shouldCompile),
    });

    return result;
  } catch (error) {
    const failure = normalizeBuildError("Build", error);
    reporter.reportFailure({
      stage: failure.stage,
      message: failure.message,
      details: failure.details,
    });
    throw failure;
  }
}
