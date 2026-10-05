import { describe, expect, it } from "vitest";
import {
  checkCoverage,
  type CoverageCheckInput,
  type CoverageCheckResult,
} from "./coverage-check.js";

// Cases drawn from DESIGN.md §4 Evaluation: a summary can fail by omission
// (an entry no sentence covers), invention (a tag matching no entry), or now
// an untagged sentence (a sentence covering no entry).
const cases: Array<{
  name: string;
  input: CoverageCheckInput;
  expected: CoverageCheckResult;
}> = [
  {
    name: "full coverage, no stray tags, every sentence tagged",
    input: {
      diffEntries: [{ id: "a" }, { id: "b" }],
      sentences: [
        { text: "S1", covers: ["a"] },
        { text: "S2", covers: ["b"] },
      ],
    },
    expected: {
      passed: true,
      uncoveredEntryIds: [],
      invalidTagEntryIds: [],
      untaggedSentenceIndexes: [],
    },
  },
  {
    name: "omission: b never mentioned",
    input: {
      diffEntries: [{ id: "a" }, { id: "b" }],
      sentences: [{ text: "S1", covers: ["a"] }],
    },
    expected: {
      passed: false,
      uncoveredEntryIds: ["b"],
      invalidTagEntryIds: [],
      untaggedSentenceIndexes: [],
    },
  },
  {
    name: "invention: tag z matches no entry",
    input: {
      diffEntries: [{ id: "a" }],
      sentences: [
        { text: "S1", covers: ["a"] },
        { text: "S2", covers: ["z"] },
      ],
    },
    expected: {
      passed: false,
      uncoveredEntryIds: [],
      invalidTagEntryIds: ["z"],
      untaggedSentenceIndexes: [],
    },
  },
  {
    name: "omission and invention together",
    input: {
      diffEntries: [{ id: "a" }, { id: "b" }],
      sentences: [
        { text: "S1", covers: ["a"] },
        { text: "S2", covers: ["z"] },
      ],
    },
    expected: {
      passed: false,
      uncoveredEntryIds: ["b"],
      invalidTagEntryIds: ["z"],
      untaggedSentenceIndexes: [],
    },
  },
  {
    name: "empty diff, nothing to cover",
    input: { diffEntries: [], sentences: [] },
    expected: {
      passed: true,
      uncoveredEntryIds: [],
      invalidTagEntryIds: [],
      untaggedSentenceIndexes: [],
    },
  },
  {
    name: "duplicate tags on same entry still fully covers it",
    input: {
      diffEntries: [{ id: "a" }],
      sentences: [
        { text: "S1", covers: ["a"] },
        { text: "S2", covers: ["a"] },
      ],
    },
    expected: {
      passed: true,
      uncoveredEntryIds: [],
      invalidTagEntryIds: [],
      untaggedSentenceIndexes: [],
    },
  },
  {
    name: "untagged sentence: empty covers fails even though a is covered elsewhere",
    input: {
      diffEntries: [{ id: "a" }],
      sentences: [
        { text: "S1", covers: ["a"] },
        { text: "S2", covers: [] },
      ],
    },
    expected: {
      passed: false,
      uncoveredEntryIds: [],
      invalidTagEntryIds: [],
      untaggedSentenceIndexes: [1],
    },
  },
  {
    name: "same unknown id tagged twice is reported once, not twice",
    input: {
      diffEntries: [{ id: "a" }],
      sentences: [
        { text: "S1", covers: ["a"] },
        { text: "S2", covers: ["z", "z"] },
      ],
    },
    expected: {
      passed: false,
      uncoveredEntryIds: [],
      invalidTagEntryIds: ["z"],
      untaggedSentenceIndexes: [],
    },
  },
];

describe("checkCoverage", () => {
  it.each(cases)("$name", ({ input, expected }) => {
    expect(checkCoverage(input)).toEqual(expected);
  });
});
