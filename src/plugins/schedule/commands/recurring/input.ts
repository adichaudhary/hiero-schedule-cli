import { z } from 'zod';

import { EntityIdSchema } from '@/core/schemas/common-schemas';

export const RecurringInputSchema = z.object({
  /** Recipient account ID for every payment in the series. */
  to: EntityIdSchema,

  /** Amount in tinybars per payment (non-negative integer string). */
  amount: z
    .string()
    .regex(/^\d+$/, 'Amount must be a non-negative integer string (tinybars)'),

  /**
   * Number of schedules to create.
   * Each represents one payment period.  Maximum 50 to avoid excessive fees.
   */
  count: z.number().int().min(1).max(50),

  /**
   * Offset between each schedule's expiry, in seconds.
   * Payment N expires at: now + first-expiry-seconds + (N-1) * interval-seconds.
   * Defaults to 2592000 (30 days).
   */
  'interval-seconds': z
    .number()
    .int()
    .positive()
    .max(5_184_000)
    .optional()
    .default(2_592_000),

  /**
   * Expiry of the first payment schedule (seconds from now).
   * Defaults to 2592000 (30 days).
   */
  'first-expiry-seconds': z
    .number()
    .int()
    .positive()
    .max(5_184_000)
    .optional()
    .default(2_592_000),

  /**
   * Base memo.  Each schedule gets " (N of M)" appended automatically.
   */
  memo: z.string().max(80).optional(),
});

export type RecurringInput = z.infer<typeof RecurringInputSchema>;
