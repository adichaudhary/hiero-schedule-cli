import { z } from 'zod';

import { EntityIdSchema } from '@/core/schemas/common-schemas';

export const VizInputSchema = z.object({
  /** The schedule ID to visualize, e.g. "0.0.5678" */
  'schedule-id': EntityIdSchema,
});

export type VizInput = z.infer<typeof VizInputSchema>;
