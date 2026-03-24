/**
 * schedule:list command handler
 *
 * Lists all schedules tracked in the local registry, with optional filtering
 * by tag, network, and lifecycle state.
 */
import type { CommandExecutionResult, CommandHandlerArgs } from '@/core';

import { Status } from '@/core/shared/constants';
import { formatError } from '@/core/utils/errors';
import { ScheduleRegistry } from '../../registry/registry';

import { ListInputSchema } from './input';
import type { ListOutput } from './output';

export async function listSchedules(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { logger } = args;

  // ── 1. Validate inputs (outside try-catch — ADR-003) ──────────────────────
  const validArgs = ListInputSchema.parse(args.args);

  try {
    const registry = new ScheduleRegistry(validArgs['registry-file']);

    logger.info('Loading schedule registry …');

    const entries = registry.list({
      tag: validArgs.tag,
      network: validArgs.network,
      state: validArgs.state,
    });

    const output: ListOutput = {
      count: entries.length,
      entries: entries.map((e) => ({
        scheduleId: e.scheduleId,
        network: e.network,
        state: e.state,
        tags: e.tags,
        createdAt: e.createdAt,
        memo: e.memo,
        payer: e.payer,
        expiresAt: e.expiresAt,
        lastCheckedAt: e.lastCheckedAt,
      })),
      filters: {
        tag: validArgs.tag,
        network: validArgs.network,
        state: validArgs.state,
      },
    };

    return {
      status: Status.Success,
      outputJson: JSON.stringify(output),
    };
  } catch (error: unknown) {
    return {
      status: Status.Failure,
      errorMessage: formatError('Failed to list schedules from local registry', error),
    };
  }
}
