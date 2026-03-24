import type { CommandHandlerArgs } from '@/core';
import type { TransactionResult } from '@/core/services/tx-execution/tx-execution-service.interface';

import { Status } from '@/core/shared/constants';

import { createRecurringSchedules } from '../../commands/recurring/handler';
import type { RecurringOutput } from '../../commands/recurring/output';

const mockInnerTx = { addHbarTransfer: jest.fn().mockReturnThis() };
const mockScheduleTx = {
  setScheduledTransaction: jest.fn().mockReturnThis(),
  setExpirationTime: jest.fn().mockReturnThis(),
  setWaitForExpiry: jest.fn().mockReturnThis(),
  setScheduleMemo: jest.fn().mockReturnThis(),
};

jest.mock('@hashgraph/sdk', () => ({
  Hbar: { fromTinybars: jest.fn().mockReturnValue({}) },
  Timestamp: jest.fn().mockImplementation(() => ({})),
  TransferTransaction: jest.fn().mockImplementation(() => mockInnerTx),
  ScheduleCreateTransaction: jest.fn().mockImplementation(() => mockScheduleTx),
}));

const makeLogger = () => ({
  info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn(),
});

let callCount = 0;

function makeSignMock() {
  callCount = 0;
  return jest.fn().mockImplementation(() => {
    callCount++;
    return Promise.resolve({
      success: true,
      scheduleId: `0.0.${9000 + callCount}`,
      transactionId: `0.0.1001@170000000${callCount}.000000000`,
      consensusTimestamp: '',
      receipt: { status: { status: 'success', transactionId: '' } },
    } as TransactionResult);
  });
}

function makeArgs(argOverrides: Record<string, unknown> = {}): CommandHandlerArgs {
  return {
    args: {
      to: '0.0.2002',
      amount: '10000000',
      count: 3,
      'interval-seconds': 100,
      'first-expiry-seconds': 200,
      ...argOverrides,
    },
    api: {
      network: {
        getCurrentNetwork: jest.fn().mockReturnValue('testnet'),
        getCurrentOperatorOrThrow: jest.fn().mockReturnValue({ accountId: '0.0.1001', keyRefId: 'op' }),
      },
      txExecution: { signAndExecute: makeSignMock() },
    } as unknown as CommandHandlerArgs['api'],
    logger: makeLogger(),
    state: {} as CommandHandlerArgs['state'],
    config: {} as CommandHandlerArgs['config'],
  };
}

describe('schedule:recurring handler', () => {
  beforeEach(() => jest.clearAllMocks());

  test('creates count schedules and returns all schedule IDs', async () => {
    const args = makeArgs();

    const result = await createRecurringSchedules(args);

    expect(result.status).toBe(Status.Success);
    const output: RecurringOutput = JSON.parse(result.outputJson!);
    expect(output.count).toBe(3);
    expect(output.schedules).toHaveLength(3);
    expect(output.schedules[0]!.index).toBe(1);
    expect(output.schedules[2]!.index).toBe(3);
  });

  test('totalAmountTinybars = count × amount', async () => {
    const result = await createRecurringSchedules(makeArgs({ count: 3, amount: '10000000' }));
    const output: RecurringOutput = JSON.parse(result.outputJson!);
    expect(output.totalAmountTinybars).toBe('30000000');
  });

  test('each schedule has staggered expiry', async () => {
    const result = await createRecurringSchedules(
      makeArgs({ count: 3, 'first-expiry-seconds': 1000, 'interval-seconds': 500 }),
    );
    const output: RecurringOutput = JSON.parse(result.outputJson!);
    expect(output.schedules[0]!.expirySeconds).toBe(1000);
    expect(output.schedules[1]!.expirySeconds).toBe(1500);
    expect(output.schedules[2]!.expirySeconds).toBe(2000);
  });

  test('returns Failure when a schedule creation fails', async () => {
    const args = makeArgs({ count: 2 });
    (args.api.txExecution as unknown as { signAndExecute: jest.Mock }).signAndExecute = jest
      .fn()
      .mockResolvedValueOnce({
        success: true,
        scheduleId: '0.0.9001',
        transactionId: '0.0.1001@1.0',
        consensusTimestamp: '',
        receipt: { status: { status: 'success', transactionId: '' } },
      } as TransactionResult)
      .mockResolvedValueOnce({
        success: false,
        scheduleId: undefined,
        transactionId: '',
        consensusTimestamp: '',
        receipt: { status: { status: 'failed', transactionId: '' } },
      } as TransactionResult);

    const result = await createRecurringSchedules(args);
    expect(result.status).toBe(Status.Failure);
  });

  test('throws ZodError when required args are missing', async () => {
    const args = { ...makeArgs(), args: {} };
    await expect(createRecurringSchedules(args)).rejects.toThrow();
  });
});
