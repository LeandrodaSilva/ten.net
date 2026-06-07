# Coverage Plan

The CI coverage gate enforces a **line-coverage floor** (currently `77%`, set
via `MIN_COVERAGE` in `.github/workflows/ci.yml`). The long-term **goal is
90%**. This document tracks the gap and the path there.

> **Background:** the gate previously parsed `deno coverage` output incorrectly
> (it read the trailing `|` of the table instead of the Line % column), so the
> threshold check always passed regardless of real coverage. The parser is now
> fixed and the floor reflects the real, enforced number.

## How to measure locally

```bash
deno task coverage                       # run tests, collect coverage
deno coverage coverage                   # per-file + "All files" summary
deno coverage coverage --lcov --output=coverage/lcov.info  # for tooling
```

## Ratchet policy

`MIN_COVERAGE` is a one-way ratchet: it may only ever increase. When a change
raises overall line coverage, bump the floor in the same PR. Suggested steps:

`77 → 80 → 85 → 90`

## Current gaps (lowest line coverage first)

These `src/` modules drag the overall number down the most. Closing the top few
moves the needle fastest.

| File                               | Line % | Notes / what to test                                      |
| ---------------------------------- | ------ | --------------------------------------------------------- |
| `src/models/Permission.ts`         | ~0%    | Pure `buildPermissionKey` helper — trivial, high ROI.     |
| `src/routing/blogRouteRegistry.ts` | ~2%    | Registry add/match/all enumeration.                       |
| `src/models/Plugin.ts`             | ~11%   | `validate()` schema cases + `slug`. Pure, easy.           |
| `src/build/build.ts`               | ~48%   | Build orchestration — exercise via a small fixture build. |
| `src/tailwind/generator.ts`        | ~58%   | CSS generation branches for candidate sets.               |
| `src/cli.ts`                       | ~69%   | CLI argument parsing / subcommand dispatch.               |
| `src/build/codeGenerator.ts`       | ~73%   | Generated-output branches (assets, i18n, selectors).      |
| `src/i18nEngine.ts`                | ~77%   | Selector/hreflang/escape-hatch edge cases.                |
| `src/build/collector.ts`           | ~83%   | Asset/route collection edge cases.                        |

(Run the measure command above for the live table — percentages drift as tests
are added.)

## Recommended order of attack

1. **Quick wins (pure modules):** `Permission.ts`, `Plugin.ts`,
   `blogRouteRegistry.ts`. Small, deterministic, no I/O — likely a few points of
   overall coverage for little effort. Bump the floor to `80` afterward.
2. **i18n + tailwind branches:** `i18nEngine.ts`, `tailwind/generator.ts`.
3. **Build system:** `build.ts`, `codeGenerator.ts`, `collector.ts`,
   `bundleRoutes.ts` via a minimal end-to-end build of a fixture app.
4. **CLI:** `cli.ts` subcommand dispatch with mocked args.

After each milestone, raise `MIN_COVERAGE` so the gain is locked in.

## Notes

- `deno task coverage` runs with `--no-check`; type errors are caught by the
  separate `deno task check` CI step.
- The coverage denominator currently includes `_test_/` helpers and some
  `playground/`/`www/` files exercised by tests. Scoping coverage to `src/` only
  (via `deno coverage coverage --include='src/'`) is an option to make the
  number reflect product code more directly — decide before ratcheting to 90%.
