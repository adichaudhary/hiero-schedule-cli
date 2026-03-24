/**
 * Unit tests for the SDK layer:
 *   - BackoffTimer
 *   - MirrorClient (failover + 404 handling)
 *   - ScheduleClient (getStatus, getSigners, createWatcher)
 *   - ScheduleWatcher (events)
 */

import { BackoffTimer, MirrorClient, MirrorClientError, defaultMirrorUrl } from '../../../../sdk/mirror-client';
import { ScheduleClient, ScheduleNotFoundError } from '../../../../sdk/schedule-client';
import { ScheduleWatcher } from '../../../../sdk/schedule-watcher';
import { ScheduleState } from '../../lifecycle';

// ── BackoffTimer ───────────────────────────────────────────────────────────────

describe('BackoffTimer', () => {
  test('doubles delay up to max', () => {
    const bt = new BackoffTimer({ initialMs: 100, maxMs: 400, multiplier: 2 });
    expect(bt.next()).toBe(100);
    expect(bt.next()).toBe(200);
    expect(bt.next()).toBe(400);
    expect(bt.next()).toBe(400); // capped
  });

  test('reset() restores initial delay', () => {
    const bt = new BackoffTimer({ initialMs: 100, maxMs: 1000, multiplier: 2 });
    bt.next();
    bt.next();
    bt.reset();
    expect(bt.next()).toBe(100);
  });

  test('defaults: 500ms initial, 30s max, 2x multiplier', () => {
    const bt = new BackoffTimer();
    expect(bt.next()).toBe(500);
    expect(bt.next()).toBe(1000);
  });
});

// ── defaultMirrorUrl ───────────────────────────────────────────────────────────

describe('defaultMirrorUrl', () => {
  test('returns testnet URL for testnet', () => {
    expect(defaultMirrorUrl('testnet')).toContain('testnet');
  });
  test('returns mainnet URL for mainnet', () => {
    expect(defaultMirrorUrl('mainnet')).toContain('mainnet');
  });
});

// ── MirrorClient ───────────────────────────────────────────────────────────────

function makeMirrorData(overrides: Record<string, unknown> = {}) {
  return {
    schedule_id: '0.0.9000',
    executed_timestamp: null,
    deleted: false,
    memo: 'test',
    signatures: [],
    ...overrides,
  };
}

describe('MirrorClient', () => {
  let fetchMock: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('returns parsed data on 200', async () => {
    const data = makeMirrorData();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => data,
    } as Response);

    const client = new MirrorClient({ urls: ['https://mirror.example.com'] });
    const result = await client.getSchedule('0.0.9000');
    expect(result).toEqual(data);
  });

  test('returns null on 404', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 404, json: async () => ({}) } as Response);
    const client = new MirrorClient({ urls: ['https://mirror.example.com'] });
    const result = await client.getSchedule('0.0.9999');
    expect(result).toBeNull();
  });

  test('tries next URL on 5xx and succeeds', async () => {
    const data = makeMirrorData();
    fetchMock
      .mockResolvedValueOnce({ ok: false, status: 503, json: async () => ({}) } as Response)
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => data } as Response);

    const client = new MirrorClient({
      urls: ['https://mirror-a.example.com', 'https://mirror-b.example.com'],
    });
    const result = await client.getSchedule('0.0.9000');
    expect(result).toEqual(data);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  test('throws MirrorClientError when all URLs fail', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 503, json: async () => ({}) } as Response);
    const client = new MirrorClient({ urls: ['https://a.example.com', 'https://b.example.com'] });
    await expect(client.getSchedule('0.0.9000')).rejects.toBeInstanceOf(MirrorClientError);
  });
});

// ── ScheduleClient ─────────────────────────────────────────────────────────────

