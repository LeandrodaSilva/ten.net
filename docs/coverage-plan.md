# Coverage Plan

The CI coverage gate enforces a **line-coverage floor** (currently `95%`, set
via `MIN_COVERAGE` in `.github/workflows/ci.yml`). The **95% goal has been
reached** (line coverage ≈ 95.1%); this document records how it was done and the
policy for keeping it there.

> **Update:** the floor was ratcheted from 90% to **95%**. The remaining
> uncovered code is concentrated in the binary/Service-Worker build pipeline
> (`src/build/build.ts`) and the Tailwind generator's environment-specific
> fallbacks (`src/tailwind/generator.ts`), which require `deno compile` /
> esbuild self-bundling that cannot run in the test sandbox, plus a handful of
> defensive `catch` clauses. Everything else is exercised, including the
> live-server start path, the Node adapter, i18n selectors, custom renderers,
> and the build bundle-warning path.

> **Background:** the gate previously parsed `deno coverage` output incorrectly
> (it read the trailing `|` of the table instead of the Line % column), so the
> threshold check always passed regardless of real coverage. The parser was
> fixed (the floor now reflects the real number), and coverage was then raised
> from ~77% to ≥90% by adding focused unit tests for the previously
> under-covered modules (Permission, Plugin, BlogRouteRegistry, the i18n engine,
> sitemap/SEO, the view-shell + i18n branches, dynamic-page rendering, the build
> code generators, the CLI, the Node adapter, and the collector).

## How to measure locally

```bash
deno task coverage                       # run tests, collect coverage
deno coverage coverage                   # per-file + "All files" summary
deno coverage coverage --lcov --output=coverage/lcov.info  # for tooling
```

## Ratchet policy

`MIN_COVERAGE` is a one-way ratchet: it may only ever increase, never decrease.
The floor is now `90`. New code must ship with tests that keep line coverage at
or above the floor; raise the floor further only when coverage durably climbs.

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
