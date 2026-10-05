# Scaffold the domain module

## Context

`DESIGN.md` describes a backend service with two pure, I/O-free functions that are meant to live in one shared domain module: **the pending rule** (§1 "Pending Updates", §3.1) and **the summary coverage check** (§4 "Evaluation", §3.1/§3.3). The repo currently contains only `DESIGN.md` — no code, no tooling. This task scaffolds a minimal TypeScript + Vitest project with typed stubs for both functions and table-driven test files seeded with cases drawn straight from the design doc. The user will implement the function bodies; this step only sets up structure, types, and test tables.

§4 was just updated: the coverage check now also requires every sentence to have at least one tag, not just that every diff entry is covered and every tag is real. The plan below reflects that.

## Execution order

1. Write this plan to `docs/plans/01-scaffold-domain-module.md` first.
2. Then create the rest of the files below.

## Approach

### Project setup
- `package.json` — `type: module`, devDependencies `typescript` and `vitest`, scripts:
  - `test`: `vitest run`
  - `test:watch`: `vitest`
  - `typecheck`: `tsc --noEmit`
- `tsconfig.json` — strict mode on, `target: ES2022`, `module`/`moduleResolution: NodeNext`, `rootDir: src`, `outDir: dist`, `strict: true`, `skipLibCheck: true`, `esModuleInterop: true`.
- No framework, no `vitest.config.ts` — Vitest runs `.test.ts` files out of the box, matching the design's "no framework" philosophy (§1, "Where It Runs").

### Domain module layout

```
src/domain/
  pending-rule.ts
  pending-rule.test.ts
  coverage-check.ts
  coverage-check.test.ts
```

### `pending-rule.ts`

Types and stub matching §1 "Pending Updates": *"An engagement has a pending update when the latest published version is newer than both its current version and its declined version."*

```ts
export interface PendingRuleInput {
  latestVersion: number;
  currentVersion: number;
  declinedVersion: number | null;
}

export function isPending(input: PendingRuleInput): boolean {
  throw new Error("not implemented");
}
```

Test table (`pending-rule.test.ts`), cases drawn from §1's worked example plus boundary cases:

| latest | current | declined | expected | from |
|---|---|---|---|---|
| 5 | 3 | null | true | "v5 is published, engagement on v3, nothing declined -> pending" |
| 5 | 3 | 5 | false | "user declines v5; latest is v5 -> not pending" |
| 6 | 3 | 5 | true | "v6 is published; v6 is newer than both -> pending again" |
| 3 | 3 | null | false | current already at latest, nothing declined |
| 3 | 3 | 2 | false | current already at latest, stale decline on record |

### `coverage-check.ts`

Types and stub matching the updated §4 Evaluation: *"The LLM tags each sentence with the diff entries it describes; plain code checks that every entry is covered, every tag is real, and every sentence has at least one tag."* Three distinct failure shapes, each reported as its own list rather than collapsed into pass/fail:

- **omission** — a diff entry no sentence covers
- **invention** — a tag (an id in some sentence's `covers`) that matches no diff entry
- **untagged sentence** — a sentence whose `covers` is empty, so it describes nothing in the diff

```ts
export interface DiffEntry {
  id: string;
}

export interface TaggedSentence {
  text: string;
  covers: string[];
}

export interface CoverageCheckInput {
  diffEntries: DiffEntry[];
  sentences: TaggedSentence[];
}

export interface CoverageCheckResult {
  passed: boolean;
  uncoveredEntryIds: string[];
  invalidTagEntryIds: string[];
  untaggedSentenceIndexes: number[];
}

export function checkCoverage(input: CoverageCheckInput): CoverageCheckResult {
  throw new Error("not implemented");
}
```

Test table (`coverage-check.test.ts`), cases drawn from §4's invention/omission/untagged framing:

| diffEntries | sentences (text: covers) | expected passed | uncoveredEntryIds | invalidTagEntryIds | untaggedSentenceIndexes | from |
|---|---|---|---|---|---|---|
| [a, b] | S1:[a], S2:[b] | true | [] | [] | [] | full coverage, no stray tags, every sentence tagged |
| [a, b] | S1:[a] | false | [b] | [] | [] | omission: b never mentioned |
| [a] | S1:[a], S2:[z] | false | [] | [z] | [] | invention: tag z matches no entry |
| [a, b] | S1:[a], S2:[z] | false | [b] | [z] | [] | omission and invention together |
| [] | (none) | true | [] | [] | [] | empty diff, nothing to cover |
| [a] | S1:[a], S2:[a] | true | [] | [] | [] | duplicate tags on same entry still fully covers it |
| [a] | S1:[a], S2:[] | false | [] | [] | [1] | untagged sentence: empty `covers` fails even though `a` is covered elsewhere |
| [a] | S1:[a], S2:[z, z] | false | [] | [z] | [] | same unknown id tagged twice is reported once, not twice |

## Files to add

- `docs/plans/01-scaffold-domain-module.md` (this plan, saved first)
- `package.json`
- `tsconfig.json`
- `.gitignore` (`node_modules`, `dist`)
- `src/domain/pending-rule.ts`
- `src/domain/pending-rule.test.ts`
- `src/domain/coverage-check.ts`
- `src/domain/coverage-check.test.ts`

## Verification

- `npm install` to pull `typescript` + `vitest`.
- `npm run typecheck` — should pass (stubs type-check even though they throw at runtime).
- `npm test` — tests will fail at runtime (stubs throw `not implemented`), which is expected until the user fills in the logic. Confirms the test files load, the table cases are wired to the real function signatures, and Vitest is configured correctly.
