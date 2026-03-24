/**
 * Signature collection utility — signs an existing schedule with one or more
 * key references in sequence.
 *
 * Each key submits its own ScheduleSignTransaction.  All keys are attempted
 * even when an earlier one fails; per-key results are captured individually so
 * the caller can report partial progress.
 */
import { ScheduleSignTransaction } from '@hashgraph/sdk';

import type {
  TransactionResult,
  TxExecutionService,
} from '@/core/services/tx-execution/tx-execution-service.interface';

export interface SignatureCollectionEntry {
  keyRefId: string;
  transactionId: string;
  success: boolean;
  error?: string;
}

export interface CollectSignaturesResult {
  scheduleId: string;
  /** Number of keys that signed successfully. */
  signaturesSubmitted: number;
  /** Total keys attempted. */
  keysAttempted: number;
  results: SignatureCollectionEntry[];
}

/**
 * Signs the given schedule with each `keyRefId` in the supplied array.
 *
 * A separate `ScheduleSignTransaction` is submitted per key so that failures
 * are isolated.  The caller decides whether to surface per-key errors or only
 * the aggregate count.
 */
export async function collectSignatures(
  scheduleId: string,
  keyRefIds: string[],
  txExecution: TxExecutionService,
): Promise<CollectSignaturesResult> {
  const results: SignatureCollectionEntry[] = [];
  let signaturesSubmitted = 0;

  for (const keyRefId of keyRefIds) {
    try {
      const signTx = new ScheduleSignTransaction().setScheduleId(scheduleId);

      // signAndExecuteWith signs the transaction with the given key reference
      // before submitting — ScheduleSignTransaction extends Transaction (HederaTransaction).
      const result: TransactionResult = await txExecution.signAndExecuteWith(
        signTx as Parameters<TxExecutionService['signAndExecuteWith']>[0],
        [keyRefId],
      );

      results.push({
        keyRefId,
        transactionId: result.transactionId,
        success: result.success,
        error: result.success ? undefined : 'Network returned non-success receipt',
      });

      if (result.success) signaturesSubmitted++;
    } catch (err: unknown) {
      results.push({
        keyRefId,
        transactionId: '',
        success: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return {
    scheduleId,
    signaturesSubmitted,
    keysAttempted: keyRefIds.length,
    results,
  };
}
