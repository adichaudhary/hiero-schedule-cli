/**
 * ScheduleStatusPoller — browser-safe class for polling a schedule's status.
 *
 * No Node.js-specific imports (no fs, path, os, EventEmitter from 'events').
 * Uses the browser's native fetch and setTimeout APIs.
 *
 * Usage (React, Vue, plain JS):
 *   const poller = new ScheduleStatusPoller({
 *     scheduleId: '0.0.5678',
 *     network: 'testnet',
 *     onPoll: (status) => setStatus(status),
 *     onTerminal: (status) => setDone(true),
 *   });
 *   poller.start();
 *   // later:
 *   poller.stop();
 */

// ── Types ──────────────────────────────────────────────────────────────────────

export type ScheduleState = 'PENDING' | 'EXECUTED' | 'DELETED';

export interface BrowserScheduleStatus {
  scheduleId: string;
  state: ScheduleState;
  executed: boolean;
  deleted: boolean;
  signaturesCollected: number;
  createdAt?: string;
  expiresAt?: string;
  memo?: string;
  network: string;
}

export interface BrowserSignatureEntry {
  publicKeyPrefix: string;
  type: string;
  consensusTimestamp?: string;
}

export interface BrowserScheduleSigners {
  scheduleId: string;
  state: ScheduleState;
  signaturesCollected: number;
  signatures: BrowserSignatureEntry[];
  network: string;
}

// ── Mirror Node response shape ─────────────────────────────────────────────────

interface MirrorResponse {
  schedule_id: string;
  executed_timestamp: string | null;
  deleted: boolean;
  memo?: string;
  consensus_timestamp?: string;
  expiration_time?: string;
  signatures?: Array<{
    consensus_timestamp?: string;
    public_key_prefix?: string;
    type?: string;
  }>;
}

const MIRROR_URLS: Record<string, string> = {
  mainnet: 'https://mainnet-public.mirrornode.hedera.com',
  testnet: 'https://testnet.mirrornode.hedera.com',
  previewnet: 'https://previewnet.mirrornode.hedera.com',
};

function deriveState(executedTimestamp: string | null, deleted: boolean): ScheduleState {
  if (executedTimestamp !== null && executedTimestamp !== undefined) return 'EXECUTED';
  if (deleted) return 'DELETED';
  return 'PENDING';
}

// ── Public helpers ─────────────────────────────────────────────────────────────

/**
 * Fetches the current status of a Hedera schedule from the public mirror node.
 * Works in any environment that has `fetch` (browser, Node 18+, Deno, Bun).
 */
export async function fetchScheduleStatus(
  scheduleId: string,
  network: 'mainnet' | 'testnet' | 'previewnet' = 'testnet',
): Promise<BrowserScheduleStatus> {
  const base = MIRROR_URLS[network] ?? MIRROR_URLS.testnet;
  const url = `${base}/api/v1/schedules/${scheduleId}`;

  const res = await fetch(url);

  if (res.status === 404) {
    throw new Error(`Schedule ${scheduleId} not found on ${network}`);
  }
  if (!res.ok) {
    throw new Error(`Mirror node returned HTTP ${res.status}`);
  }

  const data: MirrorResponse = (await res.json()) as MirrorResponse;
  const state = deriveState(data.executed_timestamp, Boolean(data.deleted));

  return {
    scheduleId,
    state,
    executed: state === 'EXECUTED',
    deleted: state === 'DELETED',
    signaturesCollected: data.signatures?.length ?? 0,
    createdAt: data.consensus_timestamp
      ? new Date(Number(data.consensus_timestamp.split('.')[0]) * 1000).toISOString()
      : undefined,
    expiresAt: data.expiration_time
      ? new Date(Number(data.expiration_time.split('.')[0]) * 1000).toISOString()
      : undefined,
    memo: data.memo || undefined,
    network,
  };
}

/**
 * Fetches signer information for a schedule.
 */
