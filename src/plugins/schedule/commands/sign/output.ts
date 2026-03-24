import { z } from 'zod';

import { EntityIdSchema, TransactionIdSchema } from '@/core/schemas/common-schemas';

export const SignOutputSchema = z.object({
  /** The schedule ID that was signed */
  scheduleId: EntityIdSchema,

  /** Transaction ID of the ScheduleSignTransaction */
  transactionId: TransactionIdSchema,

  /** Account ID of the operator that submitted the signature */
  signer: EntityIdSchema,

  /** Network the transaction was submitted to */
  network: z.string(),
});

export type SignOutput = z.infer<typeof SignOutputSchema>;

export const SIGN_HUMAN_TEMPLATE = `
Scheduled Transaction Signed
  Schedule ID:    {{scheduleId}}  ({{hashscanLink scheduleId}})
  Transaction ID: {{transactionId}}
  Signer:         {{signer}}
  Network:        {{network}}
Use \`schedule:status --schedule-id {{scheduleId}}\` to check whether all required signatures have been collected.
`.trim();
