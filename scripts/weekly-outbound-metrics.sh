#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 || $# -gt 2 ]]; then
  echo "Usage: $0 <outbound-wave1.csv> [week-start-YYYY-MM-DD]" >&2
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
  required[2]="source_channel"
  required[3]="sourced_at"
  required[4]="outreach_sent_at"
  required[5]="reply_status"
  required[6]="intro_call_scheduled"

  for (i=1; i<=6; i++) {
    if (!(required[i] in col)) {
      printf("Missing required column: %s\n", required[i]) > "/dev/stderr"
      exit 2
    }
  }
  next
}
{
  sourced_at=$col["sourced_at"]
  outreach_sent_at=$col["outreach_sent_at"]
  followup1_sent_at=$col["followup1_sent_at"]
  followup2_sent_at=$col["followup2_sent_at"]
  reply_status=$col["reply_status"]
  intro_call_scheduled=$col["intro_call_scheduled"]
  source_channel=$col["source_channel"]

  if (week_start != "" && sourced_at < week_start) {
    next
  }

  sourced_total++
  by_channel[source_channel]++

  if (outreach_sent_at != "") {
    outreach_sent_total++
  }
  if (followup1_sent_at != "") {
    followup1_sent_total++
  }
  if (followup2_sent_at != "") {
    followup2_sent_total++
  }

  if (reply_status == "positive") {
    positive_replies++
  } else if (reply_status == "negative") {
    negative_replies++
  }

  if (intro_call_scheduled == "yes") {
    intro_calls_scheduled++
  }
}
END {
  print "metric,value"
  print "sourced_candidates", sourced_total + 0
  print "outreach_messages_sent", outreach_sent_total + 0
  print "followup1_messages_sent", followup1_sent_total + 0
  print "followup2_messages_sent", followup2_sent_total + 0
  print "positive_replies", positive_replies + 0
  print "negative_replies", negative_replies + 0
  print "intro_calls_scheduled", intro_calls_scheduled + 0

  if ((outreach_sent_total + 0) > 0) {
    positive_reply_rate=((positive_replies + 0) / (outreach_sent_total + 0)) * 100
    printf("positive_reply_rate_pct,%.2f\n", positive_reply_rate)
  } else {
    print "positive_reply_rate_pct,0.00"
  }

  if ((positive_replies + 0) > 0) {
    intro_conversion=((intro_calls_scheduled + 0) / (positive_replies + 0)) * 100
    printf("intro_conversion_from_positive_pct,%.2f\n", intro_conversion)
  } else {
    print "intro_conversion_from_positive_pct,0.00"
  }

  for (c in by_channel) {
    print "sourced_channel_" c, by_channel[c]
  }

  print "target_sourced_per_week", 30
  print "target_outreach_messages", 20
  print "target_positive_reply_rate_pct", 15
  print "target_intro_conversion_pct", 60
  print "target_first_loops_scheduled", 3
}
' "$input_csv"
