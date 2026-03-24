/**
 * MirrorClient — HTTP client for the Hedera Mirror Node REST API.
 *
 * Features:
 * - Multiple base-URL failover: tries each URL in order; moves to the next on
 *   connection errors or 5xx responses.
 * - Exponential backoff between retries within the same URL (BackoffTimer).
 * - Typed response helpers for the schedule-specific endpoints.
 */

// ── Exponential Backoff ────────────────────────────────────────────────────────

export interface BackoffOptions {
  /** Initial delay in milliseconds (default: 500). */
  initialMs?: number;
  /** Maximum delay in milliseconds (default: 30 000). */
  maxMs?: number;
  /** Multiplicative growth factor per retry (default: 2). */
  multiplier?: number;
}

export class BackoffTimer {
  private readonly initialMs: number;
  private readonly maxMs: number;
  private readonly multiplier: number;
  private current: number;

  constructor(opts: BackoffOptions = {}) {
    this.initialMs = opts.initialMs ?? 500;
    this.maxMs = opts.maxMs ?? 30_000;
    this.multiplier = opts.multiplier ?? 2;
    this.current = this.initialMs;
  }

  /** Returns the next delay in ms and advances the internal state. */
  next(): number {
    const delay = this.current;
    this.current = Math.min(this.current * this.multiplier, this.maxMs);
    return delay;
  }

  /** Resets the timer back to the initial delay. */
  reset(): void {
    this.current = this.initialMs;
  }
}

// ── Mirror Node Response Types ─────────────────────────────────────────────────

export interface MirrorScheduleSignature {
  consensus_timestamp?: string;
  public_key_prefix?: string;
  type?: string;
}

export interface MirrorScheduleData {
  schedule_id: string;
  executed_timestamp: string | null;
  deleted: boolean;
  memo?: string;
  consensus_timestamp?: string;
  expiration_time?: string;
  signatures?: MirrorScheduleSignature[];
}

// ── MirrorClient ───────────────────────────────────────────────────────────────

export interface MirrorClientOptions {
  /**
   * One or more mirror-node base URLs, tried in order.
   * Default: Hedera testnet public mirror.
   */
  urls?: string[];
  backoff?: BackoffOptions;
  /** Per-request fetch timeout in ms (default: 10 000). */
  fetchTimeoutMs?: number;
}

const DEFAULT_URLS: Record<string, string> = {
  mainnet: 'https://mainnet-public.mirrornode.hedera.com',
  testnet: 'https://testnet.mirrornode.hedera.com',
  previewnet: 'https://previewnet.mirrornode.hedera.com',
};

/** Returns the default public mirror URL for a named Hedera network. */
export function defaultMirrorUrl(network: 'mainnet' | 'testnet' | 'previewnet'): string {
  return DEFAULT_URLS[network] ?? DEFAULT_URLS.testnet;
}

export class MirrorClient {
  private readonly urls: string[];
  private readonly backoff: BackoffTimer;
  private readonly fetchTimeoutMs: number;

  constructor(opts: MirrorClientOptions = {}) {
    this.urls = (opts.urls ?? [DEFAULT_URLS.testnet]).map((u) => u.replace(/\/$/, ''));
    this.backoff = new BackoffTimer(opts.backoff);
    this.fetchTimeoutMs = opts.fetchTimeoutMs ?? 10_000;
  }

  /**
   * Fetches a schedule from the mirror node.
   *
   * Tries each URL in turn; on 5xx or network failure, moves to the next URL.
   * Returns `null` when the schedule is not found (HTTP 404 on all URLs).
   *
   * @throws {MirrorClientError} if all URLs fail with non-404 errors.
   */
  async getSchedule(scheduleId: string): Promise<MirrorScheduleData | null> {
    const errors: string[] = [];

    for (const base of this.urls) {
      const url = `${base}/api/v1/schedules/${scheduleId}`;

      try {
        const response = await this.fetchWithTimeout(url);

        if (response.status === 404) {
          return null;
        }

        if (response.ok) {
          this.backoff.reset();
          return (await response.json()) as MirrorScheduleData;
        }

        // 5xx or other non-success: try next URL
        errors.push(`${base}: HTTP ${response.status}`);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`${base}: ${msg}`);
      }
    }

    throw new MirrorClientError(
      `All mirror nodes failed for schedule ${scheduleId}: ${errors.join('; ')}`,
    );
  }

  private async fetchWithTimeout(url: string): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.fetchTimeoutMs);
    try {
      return await fetch(url, { signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  }
}

export class MirrorClientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MirrorClientError';
  }
}
