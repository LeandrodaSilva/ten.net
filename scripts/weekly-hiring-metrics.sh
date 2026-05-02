#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 || $# -gt 2 ]]; then
  echo "Usage: $0 <candidate-funnel.csv> [week-start-YYYY-MM-DD]" >&2
  exit 1
fi

input_csv="$1"
week_start="${2:-}"

if [[ ! -f "$input_csv" ]]; then
  echo "Input file not found: $input_csv" >&2
  exit 1
fi

awk -F',' -v week_start="$week_start" '
BEGIN {
  OFS=","
}
NR==1 {
  for (i=1; i<=NF; i++) {
    col[$i]=i
  }
  required[1]="candidate_id"
  required[2]="stage"
  required[3]="status"
  required[4]="stage_entered_at"
  required[5]="stage_exited_at"

  for (i=1; i<=5; i++) {
    if (!(required[i] in col)) {
      printf("Missing required column: %s\n", required[i]) > "/dev/stderr"
      exit 2
    }
  }
  next
}
{
  cid=$col["candidate_id"]
  stage=$col["stage"]
  status=$col["status"]
  entered=$col["stage_entered_at"]
  exited=$col["stage_exited_at"]

  if (week_start != "" && entered < week_start) {
    next
  }

  total_rows++
  stage_entries[stage]++

  if (exited != "") {
    stage_exits[stage]++
  }

  if (!(cid in seen_candidate)) {
    seen_candidate[cid]=1
    unique_candidates++
  }

  if (status == "hired") {
    hired_candidates[cid]=1
  } else if (status == "rejected") {
    rejected_candidates[cid]=1
  }
}
END {
  print "metric,value"
  print "funnel_rows", total_rows + 0
  print "unique_candidates", unique_candidates + 0

  hired_count=0
  for (c in hired_candidates) hired_count++
  rejected_count=0
  for (c in rejected_candidates) rejected_count++

  print "hired_candidates", hired_count
  print "rejected_candidates", rejected_count

  for (s in stage_entries) {
    print "entered_stage_" s, stage_entries[s]
  }
  for (s in stage_exits) {
    print "exited_stage_" s, stage_exits[s]
  }
}
' "$input_csv"
