/**
 * schedule:signers command handler
 *
 * Fetches a scheduled transaction from the mirror node and reports all
 * signatures collected so far.  This is the observability layer of the
 * multi-signature coordination workflow — it shows who has signed and
 * implicitly who still needs to.
 */
import type { CommandExecutionResult, CommandHandlerArgs } from '@/core';

import { Status } from '@/core/shared/constants';
import { formatError } from '@/core/utils/errors';
import { deriveScheduleState } from '../../lifecycle';

import { SignersInputSchema } from './input';
import type { SignatureEntry, SignersOutput } from './output';

interface MirrorScheduleResponse {
  schedule_id: string;
  executed_timestamp: string | null;
  deleted: boolean;
  signatures?: Array<{
    consensus_timestamp?: string;
    public_key_prefix?: string;
    type?: string;
  }>;
}

export async function getScheduleSigners(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { api, logger } = args;

  const validArgs = SignersInputSchema.parse(args.args);
  const scheduleId = validArgs['schedule-id'];

  const network = api.network.getCurrentNetwork();
  const networkConfig = api.network.getNetworkConfig(network);
  const mirrorBase = networkConfig.mirrorNodeUrl.replace(/\/$/, '');
  const url = `${mirrorBase}/api/v1/schedules/${scheduleId}`;

  try {
    logger.info(`Fetching signature status for ${scheduleId} …`);

    const response = await fetch(url);

    if (response.status === 404) {
      return {
        status: Status.Failure,
        errorMessage: `Schedule ${scheduleId} not found on ${network}.`,
      };
    }

    if (!response.ok) {
      return {
        status: Status.Failure,
        errorMessage: `Mirror node returned HTTP ${response.status} for ${url}`,
      };
    }

    const data: MirrorScheduleResponse =
      (await response.json()) as MirrorScheduleResponse;

    const state = deriveScheduleState(data.executed_timestamp, Boolean(data.deleted));

    const signatures: SignatureEntry[] = (data.signatures ?? []).map((s) => ({
      publicKeyPrefix: s.public_key_prefix ?? '',
      type: s.type ?? 'UNKNOWN',
      consensusTimestamp: s.consensus_timestamp,
    }));

    const output: SignersOutput = {
      scheduleId,
      state,
      signaturesCollected: signatures.length,
      signatures,
      network,
    };

    return {
      status: Status.Success,
      outputJson: JSON.stringify(output),
    };
  } catch (error: unknown) {
    return {
      status: Status.Failure,
      errorMessage: formatError(
        `Failed to fetch signer info for ${scheduleId}`,
        error,
      ),
    };
  }
}
