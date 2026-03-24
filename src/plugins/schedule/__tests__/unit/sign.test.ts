/**
 * Unit tests for schedule:sign handler
 */
import type { CommandHandlerArgs } from '@/core';
import type { TransactionResult } from '@/core/services/tx-execution/tx-execution-service.interface';

import { Status } from '@/core/shared/constants';

import { signSchedule } from '../../commands/sign/handler';
import type { SignOutput } from '../../commands/sign/output';

// ── SDK mocks ─────────────────────────────────────────────────────────────────
const mockSignTx = {
  setScheduleId: jest.fn().mockReturnThis(),
};

jest.mock('@hashgraph/sdk', () => ({
  ScheduleSignTransaction: jest.fn().mockImplementation(() => mockSignTx),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

const makeLogger = () => ({
  info: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
});

const makeNetworkMock = (network = 'testnet') => ({
  getCurrentNetwork: jest.fn().mockReturnValue(network),
  getCurrentOperatorOrThrow: jest.fn().mockReturnValue({
    accountId: '0.0.1001',
    keyRefId: 'ref-operator',
  }),
  getNetworkConfig: jest.fn().mockReturnValue({
    mirrorNodeUrl: 'https://testnet.mirrornode.hedera.com',
  }),
});

const makeSigningMock = (
  overrides: Partial<TransactionResult> = {},
): jest.Mocked<{ signAndExecute: jest.Mock }> => ({
  signAndExecute: jest.fn().mockResolvedValue({
    success: true,
    transactionId: '0.0.1001@1700000001.000000000',
    consensusTimestamp: '2024-01-01T00:00:01.000Z',
    receipt: { status: { status: 'success', transactionId: '0.0.1001@1700000001.000000000' } },
    ...overrides,
  } as TransactionResult),
});

function makeArgs(
  apiOverrides: Record<string, unknown> = {},
  scheduleId = '0.0.9000',
): CommandHandlerArgs {
  return {
    args: { 'schedule-id': scheduleId },
    api: {
      network: makeNetworkMock(),
      txExecution: makeSigningMock(),
      ...apiOverrides,
    } as unknown as CommandHandlerArgs['api'],
    logger: makeLogger(),
    state: {} as CommandHandlerArgs['state'],
    config: {} as CommandHandlerArgs['config'],
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('schedule:sign handler', () => {
  beforeEach(() => jest.clearAllMocks());

  test('returns Success with correct output on happy path', async () => {
    const args = makeArgs();

    const result = await signSchedule(args);

    expect(result.status).toBe(Status.Success);
    expect(result.outputJson).toBeDefined();

    const output: SignOutput = JSON.parse(result.outputJson!);
    expect(output.scheduleId).toBe('0.0.9000');
    expect(output.transactionId).toBe('0.0.1001@1700000001.000000000');
    expect(output.signer).toBe('0.0.1001');
    expect(output.network).toBe('testnet');
  });

  test('calls setScheduleId with the provided schedule ID', async () => {
    await signSchedule(makeArgs({}, '0.0.5555'));

    expect(mockSignTx.setScheduleId).toHaveBeenCalledWith('0.0.5555');
  });

  test('returns Failure when signAndExecute reports success=false', async () => {
    const signing = makeSigningMock({ success: false });
    const args = makeArgs({ txExecution: signing });

    const result = await signSchedule(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toContain('non-success status');
  });

  test('returns Failure when signAndExecute throws', async () => {
    const signing = {
      signAndExecute: jest.fn().mockRejectedValue(new Error('SCHEDULE_DELETED')),
    };
    const args = makeArgs({ txExecution: signing });

    const result = await signSchedule(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toContain('SCHEDULE_DELETED');
  });

  test('throws ZodError when schedule-id is missing', async () => {
    const args = { ...makeArgs(), args: {} };
    await expect(signSchedule(args)).rejects.toThrow();
  });

  test('throws ZodError when schedule-id is not a valid entity ID', async () => {
    const args = makeArgs({}, 'not-an-entity-id');
    await expect(signSchedule(args)).rejects.toThrow();
  });
});
