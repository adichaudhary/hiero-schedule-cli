import { z } from 'zod';

import { EntityIdSchema } from '@/core/schemas/common-schemas';

export const SignatureEntrySchema = z.object({
  /** Hex-encoded public key prefix submitted by this signer. */
  publicKeyPrefix: z.string(),
  /** Key type, e.g. "ED25519" or "ECDSA_SECP256K1". */
  type: z.string(),
  /** ISO-8601 consensus timestamp when this signature was accepted. */
  consensusTimestamp: z.string().optional(),
});

export const SignersOutputSchema = z.object({
  scheduleId: EntityIdSchema,
  /** Current on-chain lifecycle state. */
  state: z.enum(['PENDING', 'EXECUTED', 'DELETED']),
  /** Number of signatures collected so far. */
  signaturesCollected: z.number().int().nonnegative(),
  /** Detail of each collected signature. */
  signatures: z.array(SignatureEntrySchema),
  network: z.string(),
});

export type SignatureEntry = z.infer<typeof SignatureEntrySchema>;
export type SignersOutput = z.infer<typeof SignersOutputSchema>;

export const SIGNERS_HUMAN_TEMPLATE = `
Signature Status for {{scheduleId}}
  State:                {{state}}
  Signatures Collected: {{signaturesCollected}}
  Network:              {{network}}
{{#if signatures.length}}
Collected signatures:
{{#each signatures}}
  [{{@index}}] Type: {{type}}  Key prefix: {{publicKeyPrefix}}{{#if consensusTimestamp}}  At: {{consensusTimestamp}}{{/if}}
{{/each}}
{{else}}
  No signatures collected yet — use \`schedule:sign\` or \`schedule:cosign\` to add signatures.
{{/if}}
`.trim();
