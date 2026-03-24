import { z } from 'zod';

export const ListInputSchema = z.object({
  /** Filter by tag label. */
  tag: z.string().optional(),

  /** Filter by Hedera network name. */
  network: z.string().optional(),

  /** Filter by lifecycle state. */
  state: z.enum(['PENDING', 'EXECUTED', 'DELETED', 'UNKNOWN']).optional(),

  /** Custom path to the registry JSON file. */
  'registry-file': z.string().optional(),
});

export type ListInput = z.infer<typeof ListInputSchema>;
