#!/usr/bin/env node

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import process from "node:process";

const denoConfig = JSON.parse(readFileSync(new URL("../deno.json", import.meta.url), "utf8"));
const imports = Object.values(denoConfig.imports ?? {});

const dependencies = Object.fromEntries(
  imports
    .filter((value) => typeof value === "string" && value.startsWith("npm:"))
    .map((value) => {
      const specifier = value.slice(4);
      const splitIndex = specifier.lastIndexOf("@");
      if (splitIndex <= 0) {
        throw new Error(`Unsupported npm specifier: ${value}`);
      }
      return [specifier.slice(0, splitIndex), specifier.slice(splitIndex + 1)];
    }),
);

if (Object.keys(dependencies).length === 0) {
  console.log("No npm dependencies found in deno.json imports.");
  process.exit(0);
}

const workspace = mkdtempSync(join(tmpdir(), "tennet-npm-audit-"));

try {
  writeFileSync(
    join(workspace, "package.json"),
    JSON.stringify(
      {
        name: "tennet-npm-audit",
        private: true,
        version: "0.0.0",
        dependencies,
      },
      null,
      2,
    ),
  );

  console.log(`Auditing ${Object.keys(dependencies).length} npm dependencies from deno.json...`);

  const install = spawnSync(
    "npm",
    ["install", "--package-lock-only", "--ignore-scripts", "--fund=false", "--audit=false"],
    { cwd: workspace, stdio: "inherit" },
  );
  if (install.status !== 0) {
    process.exit(install.status ?? 1);
  }

  const audit = spawnSync("npm", ["audit", "--omit=dev"], {
    cwd: workspace,
    stdio: "inherit",
  });

  process.exit(audit.status ?? 1);
} finally {
  rmSync(workspace, { recursive: true, force: true });
}
