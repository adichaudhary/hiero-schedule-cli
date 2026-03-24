import type { CommandHandlerArgs } from '@/core';

import { Status } from '@/core/shared/constants';

import { getScheduleSigners } from '../../commands/signers/handler';
import type { SignersOutput } from '../../commands/signers/output';

const mockFetch = jest.fn();
global.fetch = mockFetch;

const makeLogger = () => ({
  info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn(),
});

function makeArgs(scheduleId = '0.0.9000'): CommandHandlerArgs {
  return {
    args: { 'schedule-id': scheduleId },
    api: {
      network: {
        getCurrentNetwork: jest.fn().mockReturnValue('testnet'),
        getNetworkConfig: jest.fn().mockReturnValue({
          mirrorNodeUrl: 'https://testnet.mirrornode.hedera.com',
        }),
      },
    } as unknown as CommandHandlerArgs['api'],
    logger: makeLogger(),
    state: {} as CommandHandlerArgs['state'],
    config: {} as CommandHandlerArgs['config'],
  };
}

describe('schedule:signers handler', () => {
  beforeEach(() => jest.clearAllMocks());

  test('returns PENDING state with zero signatures when none collected', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true, status: 200,
      json: jest.fn().mockResolvedValue({
        schedule_id: '0.0.9000',
        executed_timestamp: null,
        deleted: false,
        signatures: [],
      }),
    });

    const result = await getScheduleSigners(makeArgs());
    expect(result.status).toBe(Status.Success);
    const output: SignersOutput = JSON.parse(result.outputJson!);
    expect(output.state).toBe('PENDING');
    expect(output.signaturesCollected).toBe(0);
    expect(output.signatures).toEqual([]);
  });

  test('returns signatures with publicKeyPrefix and type', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true, status: 200,
      json: jest.fn().mockResolvedValue({
        schedule_id: '0.0.9000',
        executed_timestamp: null,
        deleted: false,
        signatures: [
          { public_key_prefix: 'abcd1234', type: 'ED25519', consensus_timestamp: '1700000001.0' },
        ],
      }),
    });

    const result = await getScheduleSigners(makeArgs());
    const output: SignersOutput = JSON.parse(result.outputJson!);
    expect(output.signaturesCollected).toBe(1);
    expect(output.signatures[0]!.publicKeyPrefix).toBe('abcd1234');
    expect(output.signatures[0]!.type).toBe('ED25519');
  });

  test('returns EXECUTED when executed_timestamp is set', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true, status: 200,
      json: jest.fn().mockResolvedValue({
        schedule_id: '0.0.9000',
        executed_timestamp: '1700001000.0',
        deleted: false,
        signatures: [{ public_key_prefix: 'ff', type: 'ED25519' }],
      }),
    });

    const result = await getScheduleSigners(makeArgs());
    const output: SignersOutput = JSON.parse(result.outputJson!);
    expect(output.state).toBe('EXECUTED');
  });

  test('returns Failure on 404', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404, json: jest.fn() });
    const result = await getScheduleSigners(makeArgs());
    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toContain('not found');
  });

  test('throws ZodError when schedule-id is missing', async () => {
    const args = { ...makeArgs(), args: {} };
    await expect(getScheduleSigners(args)).rejects.toThrow();
  });
});
