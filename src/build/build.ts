/**
 * Build API for compiling a Ten.net application into an encrypted,
 * standalone binary. Handles manifest collection, gzip compression,
 * AES-256-GCM encryption, and optional `deno compile`.
 *
 * @module
 */

import { encodeBase64 } from "@std/encoding";
import { collectManifest } from "./collector.ts";
import {
  compressData,
  deriveKey,
  encrypt,
  exportKeyRaw,
  generateSalt,
  generateSecret,
} from "./crypto.ts";
import { generateCompiledApp } from "./codeGenerator.ts";
import { bundleRoutes } from "./bundleRoutes.ts";

/** Configuration options for {@linkcode Ten.build}. */
export interface BuildOptions {
  /** Path to the app directory (default: "./app") */
  appPath?: string;
  /** Path to the public/static directory (default: "./public") */
  publicPath?: string;
  /** Output directory for compiled artifacts (default: "./dist") */
  output?: string;
  /** Encryption secret. If omitted, one is auto-generated. */
  secret?: string;
  /** Whether to compile to binary after generating TS (default: true) */
  compile?: boolean;
  /** Whether to bundle routes to outputDir with auto-discovery (default: false) */
  bundle?: boolean;
  /** Whether to minify bundled output (default: false) */
  minify?: boolean;
  /** Whether to print progress to stdout (default: true) */
  verbose?: boolean;
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
  /** Manifest statistics */
  stats: {
    routes: number;
    layouts: number;
    assets: number;
    manifestBytes: number;
    compressedBytes: number;
  };
}

function log(verbose: boolean, ...args: unknown[]) {
  if (verbose) console.log(...args);
}

/** Compile a Ten.net application into an encrypted standalone binary. */
export async function build(options?: BuildOptions): Promise<BuildResult> {
  const appPath = options?.appPath ?? "./app";
  const publicPath = options?.publicPath ?? "./public";
  const outputDir = options?.output ?? "./dist";
  const shouldCompile = options?.compile ?? true;
  const shouldBundle = options?.bundle ?? false;
  const minify = options?.minify ?? false;
  const verbose = options?.verbose ?? true;
  let secret = options?.secret;

  if (!secret) {
    secret = generateSecret();
    log(verbose, "Generated build secret (save this!):", secret);
  }

  log(verbose, "\n--- Ten.net Build ---");
  log(verbose, `App path: ${appPath}`);
  log(verbose, `Public path: ${publicPath}`);
  log(verbose, `Output: ${outputDir}\n`);

  if (shouldBundle) {
    log(verbose, "Bundling routes...");
    const bundleResult = await bundleRoutes({
      appPath,
      outputDir,
      minify,
    });
    if (bundleResult.success) {
      log(
        verbose,
        `Bundled ${
          bundleResult.outputFiles?.length ?? 0
        } file(s) to ${outputDir}`,
      );
    } else {
      log(verbose, "Bundle warnings/errors:", bundleResult.errors);
    }
  }

  log(verbose, "Collecting manifest...");
  const manifest = await collectManifest(appPath, publicPath);

  const routeCount = manifest.routes.length;
  const assetCount = Object.keys(manifest.assets).length;
  const layoutCount = Object.values(manifest.layouts).reduce(
    (sum, l) => sum + l.length,
    0,
  );
  log(
    verbose,
    `Found: ${routeCount} routes, ${layoutCount} layouts, ${assetCount} assets`,
  );

  log(verbose, "Compressing...");
  const jsonBytes = new TextEncoder().encode(JSON.stringify(manifest));
  const compressed = await compressData(jsonBytes);
  log(
    verbose,
    `Manifest: ${jsonBytes.length} bytes → ${compressed.length} bytes (compressed)`,
  );

  log(verbose, "Encrypting...");
  const salt = generateSalt();
  const key = await deriveKey(secret, salt);
  const { iv, ciphertext } = await encrypt(compressed, key);
  const keyRaw = await exportKeyRaw(key);

  log(verbose, "Generating compiled app...");
  const compiledCode = generateCompiledApp(
    encodeBase64(ciphertext),
    encodeBase64(iv),
    encodeBase64(keyRaw),
  );

  try {
    await Deno.mkdir(outputDir, { recursive: true });
  } catch {
    // Directory already exists
  }

  const compiledPath = `${outputDir}/_compiled_app.ts`;
  await Deno.writeTextFile(compiledPath, compiledCode);
  log(verbose, `Written: ${compiledPath}`);

  const result: BuildResult = {
    secret,
    compiledPath,
    stats: {
      routes: routeCount,
      layouts: layoutCount,
      assets: assetCount,
      manifestBytes: jsonBytes.length,
      compressedBytes: compressed.length,
    },
  };

  if (shouldCompile) {
    log(verbose, "\nCompiling binary...");

    // Resolve deno.json config path for import map resolution.
    // When the compiled TS is in a temp/output dir, deno compile needs
    // an explicit --config to resolve @leproj/tennet imports.
    const denoJsonPath = new URL("../../deno.json", import.meta.url).pathname;

    const compileCmd = new Deno.Command("deno", {
      args: [
        "compile",
        "--allow-net",
        "--allow-env",
        "--unstable-bundle",
        `--config=${denoJsonPath}`,
        `--output=${outputDir}/app`,
        compiledPath,
      ],
      stdout: verbose ? "inherit" : "null",
      stderr: "inherit",
    });

    const compileResult = await compileCmd.output();

    if (compileResult.success) {
      result.binaryPath = `${outputDir}/app`;
      try {
        const stat = await Deno.stat(`${outputDir}/app`);
        result.binarySize = stat.size;
        log(
          verbose,
          `\nBuild complete! Binary: ${outputDir}/app`,
        );
        log(
          verbose,
          `Binary size: ${(stat.size / 1024 / 1024).toFixed(2)} MB`,
        );
      } catch {
        log(verbose, `\nBuild complete! Binary: ${outputDir}/app`);
      }
    } else {
      throw new Error("Binary compilation failed.");
    }
  } else {
    log(verbose, `\nBuild complete! Compiled TS: ${compiledPath}`);
  }

  return result;
}
