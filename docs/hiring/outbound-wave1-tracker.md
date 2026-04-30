# Outbound Wave 1 Tracker

## Objective
Track M1 sourcing + outbound execution in a single versioned CSV and produce a weekly metrics snapshot against LEP-25 targets.

## Source of Truth
- Tracker file: `data/hiring/outbound-wave1.csv`
- Weekly rollup script: `scripts/weekly-outbound-metrics.sh`

## CSV Schema
Required columns:
- `candidate_id`: stable outbound candidate identifier
- `role`: role title targeted
- `source_channel`: one of `github`, `linkedin`, `warm_intro`
- `sourced_at`: ISO date `YYYY-MM-DD`
- `outreach_sent_at`: first personalized outbound date (empty if not sent yet)
- `followup1_sent_at`: Day 4 follow-up date
- `followup2_sent_at`: Day 10 follow-up date
- `reply_status`: one of `none`, `positive`, `negative`
- `reply_at`: reply date (empty when no reply)
- `intro_call_scheduled`: `yes` or `no`
- `intro_call_scheduled_at`: intro call scheduling date when applicable
- `owner`: recruiter/hiring owner
- `notes`: short context

Each row represents one sourced candidate in Wave 1.

## Weekly Metrics Rollup
Run:

```bash
scripts/weekly-outbound-metrics.sh data/hiring/outbound-wave1.csv [week-start-YYYY-MM-DD]
```

Output format:
- CSV with `metric,value`
- Includes sourcing volume, outreach and follow-up volume, reply outcomes, scheduled intros, conversion rates, and per-channel counts

## M1 Wave 1 Success Condition
- `sourced_candidates >= 30` per week
- `outreach_messages_sent >= 20` per week
- `positive_reply_rate_pct >= 15`
- `intro_conversion_from_positive_pct >= 60`
- `intro_calls_scheduled >= 3`

## Operating Cadence
- Update tracker daily as outreach and replies occur.
- Generate weekly rollup every Friday UTC after outreach updates.
- Commit tracker updates and the weekly rollup artifact in `docs/hiring/weekly-rollups/`.
