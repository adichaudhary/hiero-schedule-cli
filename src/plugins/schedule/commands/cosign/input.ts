import { z } from 'zod';

import { EntityIdSchema } from '@/core/schemas/common-schemas';

export const CosignInputSchema = z.object({
  /** The schedule ID to sign. */
  'schedule-id': EntityIdSchema,

  /**
   * Comma-separated list of key reference IDs to sign with.
   * Each key submits its own ScheduleSignTransaction.
   * Example: "key-alice,key-bob,key-treasury"
   */
  'signer-keys': z
    .string()
    .min(1, 'At least one signer key reference must be provided'),
});

export type CosignInput = z.infer<typeof CosignInputSchema>;
