export interface PendingRuleInput {
  latestVersion: number;
  currentVersion: number;
  declinedVersion: number | null;
}

export function isPending(input: PendingRuleInput): boolean {
  const { latestVersion, currentVersion, declinedVersion } = input;

  return (
    latestVersion > currentVersion &&
    (declinedVersion === null || latestVersion > declinedVersion)
  );
}