export async function fetchScheduleSigners(
  scheduleId: string,
  network: 'mainnet' | 'testnet' | 'previewnet' = 'testnet',
): Promise<BrowserScheduleSigners> {
  const base = MIRROR_URLS[network] ?? MIRROR_URLS.testnet;
  const url = `${base}/api/v1/schedules/${scheduleId}`;

  const res = await fetch(url);

  if (res.status === 404) {
    throw new Error(`Schedule ${scheduleId} not found on ${network}`);
  }
  if (!res.ok) {
    throw new Error(`Mirror node returned HTTP ${res.status}`);
  }

  const data: MirrorResponse = (await res.json()) as MirrorResponse;
  const state = deriveState(data.executed_timestamp, Boolean(data.deleted));

  return {
    scheduleId,
    state,
    signaturesCollected: data.signatures?.length ?? 0,
    signatures: (data.signatures ?? []).map((s) => ({
      publicKeyPrefix: s.public_key_prefix ?? '',
      type: s.type ?? 'UNKNOWN',
      consensusTimestamp: s.consensus_timestamp,
    })),
    network,
  };
}

// ── ScheduleStatusPoller ───────────────────────────────────────────────────────

export interface ScheduleStatusPollerOptions {
  scheduleId: string;
  network?: 'mainnet' | 'testnet' | 'previewnet';
  /** Poll interval in milliseconds (default: 5000). */
  intervalMs?: number;
  /** Max time in milliseconds before auto-stopping (default: 3 600 000 = 1h). */
  timeoutMs?: number;
  /** Called after every successful poll. */
  onPoll?: (status: BrowserScheduleStatus) => void;
  /** Called when a terminal state (EXECUTED or DELETED) is reached. */
  onTerminal?: (status: BrowserScheduleStatus) => void;
  /** Called when the timeout elapses. */
  onTimeout?: () => void;
  /** Called when a fetch error occurs (poller continues unless you call stop()). */
  onError?: (error: Error) => void;
}

export class ScheduleStatusPoller {
  private readonly options: Required<Omit<ScheduleStatusPollerOptions, 'onPoll' | 'onTerminal' | 'onTimeout' | 'onError'>>
    & Pick<ScheduleStatusPollerOptions, 'onPoll' | 'onTerminal' | 'onTimeout' | 'onError'>;
  private timerId: ReturnType<typeof setTimeout> | null = null;
  private startedAt: number | null = null;
  private running = false;

  constructor(opts: ScheduleStatusPollerOptions) {
    this.options = {
      scheduleId: opts.scheduleId,
      network: opts.network ?? 'testnet',
      intervalMs: opts.intervalMs ?? 5_000,
      timeoutMs: opts.timeoutMs ?? 3_600_000,
      onPoll: opts.onPoll,
      onTerminal: opts.onTerminal,
      onTimeout: opts.onTimeout,
      onError: opts.onError,
    };
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.startedAt = Date.now();
    this.schedule();
  }

  stop(): void {
    this.running = false;
    if (this.timerId !== null) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  private schedule(): void {
    this.timerId = setTimeout(() => {
      this.poll().catch(() => {/* already handled in poll() */});
    }, this.options.intervalMs);
  }

  private async poll(): Promise<void> {
    if (!this.running) return;

    const elapsed = Date.now() - (this.startedAt ?? Date.now());
    if (elapsed >= this.options.timeoutMs) {
      this.stop();
      this.options.onTimeout?.();
      return;
    }

    try {
      const status = await fetchScheduleStatus(
        this.options.scheduleId,
        this.options.network,
      );

      this.options.onPoll?.(status);

      if (status.state === 'EXECUTED' || status.state === 'DELETED') {
        this.stop();
        this.options.onTerminal?.(status);
        return;
      }
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.options.onError?.(error);
    }

    if (this.running) {
      this.schedule();
    }
  }
}
