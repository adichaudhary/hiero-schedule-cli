/**
 * schedule:recurring command handler — Recurring Scheduler Engine
 *
 * Creates N scheduled HBAR transfers upfront with staggered expiry windows,
 * simulating a recurring payment series.  All schedules are submitted in a
 * single CLI invocation; each requires the same set of signatures to execute.
 *
 * Payment N expires at: now + first-expiry-seconds + (N-1) × interval-seconds.
 *
 * NOTE: Hedera does not natively support recurring transactions.  This command
 * pre-schedules all payments at once.  To automate execution, pipe the output
 * schedule IDs to schedule:cosign or schedule:sign once the required
 * signers are ready for each period.
 */
import type { CommandExecutionResult, CommandHandlerArgs } from '@/core';

import {
  Hbar,
  ScheduleCreateTransaction,
  Timestamp,
  TransferTransaction,
} from '@hashgraph/sdk';

import { Status } from '@/core/shared/constants';
import { formatError } from '@/core/utils/errors';

import { RecurringInputSchema } from './input';
import type { RecurringOutput, RecurringScheduleEntry } from './output';

export async function createRecurringSchedules(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { api, logger } = args;

  // ── 1. Validate inputs (outside try-catch — ADR-003) ──────────────────────
  const validArgs = RecurringInputSchema.parse(args.args);

  const network = api.network.getCurrentNetwork();
  const operator = api.network.getCurrentOperatorOrThrow();
  const nowSeconds = Math.floor(Date.now() / 1000);

  try {
    const schedules: RecurringScheduleEntry[] = [];

    for (let i = 0; i < validArgs.count; i++) {
      const expirySeconds =
        validArgs['first-expiry-seconds'] + i * validArgs['interval-seconds'];

      const baseMemo = validArgs.memo ?? '';
      const memo = `${baseMemo}${baseMemo ? ' ' : ''}(${i + 1} of ${validArgs.count})`;

      const innerTransfer = new TransferTransaction()
        .addHbarTransfer(validArgs.to, Hbar.fromTinybars(validArgs.amount))
        .addHbarTransfer(
          operator.accountId,
          Hbar.fromTinybars(`-${validArgs.amount}`),
        );

      const scheduleTx = new ScheduleCreateTransaction()
        .setScheduledTransaction(innerTransfer)
        .setExpirationTime(new Timestamp(nowSeconds + expirySeconds, 0))
        .setWaitForExpiry(true)
        .setScheduleMemo(memo);

      logger.info(
        `Creating schedule ${i + 1}/${validArgs.count}: ${validArgs.amount} tinybars → ${validArgs.to}, expires in ${expirySeconds}s …`,
      );

      const result = await api.txExecution.signAndExecute(scheduleTx);

      if (!result.success || !result.scheduleId) {
        return {
          status: Status.Failure,
          errorMessage:
            `Schedule ${i + 1}/${validArgs.count} failed. ` +
            (result.scheduleId ? '' : 'No scheduleId returned in receipt.'),
        };
      }

      schedules.push({
        index: i + 1,
        scheduleId: result.scheduleId,
        transactionId: result.transactionId,
        expirySeconds,
      });
    }

    const totalAmount = (
      BigInt(validArgs.amount) * BigInt(validArgs.count)
    ).toString();

    const output: RecurringOutput = {
      count: schedules.length,
      schedules,
      recipient: validArgs.to,
      amountTinybarsEach: validArgs.amount,
      totalAmountTinybars: totalAmount,
      network,
    };

    return {
      status: Status.Success,
      outputJson: JSON.stringify(output),
    };
  } catch (error: unknown) {
    return {
      status: Status.Failure,
      errorMessage: formatError('Failed to create recurring schedules', error),
    };
  }
}
