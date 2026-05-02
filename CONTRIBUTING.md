# Contributing

## Branching
Use short-lived feature branches and open pull requests for all changes.

## Local Validation
Before opening a PR, run:
```bash
./scripts/check.sh
```

If `make` is installed, `make check` remains available as a convenience wrapper.

## Commit Guidance
- Keep commits scoped to one logical change.
- Include issue IDs in commit messages when applicable.

## Review Criteria
- Changes are documented where behavior changes.
- Scripts are shellcheck-clean.
- CI workflow remains green.
