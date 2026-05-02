#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -lt 1 ] || [ "$#" -gt 2 ]; then
  echo "usage: $0 <url> [requests]" >&2
  exit 1
fi

url="$1"
requests="${2:-100}"

if ! [[ "$requests" =~ ^[0-9]+$ ]] || [ "$requests" -le 0 ]; then
  echo "requests must be a positive integer" >&2
  exit 1
fi

latencies_file="$(mktemp)"
trap 'rm -f "$latencies_file"' EXIT

success=0
server_errors=0
for _ in $(seq 1 "$requests"); do
  result="$(curl -sS -o /dev/null -w '%{http_code} %{time_total}' "$url")"
  code="${result%% *}"
  latency_s="${result##* }"
  latency_ms="$(awk -v s="$latency_s" 'BEGIN { printf "%.3f", s * 1000 }')"
  printf '%s\n' "$latency_ms" >> "$latencies_file"

  if [ "$code" -ge 200 ] && [ "$code" -lt 400 ]; then
    success=$((success + 1))
  fi

  if [ "$code" -ge 500 ] && [ "$code" -lt 600 ]; then
    server_errors=$((server_errors + 1))
  fi

done

p95="$(sort -n "$latencies_file" | awk -v n="$requests" 'NR == int((95 * n + 99) / 100) { print; exit }')"
avg="$(awk '{sum += $1} END { printf "%.3f", sum / NR }' "$latencies_file")"
success_rate="$(awk -v s="$success" -v n="$requests" 'BEGIN { printf "%.3f", (s / n) * 100 }')"
server_error_rate="$(awk -v e="$server_errors" -v n="$requests" 'BEGIN { printf "%.3f", (e / n) * 100 }')"

cat <<METRICS
url: $url
requests: $requests
success_rate_pct: $success_rate
server_error_rate_pct: $server_error_rate
p95_latency_ms: $p95
avg_latency_ms: $avg
METRICS
