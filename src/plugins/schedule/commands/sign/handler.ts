/**
 * schedule:sign command handler
 *
 * Submits a ScheduleSignTransaction to add the operator's signature to an
 * existing on-chain schedule.  Once all required signatures are collected the
 * network will automatically execute the scheduled inner transaction.
 */
import type {
  CommandExecutionResult,
  CommandHandlerArgs,
} from '@/core';

import { ScheduleSignTransaction } from '@hashgraph/sdk';

import { Status } from '@/core/shared/constants';
import { formatError } from '@/core/utils/errors';

import { SignInputSchema } from './input';
import type { SignOutput } from './output';

export async function signSchedule(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { api, logger } = args;

  // ── 1. Validate inputs (outside try-catch — ADR-003) ──────────────────────
  const validArgs = SignInputSchema.parse(args.args);
  const scheduleId = validArgs['schedule-id'];

  const network = api.network.getCurrentNetwork();
  const operator = api.network.getCurrentOperatorOrThrow();

  try {
    logger.info(`Signing schedule ${scheduleId} on ${network} with operator ${operator.accountId} …`);

    // ── 2. Build the sign transaction ─────────────────────────────────────────
    const signTx = new ScheduleSignTransaction()
      .setScheduleId(scheduleId);

    // ── 3. Sign and submit via CoreAPI ────────────────────────────────────────
    const result = await api.txExecution.signAndExecute(signTx);

    if (!result.success) {
      return {
        status: Status.Failure,
        errorMessage:
          'ScheduleSignTransaction was submitted but the network returned a non-success status.',
      };
    }

    // ── 4. Return structured output ───────────────────────────────────────────
    const output: SignOutput = {
      scheduleId,
      transactionId: result.transactionId,
      signer: operator.accountId,
      network,
    };

    return {
      status: Status.Success,
      outputJson: JSON.stringify(output),
    };
  } catch (error: unknown) {
    return {
      status: Status.Failure,
      errorMessage: formatError(`Failed to sign schedule ${scheduleId}`, error),
    };
  }
}
