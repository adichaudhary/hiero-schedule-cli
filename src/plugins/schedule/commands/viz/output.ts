import { z } from 'zod';

import { EntityIdSchema } from '@/core/schemas/common-schemas';

export const VizOutputSchema = z.object({
  scheduleId: EntityIdSchema,
  state: z.enum(['PENDING', 'EXECUTED', 'DELETED']),
  signaturesCollected: z.number().int().nonnegative(),
  createdAt: z.string().optional(),
  expiresAt: z.string().optional(),
  memo: z.string().optional(),
  network: z.string(),
  /** ASCII timeline rendered for human output */
  timeline: z.string(),
});

export type VizOutput = z.infer<typeof VizOutputSchema>;

export const VIZ_HUMAN_TEMPLATE = `{{timeline}}`.trim();
