import { z } from 'zod';

import { EntityIdSchema } from '@/core/schemas/common-schemas';

export const SignInputSchema = z.object({
  /** The schedule ID to sign, e.g. "0.0.5678" */
  'schedule-id': EntityIdSchema,
});

export type SignInput = z.infer<typeof SignInputSchema>;
