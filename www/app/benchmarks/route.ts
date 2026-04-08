interface BenchResult {
  avg: number;
  p75: number;
  p99: number;
  n: number;
}

interface BenchEntry {
  date: string;
  commit: string;
  denoVersion: string;
  os: string;
  results: Record<string, BenchResult>;
}

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatMs(value: number): string {
  if (value >= 1) return `${value.toFixed(3)}ms`;
  if (value >= 0.001) return `${value.toFixed(4)}ms`;
  return `${(value * 1000).toFixed(3)}µs`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toISOString().slice(0, 10);
}

export async function GET(_req: Request): Promise<Response> {
  const history = JSON.parse(
    await Deno.readTextFile("./benchmarks/history.json"),
  ) as BenchEntry[];
  const last = history[history.length - 1];

  const rowsHtml = Object.entries(last.results).map(([name, r]) =>
    `<tr class="border-t border-[#f5f7fa]">` +
    `<td class="px-4 py-3 font-mono-m3 text-sm text-[#1a1c1e]">${
      escapeHtml(name)
    }</td>` +
    `<td class="px-4 py-3 text-right text-sm text-[#5f6368] tabular-nums">${
      formatMs(r.avg)
    }</td>` +
    `<td class="px-4 py-3 text-right text-sm text-[#5f6368] tabular-nums">${
      formatMs(r.p75)
    }</td>` +
    `<td class="px-4 py-3 text-right text-sm text-[#5f6368] tabular-nums">${
      formatMs(r.p99)
    }</td>` +
    `<td class="px-4 py-3 text-right text-sm text-[#80868b] tabular-nums">${r.n}</td>` +
    `</tr>`
  ).join("");

  return Response.json({
    date: formatDate(last.date),
    commit: last.commit.slice(0, 7),
    denoVersion: last.denoVersion,
    os: last.os,
    rowsHtml,
  });
}
