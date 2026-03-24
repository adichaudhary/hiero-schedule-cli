import { z } from 'zod';

import { EntityIdSchema } from '@/core/schemas/common-schemas';

export const RecurringScheduleEntrySchema = z.object({
  /** 1-based payment index */
  index: z.number().int().positive(),
  scheduleId: EntityIdSchema,
  transactionId: z.string(),
  expirySeconds: z.number().int().positive(),
});

export const RecurringOutputSchema = z.object({
  count: z.number().int().nonnegative(),
  schedules: z.array(RecurringScheduleEntrySchema),
  recipient: EntityIdSchema,
  amountTinybarsEach: z.string(),
  /** Total tinybars across all created schedules (count × amount). */
  totalAmountTinybars: z.string(),
  network: z.string(),
});

export type RecurringScheduleEntry = z.infer<typeof RecurringScheduleEntrySchema>;
export type RecurringOutput = z.infer<typeof RecurringOutputSchema>;

export const RECURRING_HUMAN_TEMPLATE = `
Recurring Payment Schedules Created
  Recipient:        {{recipient}}
  Amount Each:      {{amountTinybarsEach}} tinybars
  Total Amount:     {{totalAmountTinybars}} tinybars
  Schedules:        {{count}}
  Network:          {{network}}

Created schedules:
{{#each schedules}}
  [{{index}}] {{scheduleId}}  (expires in {{expirySeconds}}s)
{{/each}}
`.trim();