describe('ScheduleClient', () => {
  let fetchMock: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock;
  });

  function mockMirror(data: Record<string, unknown> | null, status = 200) {
    if (data === null) {
      fetchMock.mockResolvedValueOnce({ ok: false, status: 404, json: async () => ({}) } as Response);
    } else {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status,
        json: async () => data,
      } as Response);
    }
  }

  test('getStatus returns PENDING for unexecuted schedule', async () => {
    mockMirror(makeMirrorData());
    const client = new ScheduleClient({ network: 'testnet' });
    const result = await client.getStatus('0.0.9000');
    expect(result.state).toBe(ScheduleState.PENDING);
    expect(result.executed).toBe(false);
    expect(result.deleted).toBe(false);
  });

  test('getStatus returns EXECUTED when executed_timestamp is set', async () => {
    mockMirror(makeMirrorData({ executed_timestamp: '1700000000.000000000' }));
    const client = new ScheduleClient({ network: 'testnet' });
    const result = await client.getStatus('0.0.9000');
    expect(result.state).toBe(ScheduleState.EXECUTED);
    expect(result.executed).toBe(true);
  });

  test('getStatus throws ScheduleNotFoundError on 404', async () => {
    mockMirror(null);
    const client = new ScheduleClient({ network: 'testnet' });
    await expect(client.getStatus('0.0.9999')).rejects.toBeInstanceOf(ScheduleNotFoundError);
  });

  test('getSigners returns signature list', async () => {
    mockMirror(makeMirrorData({
      signatures: [
        { public_key_prefix: 'abc', type: 'ED25519', consensus_timestamp: '1700000001.0' },
      ],
    }));
    const client = new ScheduleClient({ network: 'testnet' });
    const result = await client.getSigners('0.0.9000');
    expect(result.signaturesCollected).toBe(1);
    expect(result.signatures[0]!.publicKeyPrefix).toBe('abc');
    expect(result.signatures[0]!.type).toBe('ED25519');
  });

  test('createWatcher returns a ScheduleWatcher', () => {
    const client = new ScheduleClient({ network: 'testnet' });
    const watcher = client.createWatcher('0.0.9000');
    expect(watcher).toBeInstanceOf(ScheduleWatcher);
  });
});

// ── ScheduleWatcher ────────────────────────────────────────────────────────────

describe('ScheduleWatcher', () => {
  let fetchMock: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    jest.useFakeTimers();
    fetchMock = jest.fn();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function buildMirrorClient(url = 'https://mirror.example.com') {
    return new MirrorClient({ urls: [url], fetchTimeoutMs: 5000 });
  }

  test('emits executed event when schedule is executed', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => makeMirrorData({ executed_timestamp: '1700000001.0' }),
    } as Response);

    const mirrorClient = buildMirrorClient();
    const watcher = new ScheduleWatcher({
      scheduleId: '0.0.9000',
      mirrorClient,
      pollIntervalSeconds: 1,
      timeoutSeconds: 60,
    });

    const executedHandler = jest.fn();
    watcher.on('executed', executedHandler);

    const startPromise = watcher.start();
    jest.runAllTimersAsync().catch(() => {});
    await startPromise;

    expect(executedHandler).toHaveBeenCalledTimes(1);
    expect(executedHandler.mock.calls[0]![0].finalState).toBe(ScheduleState.EXECUTED);
  });

  test('emits timeout event when timeout elapses without terminal state', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => makeMirrorData(), // always PENDING
    } as Response);

    const mirrorClient = buildMirrorClient();
    const watcher = new ScheduleWatcher({
      scheduleId: '0.0.9000',
      mirrorClient,
      pollIntervalSeconds: 1,
      timeoutSeconds: 0, // immediate timeout
    });

    const timeoutHandler = jest.fn();
    watcher.on('timeout', timeoutHandler);

    await watcher.start();

    expect(timeoutHandler).toHaveBeenCalledTimes(1);
  });

  test('emits error event on MirrorClientError', async () => {
    fetchMock.mockRejectedValue(new Error('network failure'));

    const mirrorClient = buildMirrorClient();
    const watcher = new ScheduleWatcher({
      scheduleId: '0.0.9000',
      mirrorClient,
      pollIntervalSeconds: 1,
      timeoutSeconds: 60,
    });

    const errorHandler = jest.fn();
    watcher.on('error', errorHandler);

    await watcher.start();

    expect(errorHandler).toHaveBeenCalledTimes(1);
  });

  test('waitForTerminal resolves on executed', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => makeMirrorData({ executed_timestamp: '1700000001.0' }),
    } as Response);

    const mirrorClient = buildMirrorClient();
    const watcher = new ScheduleWatcher({
      scheduleId: '0.0.9000',
      mirrorClient,
      pollIntervalSeconds: 0,
      timeoutSeconds: 60,
    });

    const result = await watcher.waitForTerminal();
    expect((result as { finalState: string }).finalState).toBe(ScheduleState.EXECUTED);
  });
});
