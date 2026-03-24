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
const MIRROR_URLS = {
    mainnet: 'https://mainnet-public.mirrornode.hedera.com',
    testnet: 'https://testnet.mirrornode.hedera.com',
    previewnet: 'https://previewnet.mirrornode.hedera.com',
};
function deriveState(executedTimestamp, deleted) {
    if (executedTimestamp !== null && executedTimestamp !== undefined)
        return 'EXECUTED';
    if (deleted)
        return 'DELETED';
    return 'PENDING';
}
// ── Public helpers ─────────────────────────────────────────────────────────────
/**
 * Fetches the current status of a Hedera schedule from the public mirror node.
 * Works in any environment that has `fetch` (browser, Node 18+, Deno, Bun).
 */
export async function fetchScheduleStatus(scheduleId, network = 'testnet') {
    const base = MIRROR_URLS[network] ?? MIRROR_URLS.testnet;
    const url = `${base}/api/v1/schedules/${scheduleId}`;
    const res = await fetch(url);
    if (res.status === 404) {
        throw new Error(`Schedule ${scheduleId} not found on ${network}`);
    }
    if (!res.ok) {
        throw new Error(`Mirror node returned HTTP ${res.status}`);
    }
    const data = (await res.json());
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
export async function fetchScheduleSigners(scheduleId, network = 'testnet') {
    const base = MIRROR_URLS[network] ?? MIRROR_URLS.testnet;
    const url = `${base}/api/v1/schedules/${scheduleId}`;
    const res = await fetch(url);
    if (res.status === 404) {
        throw new Error(`Schedule ${scheduleId} not found on ${network}`);
    }
    if (!res.ok) {
        throw new Error(`Mirror node returned HTTP ${res.status}`);
    }
    const data = (await res.json());
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
export class ScheduleStatusPoller {
    constructor(opts) {
        this.timerId = null;
        this.startedAt = null;
        this.running = false;
        this.options = {
            scheduleId: opts.scheduleId,
            network: opts.network ?? 'testnet',
            intervalMs: opts.intervalMs ?? 5000,
            timeoutMs: opts.timeoutMs ?? 3600000,
            onPoll: opts.onPoll,
            onTerminal: opts.onTerminal,
            onTimeout: opts.onTimeout,
            onError: opts.onError,
        };
    }
    start() {
        if (this.running)
            return;
        this.running = true;
        this.startedAt = Date.now();
        this.schedule();
    }
    stop() {
        this.running = false;
        if (this.timerId !== null) {
            clearTimeout(this.timerId);
            this.timerId = null;
        }
    }
    schedule() {
        this.timerId = setTimeout(() => {
            this.poll().catch(() => { });
        }, this.options.intervalMs);
    }
    async poll() {
        if (!this.running)
            return;
        const elapsed = Date.now() - (this.startedAt ?? Date.now());
        if (elapsed >= this.options.timeoutMs) {
            this.stop();
            this.options.onTimeout?.();
            return;
        }
        try {
            const status = await fetchScheduleStatus(this.options.scheduleId, this.options.network);
            this.options.onPoll?.(status);
            if (status.state === 'EXECUTED' || status.state === 'DELETED') {
                this.stop();
                this.options.onTerminal?.(status);
                return;
            }
        }
        catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            this.options.onError?.(error);
        }
        if (this.running) {
            this.schedule();
        }
    }
}
