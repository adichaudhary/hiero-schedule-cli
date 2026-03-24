/**
 * schedule:viz command handler
 *
 * Fetches a schedule from the mirror node and renders an ASCII timeline
 * showing the lifecycle states: CREATED → PENDING → EXECUTED | DELETED.
 */
import type { CommandExecutionResult, CommandHandlerArgs } from '@/core';

import { Status } from '@/core/shared/constants';
import { formatError } from '@/core/utils/errors';
import { deriveScheduleState, ScheduleState } from '../../lifecycle';

import { VizInputSchema } from './input';
import type { VizOutput } from './output';

interface MirrorScheduleResponse {
  schedule_id: string;
  executed_timestamp: string | null;
  deleted: boolean;
  memo?: string;
  consensus_timestamp?: string;
  expiration_time?: string;
  signatures?: Array<{ public_key_prefix?: string; type?: string }>;
}

/** Renders an ASCII lifecycle timeline for a Hedera scheduled transaction. */
function renderTimeline(
  scheduleId: string,
  state: ScheduleState,
  sigCount: number,
  createdAt?: string,
  expiresAt?: string,
  memo?: string,
): string {
  const WIDTH = 62;
  const line = '─'.repeat(WIDTH);
  const pad = (s: string, w: number): string => s.padEnd(w);

  const stateIcon =
    state === ScheduleState.EXECUTED ? '✓ EXECUTED' :
    state === ScheduleState.DELETED  ? '✗ DELETED'  :
                                       '⏳ PENDING';

  const rows: string[] = [
    `┌${'─'.repeat(WIDTH + 2)}┐`,
    `│  Schedule Lifecycle: ${pad(scheduleId, WIDTH - 20)}  │`,
    `├${'─'.repeat(WIDTH + 2)}┤`,
    `│                                                                │`,
    `│  CREATED ──────────── PENDING ────────────── ${pad(stateIcon, 16)} │`,
    `│                                                                │`,
    `├─────────────────────────────────────────────────────────────── ┤`,
    `│  State:              ${pad(state, 40)}│`,
    `│  Signatures:         ${pad(String(sigCount), 40)}│`,
  ];

  if (createdAt) {
    rows.push(`│  Created:            ${pad(createdAt, 40)}│`);
  }
  if (expiresAt) {
    rows.push(`│  Expires:            ${pad(expiresAt, 40)}│`);
  }
  if (memo) {
    const truncated = memo.length > 40 ? memo.slice(0, 37) + '...' : memo;
    rows.push(`│  Memo:               ${pad(truncated, 40)}│`);
  }

  // Signature bar
  if (sigCount > 0) {
    const barWidth = Math.min(sigCount * 4, 40);
    const bar = '█'.repeat(barWidth) + '░'.repeat(40 - barWidth);
    rows.push(`│  Sig progress:       ${bar}│`);
  }

  rows.push(`└${'─'.repeat(WIDTH + 2)}┘`);

  return rows.join('\n');
}

export async function vizSchedule(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { api, logger } = args;

  const validArgs = VizInputSchema.parse(args.args);
  const scheduleId = validArgs['schedule-id'];

  const network = api.network.getCurrentNetwork();
  const networkConfig = api.network.getNetworkConfig(network);
  const mirrorBase = networkConfig.mirrorNodeUrl.replace(/\/$/, '');

  try {
    logger.info(`Fetching lifecycle data for ${scheduleId} …`);

    const url = `${mirrorBase}/api/v1/schedules/${scheduleId}`;
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
    const sigCount = data.signatures?.length ?? 0;

    const createdAt = data.consensus_timestamp
      ? new Date(Number(data.consensus_timestamp.split('.')[0]) * 1000).toISOString()
      : undefined;
    const expiresAt = data.expiration_time
      ? new Date(Number(data.expiration_time.split('.')[0]) * 1000).toISOString()
      : undefined;

    const timeline = renderTimeline(
      scheduleId,
      state,
      sigCount,
      createdAt,
      expiresAt,
      data.memo,
    );

    const output: VizOutput = {
      scheduleId,
      state,
      signaturesCollected: sigCount,
      createdAt,
      expiresAt,
      memo: data.memo || undefined,
      network,
      timeline,
    };

    return {
      status: Status.Success,
      outputJson: JSON.stringify(output),
    };
  } catch (error: unknown) {
    return {
      status: Status.Failure,
      errorMessage: formatError(`Failed to visualize schedule ${scheduleId}`, error),
    };
  }
}
