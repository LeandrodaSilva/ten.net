---
paths:
  - "src/test/**"
  - "src/bench/**"
---

# Testing Conventions

- Use `@std/assert` for assertions (preferred over `@deno-assert` legacy)
- Use `describe/it` from `@std/testing/bdd` for test structure
- Snapshot tests use `assertSnapshot` from `@std/testing/snapshot`
- Snapshots stored in `src/test/__snapshots__/`
- E2E tests (`demo.test.ts`) spin up a real HTTP server — use
  `AbortController` for cleanup
- CI enforces 90% coverage threshold — ensure new code has tests
- Benchmarks use `Deno.bench()` with history tracking in
  `benchmarks/history.json`
- Regression threshold multiplier: 3.0x (accommodates CI variance)
