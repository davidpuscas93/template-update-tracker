# Draft README.md

## Context

The repo has `DESIGN.md` and a domain module (`src/domain/`: `isPending` in `pending-rule.ts`, `checkCoverage` in `coverage-check.ts`, each with a table-driven `.test.ts`). It has no README. Scripts in `package.json`: `test` (vitest run), `typecheck` (tsc --noEmit).

## Execution order

1. Write this plan to `docs/plans/02-readme.md` first.
2. Then write `README.md` with the content below, verbatim.

## README.md content (short, plain, no badges)

```markdown
# Template Update Tracker

## What this is

The design is in [DESIGN.md](DESIGN.md). The code is its domain module: the pending rule and the summary coverage check, as pure functions with table-driven tests (`src/domain/`).

## Running it

    npm install
    npm test
    npm run typecheck

## What I'd do next, and why not now

- **Event handlers with forward-only upserts, plus integration tests against a real Postgres (Testcontainers).** Duplicate and out-of-order events are where the real risk is (DESIGN.md §3, §5). Not now: the exercise asks for one slice; I chose the rules every other component depends on.
- **Property-based tests for the pending rule.** Not now: the table covers every case in the design; properties pay off once the rule grows, e.g. with intermediate-version accepts.
- **Unique diff-entry IDs, guaranteed by whatever produces the diff rather than by the pure function.** Not now: the diff producer doesn't exist yet, and `checkCoverage` takes unique IDs as given.

## How AI was used
```

The "How AI was used" heading is the last line of the file: no body text. The author writes that section.

## Verification

- Commands in the README match `package.json` scripts; run `npm test` and `npm run typecheck` once to confirm.
