import { describe, expect, it } from "vitest";
import { isPending, type PendingRuleInput } from "./pending-rule.js";

// Cases drawn from DESIGN.md §1 "Pending Updates".
const cases: Array<{
  name: string;
  input: PendingRuleInput;
  expected: boolean;
}> = [
  {
    name: "v5 is published, engagement on v3, nothing declined -> pending",
    input: { latestVersion: 5, currentVersion: 3, declinedVersion: null },
    expected: true,
  },
  {
    name: "user declines v5; latest is v5 -> not pending",
    input: { latestVersion: 5, currentVersion: 3, declinedVersion: 5 },
    expected: false,
  },
  {
    name: "v6 is published; v6 is newer than both -> pending again",
    input: { latestVersion: 6, currentVersion: 3, declinedVersion: 5 },
    expected: true,
  },
  {
    name: "current already at latest, nothing declined",
    input: { latestVersion: 3, currentVersion: 3, declinedVersion: null },
    expected: false,
  },
  {
    name: "current already at latest, stale decline on record",
    input: { latestVersion: 3, currentVersion: 3, declinedVersion: 2 },
    expected: false,
  },
];

describe("isPending", () => {
  it.each(cases)("$name", ({ input, expected }) => {
    expect(isPending(input)).toBe(expected);
  });
});
