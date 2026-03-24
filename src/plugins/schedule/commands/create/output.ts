import { z } from 'zod';

import { EntityIdSchema, TransactionIdSchema } from '@/core/schemas/common-schemas';

/**
 * Zod schema for the JSON payload returned by a successful `schedule:create`.
 */
export const CreateOutputSchema = z.object({
  /**
   * The newly created schedule ID, e.g. "0.0.5678".
   * Absent when dryRun === true.
   */
  scheduleId: EntityIdSchema.optional(),

  /**
   * The Hedera transaction ID that created the schedule.
   * Absent when dryRun === true.
   */
  transactionId: TransactionIdSchema.optional(),

  /** Account ID of the operator that submitted the create transaction */
  payer: EntityIdSchema,

  /** Expiry window (seconds from creation) that was requested */
  expirySeconds: z.number().int().positive(),

  /** Network the transaction was submitted to */
  network: z.string(),

  /** Optional memo */
  memo: z.string().optional(),

  /** Present and true when --dry-run was supplied; transaction was NOT submitted. */
  dryRun: z.boolean().optional(),

  /**
   * Static fee estimate in tinybars for a ScheduleCreateTransaction.
   * Only present when dryRun === true.
   */
  feeEstimateTinybars: z.string().optional(),
});

export type CreateScheduleOutput = z.infer<typeof CreateOutputSchema>;

/** Handlebars template rendered when --output human (default) */
export const CREATE_HUMAN_TEMPLATE = `
{{#if dryRun}}
Dry Run — Transaction NOT Submitted
  Estimated Fee:  {{feeEstimateTinybars}} tinybars
{{else}}
Scheduled Transaction Created
  Schedule ID:    {{scheduleId}}  ({{hashscanLink scheduleId}})
  Transaction ID: {{transactionId}}
{{/if}}
  Payer:          {{payer}}
  Expiry:         {{expirySeconds}}s from submission
  Network:        {{network}}
{{#if memo}}  Memo:           {{memo}}
{{/if}}
{{#unless dryRun}}Use \`schedule:status --schedule-id {{scheduleId}}\` to track execution.{{/unless}}
`.trim();
