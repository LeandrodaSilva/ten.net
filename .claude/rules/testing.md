---
paths:
  - "_test_/**"
  - "src/bench/**"
---

# Testing Conventions

- Use `@std/assert` for assertions (preferred over `@deno-assert` legacy)
- Use `describe/it` from `@std/testing/bdd` for test structure
- Snapshot tests use `assertSnapshot` from `@std/testing/snapshot`
- Snapshots stored in `_test_/__snapshots__/`
- Test fixtures in `example/http/app/` — pass `appPath: "./example/http/app"` to
  Ten.net()
- CI enforces 90% coverage threshold — ensure new code has tests
- Benchmarks use `Deno.bench()` with history tracking in
  `benchmarks/history.json`
- Regression threshold multiplier: 3.0x (accommodates CI variance)
