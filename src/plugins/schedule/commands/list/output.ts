import { z } from 'zod';

import { EntityIdSchema } from '@/core/schemas/common-schemas';

export const ListEntrySchema = z.object({
  scheduleId: EntityIdSchema,
  network: z.string(),
  state: z.enum(['PENDING', 'EXECUTED', 'DELETED', 'UNKNOWN']),
  tags: z.array(z.string()),
  createdAt: z.string(),
  memo: z.string().optional(),
  payer: EntityIdSchema,
  expiresAt: z.string().optional(),
  lastCheckedAt: z.string().optional(),
});

export const ListOutputSchema = z.object({
  count: z.number().int().nonnegative(),
  entries: z.array(ListEntrySchema),
  filters: z.object({
    tag: z.string().optional(),
    network: z.string().optional(),
    state: z.string().optional(),
  }),
});

export type ListEntry = z.infer<typeof ListEntrySchema>;
export type ListOutput = z.infer<typeof ListOutputSchema>;

export const LIST_HUMAN_TEMPLATE = `
Local Schedule Registry  ({{count}} entries)
{{#if filters.tag}}  Tag:     {{filters.tag}}
{{/if}}{{#if filters.network}}  Network: {{filters.network}}
{{/if}}{{#if filters.state}}  State:   {{filters.state}}
{{/if}}
{{#each entries}}
  {{scheduleId}}  [{{state}}]  {{network}}  {{createdAt}}{{#if tags.length}}  tags: {{#each tags}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}{{/if}}{{#if memo}}  "{{memo}}"{{/if}}
{{/each}}
`.trim();
