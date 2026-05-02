# Candidate Funnel Tracker

## Objective
Provide a lightweight, versioned tracker for candidate movement through the hiring funnel and generate weekly rollup metrics from a single CSV source of truth.

## Source of Truth
- Tracker file: `data/hiring/candidate-funnel.csv`
- Weekly rollup script: `scripts/weekly-hiring-metrics.sh`

## CSV Schema
Required columns:
- `candidate_id`: stable unique candidate identifier
- `role`: role title the candidate is in process for
- `recruiter`: owning recruiter
- `stage`: funnel stage (`applied`, `screen`, `onsite`, `offer`, `hired`, `rejected`)
- `status`: current row outcome (`active`, `rejected`, `hired`)
- `stage_entered_at`: ISO date `YYYY-MM-DD`
- `stage_exited_at`: ISO date `YYYY-MM-DD` or empty
- `source`: channel (`referral`, `inbound`, `outbound`, etc.)

Each row records one candidate stage transition. A candidate with four stages should have four rows.

## Weekly Metrics Rollup
Run:

```bash
scripts/weekly-hiring-metrics.sh data/hiring/candidate-funnel.csv [week-start-YYYY-MM-DD]
```

Example:

```bash
scripts/weekly-hiring-metrics.sh data/hiring/candidate-funnel.csv 2026-04-07
```

Output format:
- CSV with `metric,value`
- Includes totals, unique candidates, hired/rejected candidate counts, and stage entry/exit counts

## Operating Cadence
- Update tracker continuously as stage changes happen.
- Run the rollup once weekly (Monday UTC) with the prior week start date.
- Commit both tracker updates and resulting rollup artifact (if your team keeps generated snapshots).

## Suggested Weekly Success Condition
- All candidate stage transitions from the previous week are reflected in the tracker.
- Weekly rollup runs without schema errors.
- Hiring owner posts the rollup in the weekly hiring ops update.
