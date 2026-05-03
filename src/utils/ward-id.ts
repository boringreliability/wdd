/** Zero-pad a ward number to 3 digits, optionally with revision suffix. */
export function formatWardId(num: number, revision?: string | null): string {
  const padded = String(num).padStart(3, "0");
  return revision ? `${padded}${revision}` : padded;
}

/** Build the canonical ward filename: e.g., `ward-003.md` or `ward-003b.md`. */
export function wardFilename(num: number, revision?: string | null): string {
  return `ward-${formatWardId(num, revision)}.md`;
}

/**
 * Parse a ward identifier like `3`, `"3"`, or `"3b"` into its parts.
 * Returns null when the input doesn't look like a ward id.
 */
export function parseWardId(
  id: number | string
): { num: number; revision: string | null } | null {
  const str = String(id);
  const match = str.match(/^(\d+)([a-z])?$/);
  if (!match) return null;
  return {
    num: parseInt(match[1], 10),
    revision: match[2] ?? null,
  };
}
