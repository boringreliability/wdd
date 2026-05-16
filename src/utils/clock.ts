/**
 * Injectable "now" source so library functions don't read system clock directly.
 * CLI surfaces read `WDD_NOW` env var (ISO date) and construct the Clock once.
 */
export type Clock = () => Date;

export const defaultClock: Clock = () => new Date();

/** Read `WDD_NOW` env var as an ISO date; fall back to defaultClock. */
export function clockFromEnv(env: Record<string, string | undefined> = process.env): Clock {
  const raw = env.WDD_NOW;
  if (!raw) return defaultClock;
  const parsed = new Date(raw);
  if (isNaN(parsed.getTime())) return defaultClock;
  return () => parsed;
}
