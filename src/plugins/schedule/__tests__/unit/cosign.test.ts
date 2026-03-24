import type { CommandHandlerArgs } from '@/core';
import type { TransactionResult } from '@/core/services/tx-execution/tx-execution-service.interface';

import { Status } from '@/core/shared/constants';

import { cosignSchedule } from '../../commands/cosign/handler';
import type { CosignOutput } from '../../commands/cosign/output';

const mockSignTx = { setScheduleId: jest.fn().mockReturnThis() };

jest.mock('@hashgraph/sdk', () => ({
  ScheduleSignTransaction: jest.fn().mockImplementation(() => mockSignTx),
}));

const makeLogger = () => ({
  info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn(),
});

function makeSignWith(success = true) {
  return jest.fn().mockResolvedValue({
    success,
    transactionId: '0.0.1001@1700000002.000000000',
    consensusTimestamp: '',
    receipt: { status: { status: 'success', transactionId: '' } },
  } as TransactionResult);
}

function makeArgs(signerKeys = 'key-alice,key-bob'): CommandHandlerArgs {
  return {
    args: { 'schedule-id': '0.0.9000', 'signer-keys': signerKeys },
    api: {
      network: {
        getCurrentNetwork: jest.fn().mockReturnValue('testnet'),
        getCurrentOperatorOrThrow: jest.fn().mockReturnValue({ accountId: '0.0.1001', keyRefId: 'op' }),
      },
      txExecution: { signAndExecuteWith: makeSignWith() },
    } as unknown as CommandHandlerArgs['api'],
    logger: makeLogger(),
    state: {} as CommandHandlerArgs['state'],
    config: {} as CommandHandlerArgs['config'],
  };
}

describe('schedule:cosign handler', () => {
  beforeEach(() => jest.clearAllMocks());

  test('returns Success with per-key results on happy path', async () => {
    const result = await cosignSchedule(makeArgs());
    expect(result.status).toBe(Status.Success);

    const output: CosignOutput = JSON.parse(result.outputJson!);
    expect(output.keysAttempted).toBe(2);
    expect(output.signaturesSubmitted).toBe(2);
    expect(output.results).toHaveLength(2);
    expect(output.results[0]!.keyRefId).toBe('key-alice');
    expect(output.results[1]!.keyRefId).toBe('key-bob');
  });

  test('reports partial failure without aborting remaining keys', async () => {
    const signWith = jest.fn()
      .mockResolvedValueOnce({
        success: false, transactionId: '', consensusTimestamp: '',
        receipt: { status: { status: 'failed', transactionId: '' } },
      } as TransactionResult)
      .mockResolvedValueOnce({
        success: true, transactionId: '0.0.1001@1700000002.000000000', consensusTimestamp: '',
        receipt: { status: { status: 'success', transactionId: '' } },
      } as TransactionResult);

    const args = makeArgs();
    (args.api.txExecution as unknown as { signAndExecuteWith: jest.Mock }).signAndExecuteWith = signWith;

    const result = await cosignSchedule(args);

    expect(result.status).toBe(Status.Success);
    const output: CosignOutput = JSON.parse(result.outputJson!);
    expect(output.signaturesSubmitted).toBe(1);
    expect(output.keysAttempted).toBe(2);
    expect(output.results[0]!.success).toBe(false);
    expect(output.results[1]!.success).toBe(true);
  });

  test('throws ZodError when schedule-id is missing', async () => {
    const args = { ...makeArgs(), args: { 'signer-keys': 'key-a' } };
    await expect(cosignSchedule(args)).rejects.toThrow();
  });

  test('throws ZodError when signer-keys is missing', async () => {
    const args = { ...makeArgs(), args: { 'schedule-id': '0.0.9000' } };
    await expect(cosignSchedule(args)).rejects.toThrow();
  });
});
