import { z } from 'zod';

import { EntityIdSchema } from '@/core/schemas/common-schemas';

export const CosignResultEntrySchema = z.object({
  keyRefId: z.string(),
  transactionId: z.string(),
  success: z.boolean(),
  error: z.string().optional(),
});

export const CosignOutputSchema = z.object({
  scheduleId: EntityIdSchema,
  signaturesSubmitted: z.number().int().nonnegative(),
  keysAttempted: z.number().int().nonnegative(),
  results: z.array(CosignResultEntrySchema),
  network: z.string(),
});

export type CosignResultEntry = z.infer<typeof CosignResultEntrySchema>;
export type CosignOutput = z.infer<typeof CosignOutputSchema>;

export const COSIGN_HUMAN_TEMPLATE = `
Multi-Signature Submission
  Schedule ID:           {{scheduleId}}
  Signatures Submitted:  {{signaturesSubmitted}} / {{keysAttempted}}
  Network:               {{network}}

Per-key results:
{{#each results}}
  {{keyRefId}}: {{#if success}}OK  (tx {{transactionId}}){{else}}FAILED — {{error}}{{/if}}
{{/each}}
`.trim();
