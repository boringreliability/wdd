export type Status =
  | "planned"
  | "red"
  | "approved"
  | "gold"
  | "complete"
  | "blocked";

export const STATUSES: readonly Status[] = [
  "planned",
  "red",
  "approved",
  "gold",
  "complete",
  "blocked",
];

export const VALID_TRANSITIONS: Record<Status, readonly Status[]> = {
  planned: ["red", "blocked"],
  red: ["approved", "red"],
  approved: ["gold"],
  gold: ["complete", "red"],
  complete: [],
  blocked: ["planned"],
};

export const STATUS_SYMBOLS: Record<Status, string> = {
  planned: "📋",
  red: "🔴",
  approved: "👀",
  gold: "🔨",
  complete: "✅",
  blocked: "⏸️",
};

export function isStatus(value: unknown): value is Status {
  return typeof value === "string" && (STATUSES as readonly string[]).includes(value);
}

export function statusLabel(status: Status): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}
