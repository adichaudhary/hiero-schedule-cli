/**
 * Schedule plugin — Hedera scheduled-transaction management.
 *
 * Public surface: the manifest is the single entry-point the CLI core needs.
 * All handlers, schemas, types, utilities, and registry helpers are also
 * exported for consumers who import directly (testing, scripting, embedding).
 */
export { manifest } from './manifest';

// ── Lifecycle state model ─────────────────────────────────────────────────────
export { ScheduleState, deriveScheduleState, isTerminal, TERMINAL_STATES } from './lifecycle';

// ── Schedule templates ────────────────────────────────────────────────────────
export {
  ESCROW_TEMPLATE,
  getTemplate,
  RECURRING_PAYMENT_TEMPLATE,
  SCHEDULE_TEMPLATES,
  TEMPLATE_NAMES,
  VESTING_TEMPLATE,
} from './templates';
export type { ScheduleTemplate } from './templates';

// ── Local registry ────────────────────────────────────────────────────────────
export { ScheduleRegistry } from './registry';
export type {
  RegistryEntryState,
  RegistryFilter,
  ScheduleRegistryEntry,
} from './registry';

// ── Utilities ─────────────────────────────────────────────────────────────────
export { parseDuration, parseAbsoluteTimestamp, resolveExpirySeconds } from './utils/time-parse';
export { loadPolicy, validateCreatePolicy, PolicyViolationError } from './utils/policy';
export type { PolicyConfig } from './utils/policy';
export { notifyWebhook } from './utils/webhook';
export type { WebhookPayload, WebhookResult } from './utils/webhook';
export { collectSignatures } from './utils/collect-signatures';
export type { CollectSignaturesResult, SignatureCollectionEntry } from './utils/collect-signatures';

// ── schedule:create ───────────────────────────────────────────────────────────
export { createSchedule } from './commands/create/handler';
export { CreateInputSchema, type CreateInput } from './commands/create/input';
export { CreateOutputSchema, CREATE_HUMAN_TEMPLATE, type CreateScheduleOutput } from './commands/create/output';

// ── schedule:sign ─────────────────────────────────────────────────────────────
export { signSchedule } from './commands/sign/handler';
export { SignInputSchema, type SignInput } from './commands/sign/input';
export { SignOutputSchema, SIGN_HUMAN_TEMPLATE, type SignOutput } from './commands/sign/output';

// ── schedule:cosign ───────────────────────────────────────────────────────────
export { cosignSchedule } from './commands/cosign/handler';
export { CosignInputSchema, type CosignInput } from './commands/cosign/input';
export { CosignOutputSchema, COSIGN_HUMAN_TEMPLATE, type CosignOutput, type CosignResultEntry } from './commands/cosign/output';

// ── schedule:signers ──────────────────────────────────────────────────────────
export { getScheduleSigners } from './commands/signers/handler';
export { SignersInputSchema } from './commands/signers/input';
export { SignersOutputSchema, SIGNERS_HUMAN_TEMPLATE, type SignersOutput, type SignatureEntry } from './commands/signers/output';

// ── schedule:status ───────────────────────────────────────────────────────────
export { getScheduleStatus } from './commands/status/handler';
export { StatusInputSchema, type StatusInput } from './commands/status/input';
export { StatusOutputSchema, STATUS_HUMAN_TEMPLATE, type StatusOutput } from './commands/status/output';

// ── schedule:watch ────────────────────────────────────────────────────────────
export { watchSchedule } from './commands/watch/handler';
export { WatchInputSchema, type WatchInput } from './commands/watch/input';
export { WatchOutputSchema, WATCH_HUMAN_TEMPLATE, type WatchOutput } from './commands/watch/output';

// ── schedule:recurring ────────────────────────────────────────────────────────
export { createRecurringSchedules } from './commands/recurring/handler';
export { RecurringInputSchema, type RecurringInput } from './commands/recurring/input';
export { RecurringOutputSchema, RECURRING_HUMAN_TEMPLATE, type RecurringOutput, type RecurringScheduleEntry } from './commands/recurring/output';

// ── schedule:list ─────────────────────────────────────────────────────────────
export { listSchedules } from './commands/list/handler';
export { ListInputSchema, type ListInput } from './commands/list/input';
export { ListOutputSchema, LIST_HUMAN_TEMPLATE, type ListEntry, type ListOutput } from './commands/list/output';
