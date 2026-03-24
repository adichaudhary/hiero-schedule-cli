import { z } from 'zod';

import { EntityIdSchema } from '@/core/schemas/common-schemas';
import { TEMPLATE_NAMES } from '../../templates';

/**
 * Zod schema for `schedule:create` command arguments.
 *
 * `amount` is accepted as a decimal-string so that callers do not lose
 * precision when dealing with large tinybar values (> Number.MAX_SAFE_INTEGER).
 */
export const CreateInputSchema = z.object({
  /** Recipient Hedera account ID, e.g. "0.0.1234" */
  to: EntityIdSchema,

  /**
   * Amount to transfer, expressed in tinybars.
   * Accepts a plain integer string, e.g. "50000000" (= 0.5 ℏ).
   */
  amount: z
    .string()
    .regex(/^\d+$/, 'Amount must be a non-negative integer string (tinybars)'),

  /**
   * Seconds from now until the schedule expires.
   * Defaults to 2592000 (30 days).  Maximum is 5184000 (60 days – network limit).
   */
  'expiry-seconds': z
    .number()
    .int()
    .positive()
    .max(5_184_000, 'Expiry cannot exceed 60 days (5184000 s)')
    .optional()
    .default(2_592_000),

  /** Optional human-readable memo stored on the scheduled transaction. */
  memo: z.string().max(100).optional(),

  /**
   * When true, the transaction is built and validated but NOT submitted to the
   * network.  Returns an estimated fee instead of a real scheduleId.
   */
  'dry-run': z.boolean().optional().default(false),

  /**
   * Human-readable duration from now until the schedule should execute.
   * Examples: "30d", "2w", "1h".  Overrides --expiry-seconds.
   */
  'execute-in': z.string().optional(),

  /**
   * Absolute ISO-8601 datetime (or epoch seconds) for the execution deadline.
   * Examples: "2024-12-31T00:00:00Z", "1735689600".  Overrides --expiry-seconds.
   */
  'execute-at': z.string().optional(),

  /**
   * Comma-separated tags for local registry grouping and filtering.
   * Example: "finance,q4,vesting"
   */
  tag: z.string().optional(),

  /**
   * Path to a JSON file containing schedule:create field values.
   * CLI flags take precedence over file values.
   */
  'from-file': z.string().optional(),

  /**
   * Apply a named template's default values before CLI flags.
   * Available: vesting, escrow, recurring-payment.
   */
  template: z.enum(TEMPLATE_NAMES as [string, ...string[]]).optional(),

  /**
   * Path to a policy JSON file.  Defaults to ~/.hiero/schedule-policy.json.
   * Set to "" to disable policy checks.
   */
  'policy-file': z.string().optional(),
});

export type CreateInput = z.infer<typeof CreateInputSchema>;
