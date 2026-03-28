/**
 * Checks benchmark results against thresholds and historical averages.
 * Exits with code 1 if any regression is detected.
 *
 * Usage: deno run --allow-all src/bench/_check_thresholds.ts
 */

import { REGRESSION_MULTIPLIER, THRESHOLDS } from "./_thresholds.ts";

const HISTORY_PATH = "./benchmarks/history.json";

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

function formatMs(ms: number): string {
  if (ms < 0.001) return `${(ms * 1e6).toFixed(0)}ns`;
  if (ms < 1) return `${(ms * 1000).toFixed(1)}us`;
  return `${ms.toFixed(2)}ms`;
}

function main(): void {
  let history: HistoryEntry[] = [];
  try {
    const data = Deno.readTextFileSync(HISTORY_PATH);
    history = JSON.parse(data);
  } catch {
    console.log("No history found, skipping regression check.");
    return;
  }

  if (history.length === 0) {
    console.log("Empty history, skipping regression check.");
    return;
  }

  const latest = history[history.length - 1];
  const failures: string[] = [];

  console.log("=== Threshold Check ===\n");

  // Check against absolute thresholds
  for (const [name, result] of Object.entries(latest.results)) {
    const threshold = THRESHOLDS[name];
    if (threshold !== undefined && result.avg > threshold) {
      const msg = `FAIL: ${name} avg=${
        formatMs(result.avg)
      } exceeds threshold=${formatMs(threshold)}`;
      failures.push(msg);
      console.log(
        `  [FAIL] ${name}: ${formatMs(result.avg)} > ${formatMs(threshold)}`,
      );
    } else if (threshold !== undefined) {
      console.log(
        `  [PASS] ${name}: ${formatMs(result.avg)} <= ${formatMs(threshold)}`,
      );
    } else {
      console.log(`  [SKIP] ${name}: no threshold defined`);
    }
  }

  // Check against historical regression (if we have at least 2 entries)
  if (history.length >= 2) {
    console.log("\n=== Regression Check ===\n");

    // Calculate average of previous runs (excluding latest)
    const previous = history.slice(0, -1);
    const avgResults: Record<string, number> = {};

    for (const entry of previous) {
      for (const [name, result] of Object.entries(entry.results)) {
        avgResults[name] = (avgResults[name] ?? 0) + result.avg;
      }
    }

    for (const name of Object.keys(avgResults)) {
      avgResults[name] /= previous.length;
    }

    for (const [name, result] of Object.entries(latest.results)) {
      const historicalAvg = avgResults[name];
      if (historicalAvg !== undefined) {
        const limit = historicalAvg * REGRESSION_MULTIPLIER;
        if (result.avg > limit) {
          const msg = `REGRESSION: ${name} avg=${
            formatMs(result.avg)
          } exceeds ${REGRESSION_MULTIPLIER}x historical avg=${
            formatMs(historicalAvg)
          }`;
          failures.push(msg);
          console.log(
            `  [REGRESSION] ${name}: ${formatMs(result.avg)} > ${
              formatMs(limit)
            } (${REGRESSION_MULTIPLIER}x of ${formatMs(historicalAvg)})`,
          );
        } else {
          console.log(
            `  [OK] ${name}: ${formatMs(result.avg)} <= ${formatMs(limit)}`,
          );
        }
      }
    }
  }

  console.log("");

  if (failures.length > 0) {
    console.error(`${failures.length} check(s) failed:`);
    for (const f of failures) {
      console.error(`  - ${f}`);
    }
    Deno.exit(1);
  }

  console.log("All checks passed.");
}

main();
