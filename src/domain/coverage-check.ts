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
