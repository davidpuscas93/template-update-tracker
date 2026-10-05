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
  const { diffEntries, sentences } = input;

  const untaggedSentenceIndexes: number[] = [];
  sentences.forEach((sentence, index) => {
    if (sentence.covers.length === 0) {
      untaggedSentenceIndexes.push(index);
    }
  });

  const validIds = new Set(diffEntries.map((entry) => entry.id));
  const invalidIds = new Set<string>();
  sentences.forEach((sentence) => {
    sentence.covers.forEach((id) => {
      if (!validIds.has(id)) {
        invalidIds.add(id);
      }
    });
  });
  const invalidTagEntryIds = [...invalidIds];

  const taggedIds = new Set<string>();
  sentences.forEach((sentence) => {
    sentence.covers.forEach((id) => {
      taggedIds.add(id);
    });
  });
  const uncoveredEntryIds = diffEntries
    .filter((entry) => !taggedIds.has(entry.id))
    .map((entry) => entry.id);

  const passed =
    untaggedSentenceIndexes.length === 0 &&
    invalidTagEntryIds.length === 0 &&
    uncoveredEntryIds.length === 0;

  return {
    passed,
    uncoveredEntryIds,
    invalidTagEntryIds,
    untaggedSentenceIndexes,
  };
}
