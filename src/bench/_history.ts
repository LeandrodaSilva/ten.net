/**
 * Reads Deno bench JSON output from stdin, appends to benchmarks/history.json,
 * and updates the Performance section in README.md.
 *
 * Usage: deno bench --json src/bench/ | deno run --allow-all src/bench/_history.ts
 */

const HISTORY_PATH = "./benchmarks/history.json";
const README_PATH = "./README.md";
const MAX_HISTORY = 50;
const BENCH_START = "<!-- BENCH:START -->";
const BENCH_END = "<!-- BENCH:END -->";

interface BenchResult {
  avg: number;
  min: number;
  max: number;
  p75: number;
  p99: number;
  n: number;
}

interface HistoryEntry {
  date: string;
  commit: string;
  denoVersion: string;
  os: string;
  results: Record<string, BenchResult>;
}

// Deno bench --json outputs a single JSON object with { version, runtime, cpu, benches[] }
async function readStdin(): Promise<string> {
  const buf: Uint8Array[] = [];
  for await (const chunk of Deno.stdin.readable) {
    buf.push(chunk);
  }
  const decoder = new TextDecoder();
  return buf.map((b) => decoder.decode(b)).join("");
}

interface DenoBenchEntry {
  name: string;
  results: Array<{
    ok?: {
      n: number;
      min: number;
      max: number;
      avg: number;
      p75: number;
      p99: number;
    };
  }>;
}

interface DenoBenchOutput {
  version: number;
  runtime: string;
  cpu: string;
  benches: DenoBenchEntry[];
}

function parseBenchOutput(raw: string): Record<string, BenchResult> {
  const results: Record<string, BenchResult> = {};

  let data: DenoBenchOutput;
  try {
    data = JSON.parse(raw);
  } catch {
    return results;
  }

  if (!data.benches) return results;

  for (const bench of data.benches) {
    const ok = bench.results?.[0]?.ok;
    if (!ok || !bench.name) continue;

    // Deno bench outputs times in nanoseconds, convert to milliseconds
    results[bench.name] = {
      avg: ok.avg / 1e6,
      min: ok.min / 1e6,
      max: ok.max / 1e6,
      p75: ok.p75 / 1e6,
      p99: ok.p99 / 1e6,
      n: ok.n,
    };
  }
  return results;
}

async function getCommitHash(): Promise<string> {
  try {
    const cmd = new Deno.Command("git", {
      args: ["rev-parse", "--short", "HEAD"],
      stdout: "piped",
      stderr: "null",
    });
    const out = await cmd.output();
    return new TextDecoder().decode(out.stdout).trim();
  } catch {
    return "unknown";
  }
}

function formatMs(ms: number): string {
  if (ms < 0.001) return `${(ms * 1e6).toFixed(0)}ns`;
  if (ms < 1) return `${(ms * 1000).toFixed(1)}us`;
  return `${ms.toFixed(2)}ms`;
}

function buildReadmeTable(results: Record<string, BenchResult>): string {
  const header = "| Benchmark | Avg | Min | Max | p75 | p99 | Iterations |";
  const sep = "|-----------|-----|-----|-----|-----|-----|------------|";
  const rows = Object.entries(results)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, r]) =>
      `| ${name} | ${formatMs(r.avg)} | ${formatMs(r.min)} | ${
        formatMs(r.max)
      } | ${formatMs(r.p75)} | ${formatMs(r.p99)} | ${r.n} |`
    );

  return [header, sep, ...rows].join("\n");
}

function updateReadme(table: string): void {
  let readme: string;
  try {
    readme = Deno.readTextFileSync(README_PATH);
  } catch {
    console.error("README.md not found, skipping update.");
    return;
  }

  const startIdx = readme.indexOf(BENCH_START);
  const endIdx = readme.indexOf(BENCH_END);

  if (startIdx === -1 || endIdx === -1) {
    console.error(
      "README.md missing BENCH markers, skipping update.",
    );
    return;
  }

  const before = readme.substring(0, startIdx + BENCH_START.length);
  const after = readme.substring(endIdx);
  const updated = `${before}\n${table}\n${after}`;

  Deno.writeTextFileSync(README_PATH, updated);
  console.log("README.md performance table updated.");
}

async function main(): Promise<void> {
  const raw = await readStdin();
  const results = parseBenchOutput(raw);

  if (Object.keys(results).length === 0) {
    console.error("No benchmark results found in input.");
    Deno.exit(1);
  }

  console.log(`Parsed ${Object.keys(results).length} benchmark results.`);

  // Build history entry
  const entry: HistoryEntry = {
    date: new Date().toISOString(),
    commit: await getCommitHash(),
    denoVersion: Deno.version.deno,
    os: Deno.build.os,
    results,
  };

  // Load existing history
  let history: HistoryEntry[] = [];
  try {
    const data = Deno.readTextFileSync(HISTORY_PATH);
    history = JSON.parse(data);
  } catch {
    // Start fresh
  }

  // Append and trim to max
  history.push(entry);
  if (history.length > MAX_HISTORY) {
    history = history.slice(history.length - MAX_HISTORY);
  }

  Deno.writeTextFileSync(HISTORY_PATH, JSON.stringify(history, null, 2) + "\n");
  console.log(
    `History updated: ${history.length} entries in ${HISTORY_PATH}`,
  );

  // Update README table
  const table = buildReadmeTable(results);
  updateReadme(table);

  // Print summary
  console.log("\n=== Benchmark Results ===\n");
  for (
    const [name, r] of Object.entries(results).sort(([a], [b]) =>
      a.localeCompare(b)
    )
  ) {
    console.log(
      `  ${name.padEnd(30)} avg=${formatMs(r.avg).padEnd(10)} p99=${
        formatMs(r.p99)
      }`,
    );
  }
}

main();
