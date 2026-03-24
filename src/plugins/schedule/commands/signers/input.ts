import { z } from 'zod';

import { EntityIdSchema } from '@/core/schemas/common-schemas';

export const SignersInputSchema = z.object({
  'schedule-id': EntityIdSchema,
});

export type SignersInput = z.infer<typeof SignersInputSchema>;
