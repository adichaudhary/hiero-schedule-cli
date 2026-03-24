/**
 * schedule:cosign command handler — Multi-Signature Coordination Layer
 *
 * Accepts a comma-separated list of key reference IDs and submits a separate
 * ScheduleSignTransaction for each one.  This lets a single CLI invocation
 * coordinate multi-party signing when the operator holds multiple keys
 * (e.g., treasury + admin + escrow-agent).
 *
 * All keys are attempted even when one fails; partial success is reported
 * in the structured output so the caller can retry individual keys.
 */
import type { CommandExecutionResult, CommandHandlerArgs } from '@/core';

import { Status } from '@/core/shared/constants';
import { formatError } from '@/core/utils/errors';
import { collectSignatures } from '../../utils/collect-signatures';

import { CosignInputSchema } from './input';
import type { CosignOutput } from './output';

export async function cosignSchedule(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { api, logger } = args;

  // ── 1. Validate inputs (outside try-catch — ADR-003) ──────────────────────
  const validArgs = CosignInputSchema.parse(args.args);
  const scheduleId = validArgs['schedule-id'];
  const keyRefIds = validArgs['signer-keys']
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean);

  const network = api.network.getCurrentNetwork();

  try {
    logger.info(
      `Submitting signatures for ${scheduleId} with ${keyRefIds.length} key(s): ${keyRefIds.join(', ')} …`,
    );

    const collected = await collectSignatures(
      scheduleId,
      keyRefIds,
      api.txExecution,
    );

    const output: CosignOutput = {
      scheduleId,
      signaturesSubmitted: collected.signaturesSubmitted,
      keysAttempted: collected.keysAttempted,
      results: collected.results,
      network,
    };

    // Return Success even on partial failure — the structured output carries
    // per-key error detail so the caller can act on individual failures.
    return {
      status: Status.Success,
      outputJson: JSON.stringify(output),
    };
  } catch (error: unknown) {
    return {
      status: Status.Failure,
      errorMessage: formatError(`Failed to cosign schedule ${scheduleId}`, error),
    };
  }
}
