/**
 * Time parsing utilities — convert human-readable durations and timestamps
 * into Unix seconds for use with schedule expiry options.
 *
 * Supports:
 *   --execute-in  "30d" | "2w" | "1h" | "90m" | "3600s"
 *   --execute-at  ISO-8601 datetime | plain date | epoch seconds
 */

const UNIT_MAP: Record<string, number> = {
  s: 1,
  sec: 1,
  secs: 1,
  second: 1,
  seconds: 1,
  m: 60,
  min: 60,
  mins: 60,
  minute: 60,
  minutes: 60,
  h: 3600,
  hr: 3600,
  hrs: 3600,
  hour: 3600,
  hours: 3600,
  d: 86400,
  day: 86400,
  days: 86400,
  w: 604800,
  week: 604800,
  weeks: 604800,
};

/**
 * Parses a human-readable duration string into seconds.
 *
 * Examples:
 *   "30d"   → 2592000
 *   "2w"    → 1209600
 *   "1h"    → 3600
 *   "90m"   → 5400
 *   "3600s" → 3600
 */
export function parseDuration(input: string): number {
  const match = input.trim().match(/^(\d+(?:\.\d+)?)\s*([a-zA-Z]+)$/);
  if (!match) {
    throw new Error(
      `Invalid duration "${input}". Expected <number><unit>, e.g. 30d, 2w, 1h, 90m, 3600s.`,
    );
  }

  const value = parseFloat(match[1]!);
  const unit = match[2]!.toLowerCase();
  const multiplier = UNIT_MAP[unit];

  if (multiplier === undefined) {
    throw new Error(
      `Unknown time unit "${unit}" in "${input}". Supported: s, m, h, d, w (and long forms).`,
    );
  }

  return Math.round(value * multiplier);
}

/**
 * Parses an absolute timestamp string into Unix epoch seconds.
 *
 * Accepted formats:
 *   - Plain integer string  → treated as epoch seconds directly
 *   - ISO-8601 datetime     → "2024-12-31T00:00:00Z"
 *   - Plain date            → "2024-12-31" (interpreted as UTC midnight)
 */
export function parseAbsoluteTimestamp(input: string): number {
  const trimmed = input.trim();

  if (/^\d+$/.test(trimmed)) {
    return parseInt(trimmed, 10);
  }

  const ms = Date.parse(trimmed);
  if (isNaN(ms)) {
    throw new Error(
      `Invalid timestamp "${input}". Expected ISO-8601 date/datetime or epoch seconds.`,
    );
  }

  return Math.floor(ms / 1000);
}

/**
 * Resolves the effective expiry window (seconds from now) from the combination
 * of --execute-in, --execute-at, and the schema default.
 *
 * At most one of executeIn / executeAt may be set.
 */
export function resolveExpirySeconds(opts: {
  executeIn?: string;
  executeAt?: string;
  defaultSeconds: number;
}): number {
  const { executeIn, executeAt, defaultSeconds } = opts;

  if (executeIn !== undefined && executeAt !== undefined) {
    throw new Error('Specify --execute-in or --execute-at, not both.');
  }

  if (executeIn !== undefined) {
    return parseDuration(executeIn);
  }

  if (executeAt !== undefined) {
    const targetEpoch = parseAbsoluteTimestamp(executeAt);
    const nowEpoch = Math.floor(Date.now() / 1000);
    const delta = targetEpoch - nowEpoch;
    if (delta <= 0) {
      throw new Error(`--execute-at "${executeAt}" resolves to a time in the past.`);
    }
    return delta;
  }

  return defaultSeconds;
}
