import { parseArgs } from "@std/cli/parse-args";
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

async function main() {
  const args = parseArgs(Deno.args, {
    string: ["secret", "output", "app-path", "public-path"],
    default: {
      output: "./dist",
      "app-path": "./app",
      "public-path": "./public",
    },
  });

  const appPath = args["app-path"];
  const publicPath = args["public-path"];
  const outputDir = args.output;
  let secret = args.secret;

  if (!secret) {
    secret = generateSecret();
    console.log("Generated build secret (save this!):", secret);
  }

  console.log("\n--- Ten.net Build ---");
  console.log(`App path: ${appPath}`);
  console.log(`Public path: ${publicPath}`);
  console.log(`Output: ${outputDir}\n`);

  console.log("Collecting manifest...");
  const manifest = await collectManifest(appPath, publicPath);

  const routeCount = manifest.routes.length;
  const assetCount = Object.keys(manifest.assets).length;
  const layoutCount = Object.values(manifest.layouts).reduce(
    (sum, l) => sum + l.length,
    0,
  );
  console.log(
    `Found: ${routeCount} routes, ${layoutCount} layouts, ${assetCount} assets`,
  );

  console.log("Compressing...");
  const jsonBytes = new TextEncoder().encode(JSON.stringify(manifest));
  const compressed = await compressData(jsonBytes);
  console.log(
    `Manifest: ${jsonBytes.length} bytes → ${compressed.length} bytes (compressed)`,
  );

  console.log("Encrypting...");
  const salt = generateSalt();
  const key = await deriveKey(secret, salt);
  const { iv, ciphertext } = await encrypt(compressed, key);
  const keyRaw = await exportKeyRaw(key);

  console.log("Generating compiled app...");
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
  console.log(`Written: ${compiledPath}`);

  console.log("\nCompiling binary...");
  const compileCmd = new Deno.Command("deno", {
    args: [
      "compile",
      "--allow-net",
      "--allow-env",
      "--unstable-bundle",
      `--output=${outputDir}/app`,
      compiledPath,
    ],
    stdout: "inherit",
    stderr: "inherit",
  });

  const compileResult = await compileCmd.output();

  if (compileResult.success) {
    console.log(`\nBuild complete! Binary: ${outputDir}/app`);
    try {
      const stat = await Deno.stat(`${outputDir}/app`);
      console.log(
        `Binary size: ${(stat.size / 1024 / 1024).toFixed(2)} MB`,
      );
    } catch {
      // Stat failed, skip size report
    }
  } else {
    console.error("\nBinary compilation failed.");
    Deno.exit(1);
  }
}

if (import.meta.main) {
  main();
}
