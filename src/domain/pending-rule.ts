export interface PendingRuleInput {
  latestVersion: number;
  currentVersion: number;
  declinedVersion: number | null;
}

export function isPending(input: PendingRuleInput): boolean {
  throw new Error("not implemented");
}
