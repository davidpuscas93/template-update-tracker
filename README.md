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

I used Claude in two ways:

- A separate chat session via Opus 5.5 (not included) to work through the design; it also drafted much of the wording of [DESIGN.md], which I reviewed and edited section by section.
- Two Claude Code sessions in the project terminal, always starting in plan mode: one to scaffold the project and draft the test tables, one to draft the first three sections of this [README.md]. The second also reviewed my implementation. The plans are in `docs/plans`, the exported sessions in `docs/ai-sessions`.

I have implemented both functions myself.

Where I corrected or overruled AI:

- Its first plan modelled the LLM's tags as a flat list, losing which sentence each tag came from, so a sentence with no tags could never be detected. I traced that to a gap in my own design, added "every sentence has at least one tag" to [DESIGN.md] in §4, and had the plan revised.
- The same plan didn't save itself to `docs/plans` as asked, and had no `.gitignore`.
- In its [README.md] draft, the "why not now" reasons were its own guesses, and one contradicted the point it was explaining. I replaced them with the actual reasons.
- From its code review, I took one suggestion (a test for a sentence that tags one real and one invented entry) and rejected another (mergin two loops into one): three separate blocks mirror the three rules in the design, and at this scale the merge saves nothing.

Where it shouldn't be trusted in this domain: the summaries themselves. Auditors act on them, so [DESGIN.md] §4 never lets LLM output reach users unchecked. Every summary is verified in code against the diff, and the content team reviews it.