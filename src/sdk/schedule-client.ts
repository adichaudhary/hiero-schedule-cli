/**
 * ScheduleClient — programmatic JS/TS SDK for Hedera scheduled transactions.
 *
 * Designed to work completely without the hiero-cli infrastructure: no
 * CommandHandlerArgs, no PluginManifest.  Depends only on a MirrorClient
 * instance and the public schedule plugin types.
 *
 * Usage:
 *   const client = new ScheduleClient({ network: 'testnet' });
 *   const status = await client.getStatus('0.0.5678');
 *   const signers = await client.getSigners('0.0.5678');
 *   const watcher = client.createWatcher('0.0.5678', { timeoutSeconds: 300 });
 *   watcher.on('executed', (e) => console.log('executed!', e));
 *   await watcher.start();
 */

import { deriveScheduleState } from '../plugins/schedule/lifecycle';
import type { SignatureEntry } from '../plugins/schedule/commands/signers/output';
import { defaultMirrorUrl, MirrorClient } from './mirror-client';
import type { MirrorClientOptions } from './mirror-client';
import { ScheduleWatcher } from './schedule-watcher';
import type { ScheduleWatcherOptions } from './schedule-watcher';

// ── Public result types ────────────────────────────────────────────────────────

export interface ScheduleStatusResult {
  scheduleId: string;
  state: 'PENDING' | 'EXECUTED' | 'DELETED';
  executed: boolean;
  deleted: boolean;
  signaturesCollected: number;
  createdAt?: string;
  expiresAt?: string;
  memo?: string;
  network: string;
}

export interface ScheduleSignersResult {
  scheduleId: string;
  state: 'PENDING' | 'EXECUTED' | 'DELETED';
  signaturesCollected: number;
  signatures: SignatureEntry[];
  network: string;
}

// ── ScheduleClient ─────────────────────────────────────────────────────────────

export interface ScheduleClientOptions {
  /** Named Hedera network (used to select a default mirror URL). */
  network?: 'mainnet' | 'testnet' | 'previewnet';
  /**
   * Override mirror client configuration.  If omitted, a default MirrorClient
   * is constructed from the `network` option.
   */
  mirrorClient?: MirrorClient;
  mirrorClientOptions?: Omit<MirrorClientOptions, 'urls'>;
}

export class ScheduleClient {
  private readonly mirrorClient: MirrorClient;
  private readonly network: string;

  constructor(opts: ScheduleClientOptions = {}) {
    this.network = opts.network ?? 'testnet';

    if (opts.mirrorClient) {
      this.mirrorClient = opts.mirrorClient;
    } else {
      const mirrorUrl = defaultMirrorUrl(
        (this.network as 'mainnet' | 'testnet' | 'previewnet') ?? 'testnet',
      );
      this.mirrorClient = new MirrorClient({
        urls: [mirrorUrl],
        ...opts.mirrorClientOptions,
      });
    }
  }

  /**
   * Returns the current status of a schedule.
   * Throws `ScheduleNotFoundError` if the schedule does not exist on the mirror node.
   */
  async getStatus(scheduleId: string): Promise<ScheduleStatusResult> {
    const data = await this.mirrorClient.getSchedule(scheduleId);

    if (data === null) {
      throw new ScheduleNotFoundError(scheduleId, this.network);
    }

    const state = deriveScheduleState(data.executed_timestamp, Boolean(data.deleted));

    return {
      scheduleId,
      state,
      executed: data.executed_timestamp !== null && data.executed_timestamp !== undefined,
      deleted: Boolean(data.deleted),
      signaturesCollected: data.signatures?.length ?? 0,
      createdAt: data.consensus_timestamp
        ? new Date(Number(data.consensus_timestamp.split('.')[0]) * 1000).toISOString()
        : undefined,
      expiresAt: data.expiration_time
        ? new Date(Number(data.expiration_time.split('.')[0]) * 1000).toISOString()
        : undefined,
      memo: data.memo || undefined,
      network: this.network,
    };
  }

  /**
   * Returns all signatures collected so far for a schedule.
   * Throws `ScheduleNotFoundError` if the schedule does not exist.
   */
  async getSigners(scheduleId: string): Promise<ScheduleSignersResult> {
    const data = await this.mirrorClient.getSchedule(scheduleId);

    if (data === null) {
      throw new ScheduleNotFoundError(scheduleId, this.network);
    }

    const state = deriveScheduleState(data.executed_timestamp, Boolean(data.deleted));

    const signatures: SignatureEntry[] = (data.signatures ?? []).map((s) => ({
      publicKeyPrefix: s.public_key_prefix ?? '',
      type: s.type ?? 'UNKNOWN',
      consensusTimestamp: s.consensus_timestamp,
    }));

    return {
      scheduleId,
      state,
      signaturesCollected: signatures.length,
      signatures,
      network: this.network,
    };
  }

  /**
   * Creates a ScheduleWatcher for the given schedule.
   * The watcher is not started — call `.start()` or `.waitForTerminal()`.
   */
  createWatcher(
    scheduleId: string,
    opts?: Omit<ScheduleWatcherOptions, 'scheduleId' | 'mirrorClient'>,
  ): ScheduleWatcher {
    return new ScheduleWatcher({
      scheduleId,
      mirrorClient: this.mirrorClient,
      ...opts,
    });
  }
}

export class ScheduleNotFoundError extends Error {
  constructor(
    public readonly scheduleId: string,
    public readonly network: string,
  ) {
    super(`Schedule ${scheduleId} not found on ${network}`);
    this.name = 'ScheduleNotFoundError';
  }
}
