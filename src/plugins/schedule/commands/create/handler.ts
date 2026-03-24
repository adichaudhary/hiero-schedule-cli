/**
 * schedule:create command handler
 *
 * Builds a ScheduleCreateTransaction that wraps an HBAR transfer and submits
 * it to the Hedera network via the CoreAPI tx-execution service.
 *
 * Enhanced features:
 *   --execute-in / --execute-at  Human-readable time parsing (time-parse utility)
 *   --template                   Apply a named preset (vesting / escrow / recurring-payment)
 *   --from-file                  Load field values from a JSON file
 *   --tag                        Tag the schedule in the local registry
 *   --policy-file                Enforce guardrails (max amount, allowed recipients, etc.)
 *   --dry-run                    Build without submitting; show fee estimate
 */
import * as fs from 'fs';

import type { CommandExecutionResult, CommandHandlerArgs } from '@/core';

import {
  Hbar,
  ScheduleCreateTransaction,
  Timestamp,
  TransferTransaction,
} from '@hashgraph/sdk';

import { Status } from '@/core/shared/constants';
import { formatError } from '@/core/utils/errors';
import { ScheduleRegistry } from '../../registry/registry';
import { getTemplate, SCHEDULE_TEMPLATES } from '../../templates';
import { resolveExpirySeconds } from '../../utils/time-parse';
import { loadPolicy, validateCreatePolicy } from '../../utils/policy';

import { CreateInputSchema } from './input';
import type { CreateScheduleOutput } from './output';

/** Static fee estimate (tinybars) for a ScheduleCreateTransaction (~$0.01 USD). */
const SCHEDULE_CREATE_FEE_ESTIMATE_TINYBARS = '100000';

/**
 * Handler for `schedule:create`.
 *
 * Pre-processing (template merge, file merge) runs before Zod validation so
 * that required fields like `to` and `amount` can come from a file or template.
 * File I/O errors are caught early and returned as failures rather than thrown.
 */
export async function createSchedule(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { api, logger } = args;

  // ── 0. Pre-process: template defaults + from-file merge ───────────────────
  // Both steps happen before Zod so that required fields can be sourced from
  // a file or a template rather than the CLI flags directly.
  let rawArgs: Record<string, unknown> = { ...args.args };

  // Apply template defaults (lowest priority — file and CLI flags override)
  const templateName = rawArgs['template'] as string | undefined;
  if (templateName && SCHEDULE_TEMPLATES[templateName]) {
    const tmpl = SCHEDULE_TEMPLATES[templateName]!;
    rawArgs = { ...tmpl.defaults, ...rawArgs };
  }

  // Apply from-file values (middle priority — CLI flags still win)
  const fromFilePath = rawArgs['from-file'] as string | undefined;
  if (fromFilePath) {
    let fileData: Record<string, unknown>;
    try {
      const content = fs.readFileSync(fromFilePath, 'utf-8');
      fileData = JSON.parse(content) as Record<string, unknown>;
    } catch (err) {
      return {
        status: Status.Failure,
        errorMessage: formatError(`Failed to read --from-file "${fromFilePath}"`, err),
      };
    }
    // CLI flags have already been spread into rawArgs; file fills in the rest.
    rawArgs = { ...fileData, ...rawArgs };
  }

  // ── 1. Validate merged inputs (ZodError propagates — ADR-003) ─────────────
  const validArgs = CreateInputSchema.parse(rawArgs);

  const network = api.network.getCurrentNetwork();
  const operator = api.network.getCurrentOperatorOrThrow();

  try {
    // ── 2. Resolve expiry seconds (time-parse) ─────────────────────────────
    const expirySeconds = resolveExpirySeconds({
      executeIn: validArgs['execute-in'],
      executeAt: validArgs['execute-at'],
      defaultSeconds: validArgs['expiry-seconds'],
    });

    // ── 3. Policy guardrails ───────────────────────────────────────────────
    const policy = loadPolicy(validArgs['policy-file']);
    validateCreatePolicy(
      { to: validArgs.to, amountTinybars: validArgs.amount, expirySeconds },
      policy,
    );

    // ── 4. Build the inner transfer (the "scheduled" operation) ───────────
    const innerTransfer = new TransferTransaction()
      .addHbarTransfer(validArgs.to, Hbar.fromTinybars(validArgs.amount))
      .addHbarTransfer(operator.accountId, Hbar.fromTinybars(`-${validArgs.amount}`));

    // ── 5. Build the schedule wrapper ─────────────────────────────────────
    const expiresAt = new Timestamp(
      Math.floor(Date.now() / 1000) + expirySeconds,
      0,
    );

    const scheduleTx = new ScheduleCreateTransaction()
      .setScheduledTransaction(innerTransfer)
      .setExpirationTime(expiresAt)
      .setWaitForExpiry(true);

    if (validArgs.memo) {
      scheduleTx.setScheduleMemo(validArgs.memo);
    }

    // ── 6. Dry-run short-circuit ──────────────────────────────────────────
    if (validArgs['dry-run']) {
      logger.info(
        `Dry run — HBAR transfer to ${validArgs.to} (${validArgs.amount} tinybars), ` +
          `expiry ${expirySeconds}s. Transaction NOT submitted.`,
      );
      const output: CreateScheduleOutput = {
        payer: operator.accountId,
        expirySeconds,
        network,
        memo: validArgs.memo,
        dryRun: true,
        feeEstimateTinybars: SCHEDULE_CREATE_FEE_ESTIMATE_TINYBARS,
      };
      return {
        status: Status.Success,
        outputJson: JSON.stringify(output),
      };
    }

    logger.info(
      `Creating scheduled HBAR transfer → ${validArgs.to} (${validArgs.amount} tinybars)`,
    );

    // ── 7. Sign and submit via CoreAPI ────────────────────────────────────
    const result = await api.txExecution.signAndExecute(scheduleTx);

    if (!result.success) {
      return {
        status: Status.Failure,
        errorMessage:
          'Transaction was submitted but the network returned a non-success status.',
      };
    }

    const scheduleId = result.scheduleId;

    if (!scheduleId) {
      return {
        status: Status.Failure,
        errorMessage:
          'Transaction succeeded but schedule ID was not returned in the receipt. ' +
          'Ensure you are running a version of hiero-cli that includes the scheduleId ' +
          'patch to TxExecutionServiceImpl.',
      };
    }

    // ── 8. Auto-register in local registry ───────────────────────────────
    const tags = validArgs.tag
      ? validArgs.tag
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
      : [];

    try {
      const registry = new ScheduleRegistry();
      registry.add({
        scheduleId,
        transactionId: result.transactionId,
        network,
        payer: operator.accountId,
        memo: validArgs.memo,
        tags,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(
          (Math.floor(Date.now() / 1000) + expirySeconds) * 1000,
        ).toISOString(),
        state: 'PENDING',
      });
    } catch (registryErr) {
      logger.warn(`Failed to save schedule to local registry: ${registryErr}`);
    }

    // ── 9. Return structured output ───────────────────────────────────────
    const output: CreateScheduleOutput = {
      scheduleId,
      transactionId: result.transactionId,
      payer: operator.accountId,
      expirySeconds,
      network,
      memo: validArgs.memo,
      tags: tags.length > 0 ? tags : undefined,
    };

    return {
      status: Status.Success,
      outputJson: JSON.stringify(output),
    };
  } catch (error: unknown) {
    return {
      status: Status.Failure,
      errorMessage: formatError('Failed to create scheduled transaction', error),
    };
  }
}
