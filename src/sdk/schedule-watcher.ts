/**
 * ScheduleWatcher — typed EventEmitter that polls a Hedera schedule until it
 * reaches a terminal state or a timeout elapses.
 *
 * Events emitted:
 *   poll     — fired after each mirror-node check (current state)
 *   executed — schedule was executed on-chain
 *   deleted  — schedule was deleted before execution
 *   timeout  — watch window elapsed with no terminal state
 *   error    — unrecoverable error (mirror client exhausted all URLs)
 *
 * Usage:
 *   const watcher = new ScheduleWatcher({ scheduleId: '0.0.5678', mirrorClient });
 *   watcher.on('executed', (e) => console.log('done!', e));
 *   watcher.on('poll', (e) => console.log('still pending after', e.elapsedSeconds, 's'));
 *   await watcher.start();
 */

import { EventEmitter } from 'events';

import { deriveScheduleState, isTerminal, ScheduleState } from '../plugins/schedule/lifecycle';
import type { BackoffOptions } from './mirror-client';
import { BackoffTimer, MirrorClient } from './mirror-client';

// ── Event payload types ────────────────────────────────────────────────────────

export interface WatcherPollEvent {
  scheduleId: string;
  state: ScheduleState;
  elapsedSeconds: number;
  pollCount: number;
}

export interface WatcherTerminalEvent {
  scheduleId: string;
  finalState: ScheduleState.EXECUTED | ScheduleState.DELETED;
  resolvedAt: string;
  elapsedSeconds: number;
}

export interface WatcherTimeoutEvent {
  scheduleId: string;
  elapsedSeconds: number;
  pollCount: number;
}

export interface WatcherErrorEvent {
  scheduleId: string;
  error: Error;
}

// ── Typed EventEmitter interface ───────────────────────────────────────────────

export interface ScheduleWatcherEvents {
  poll: (event: WatcherPollEvent) => void;
  executed: (event: WatcherTerminalEvent) => void;
  deleted: (event: WatcherTerminalEvent) => void;
  timeout: (event: WatcherTimeoutEvent) => void;
  error: (event: WatcherErrorEvent) => void;
}

// TypeScript augmentation so on/emit are typed
declare interface ScheduleWatcher {
  on<K extends keyof ScheduleWatcherEvents>(event: K, listener: ScheduleWatcherEvents[K]): this;
  off<K extends keyof ScheduleWatcherEvents>(event: K, listener: ScheduleWatcherEvents[K]): this;
  once<K extends keyof ScheduleWatcherEvents>(event: K, listener: ScheduleWatcherEvents[K]): this;
  emit<K extends keyof ScheduleWatcherEvents>(
    event: K,
    ...args: Parameters<ScheduleWatcherEvents[K]>
  ): boolean;
}

// ── ScheduleWatcher ────────────────────────────────────────────────────────────

export interface ScheduleWatcherOptions {
  scheduleId: string;
  mirrorClient: MirrorClient;
  /**
   * Seconds between polls (default: 3).
   * When using backoff, this becomes the initial delay.
   */
  pollIntervalSeconds?: number;
  /** Maximum seconds to wait before emitting 'timeout' (default: 3600). */
  timeoutSeconds?: number;
  /** Enable exponential backoff instead of fixed-interval polling. */
  backoff?: BackoffOptions;
}

class ScheduleWatcher extends EventEmitter {
  private readonly scheduleId: string;
  private readonly mirrorClient: MirrorClient;
  private readonly timeoutMs: number;
  private readonly backoffTimer: BackoffTimer | null;
  private readonly fixedPollMs: number;
  private running = false;

  constructor(opts: ScheduleWatcherOptions) {
    super();
    this.scheduleId = opts.scheduleId;
    this.mirrorClient = opts.mirrorClient;
    this.timeoutMs = (opts.timeoutSeconds ?? 3600) * 1000;
    this.fixedPollMs = (opts.pollIntervalSeconds ?? 3) * 1000;
    this.backoffTimer = opts.backoff
      ? new BackoffTimer({
          initialMs: this.fixedPollMs,
          ...opts.backoff,
        })
      : null;
  }

  /**
   * Starts polling.  Resolves when a terminal event or timeout fires.
   * All events are emitted on `this` before the promise settles.
   */
  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;

    const startTime = Date.now();
    let pollCount = 0;

    const elapsed = (): number => Math.round((Date.now() - startTime) / 1000);
    const sleep = (ms: number): Promise<void> =>
      new Promise((resolve) => setTimeout(resolve, ms));

    while (true) {
      if (Date.now() - startTime >= this.timeoutMs) {
        this.emit('timeout', {
          scheduleId: this.scheduleId,
          elapsedSeconds: elapsed(),
          pollCount,
        });
        break;
      }

      try {
        const data = await this.mirrorClient.getSchedule(this.scheduleId);

        if (data !== null) {
          pollCount++;
          const state = deriveScheduleState(data.executed_timestamp, Boolean(data.deleted));

          this.emit('poll', {
            scheduleId: this.scheduleId,
            state,
            elapsedSeconds: elapsed(),
            pollCount,
          });

          if (isTerminal(state)) {
            const terminalEvent: WatcherTerminalEvent = {
              scheduleId: this.scheduleId,
              finalState: state as ScheduleState.EXECUTED | ScheduleState.DELETED,
              resolvedAt: new Date().toISOString(),
              elapsedSeconds: elapsed(),
            };

            if (state === ScheduleState.EXECUTED) {
              this.emit('executed', terminalEvent);
            } else {
              this.emit('deleted', terminalEvent);
            }
            break;
          }
        }
      } catch (err: unknown) {
        const error = err instanceof Error ? err : new Error(String(err));
        this.emit('error', { scheduleId: this.scheduleId, error });
        break;
      }

      const delay = this.backoffTimer ? this.backoffTimer.next() : this.fixedPollMs;
      await sleep(delay);
    }

    this.running = false;
  }

  /** Convenience method — resolves to the terminal event (or timeout/error). */
  waitForTerminal(): Promise<WatcherTerminalEvent | WatcherTimeoutEvent> {
    return new Promise((resolve, reject) => {
      this.once('executed', resolve);
      this.once('deleted', resolve);
      this.once('timeout', resolve);
      this.once('error', (e: WatcherErrorEvent) => reject(e.error));
      this.start().catch(reject);
    });
  }
}

export { ScheduleWatcher };
