import type { PluginManifest } from '@/core/plugins/plugin.types';

import { OptionType } from '@/core/shared/constants';

import { createSchedule } from './commands/create/handler';
import { CREATE_HUMAN_TEMPLATE, CreateOutputSchema } from './commands/create/output';
import { cosignSchedule } from './commands/cosign/handler';
import { COSIGN_HUMAN_TEMPLATE, CosignOutputSchema } from './commands/cosign/output';
import { listSchedules } from './commands/list/handler';
import { LIST_HUMAN_TEMPLATE, ListOutputSchema } from './commands/list/output';
import { createRecurringSchedules } from './commands/recurring/handler';
import { RECURRING_HUMAN_TEMPLATE, RecurringOutputSchema } from './commands/recurring/output';
import { signSchedule } from './commands/sign/handler';
import { SIGN_HUMAN_TEMPLATE, SignOutputSchema } from './commands/sign/output';
import { getScheduleSigners } from './commands/signers/handler';
import { SIGNERS_HUMAN_TEMPLATE, SignersOutputSchema } from './commands/signers/output';
import { getScheduleStatus } from './commands/status/handler';
import { STATUS_HUMAN_TEMPLATE, StatusOutputSchema } from './commands/status/output';
import { watchSchedule } from './commands/watch/handler';
import { WATCH_HUMAN_TEMPLATE, WatchOutputSchema } from './commands/watch/output';

export const manifest: PluginManifest = {
  name: 'schedule',
  version: '2.0.0',
  displayName: 'Schedule',
  description: 'Create, sign, inspect, and watch Hedera scheduled transactions.',

  commands: [
    // ── schedule:create ──────────────────────────────────────────────────────
    {
      name: 'schedule:create',
      summary: 'Create a scheduled HBAR transfer',
      description:
        'Wraps an HBAR transfer inside a ScheduleCreateTransaction and submits it. ' +
        'Supports templates (--template), time expressions (--execute-in / --execute-at), ' +
        'file-based input (--from-file), tagging (--tag), policy guardrails (--policy-file), ' +
        'and dry-run mode (--dry-run).',
      options: [
        { name: 'to', type: OptionType.STRING, description: 'Recipient account ID (e.g. 0.0.1234)', required: true },
        { name: 'amount', type: OptionType.STRING, description: 'Amount in tinybars (e.g. 50000000 = 0.5 ℏ)', required: true },
        { name: 'expiry-seconds', type: OptionType.NUMBER, description: 'Seconds from now until expiry (default: 2592000 = 30 days)', required: false },
        { name: 'execute-in', type: OptionType.STRING, description: 'Human-readable duration, e.g. "30d", "2w", "1h". Overrides --expiry-seconds.', required: false },
        { name: 'execute-at', type: OptionType.STRING, description: 'ISO-8601 datetime or epoch seconds for expiry. Overrides --expiry-seconds.', required: false },
        { name: 'memo', type: OptionType.STRING, description: 'Memo stored on the scheduled transaction (max 100 chars)', required: false },
        { name: 'template', type: OptionType.STRING, description: 'Named preset: vesting | escrow | recurring-payment', required: false },
        { name: 'from-file', type: OptionType.STRING, description: 'Path to JSON file containing schedule:create field values', required: false },
        { name: 'tag', type: OptionType.STRING, description: 'Comma-separated tags for local registry grouping (e.g. "finance,q4")', required: false },
        { name: 'policy-file', type: OptionType.STRING, description: 'Path to policy JSON file (default: ~/.hiero/schedule-policy.json)', required: false },
        { name: 'dry-run', type: OptionType.BOOLEAN, description: 'Build and validate without submitting; shows fee estimate', required: false, default: false },
      ],
      handler: createSchedule,
      output: { schema: CreateOutputSchema, humanTemplate: CREATE_HUMAN_TEMPLATE },
    },

    // ── schedule:sign ─────────────────────────────────────────────────────────
    {
      name: 'schedule:sign',
      summary: 'Add the operator signature to an existing scheduled transaction',
      description:
        'Submits a ScheduleSignTransaction to contribute the operator\'s signature. ' +
        'When the last required signature is added the network automatically executes the inner transaction.',
      options: [
        { name: 'schedule-id', type: OptionType.STRING, description: 'The schedule ID to sign (e.g. 0.0.5678)', required: true },
      ],
      handler: signSchedule,
      output: { schema: SignOutputSchema, humanTemplate: SIGN_HUMAN_TEMPLATE },
    },

    // ── schedule:cosign ───────────────────────────────────────────────────────
    {
      name: 'schedule:cosign',
      summary: 'Sign a schedule with multiple keys in a single invocation',
      description:
        'Multi-Signature Coordination Layer. ' +
        'Submits a separate ScheduleSignTransaction for each key in --signer-keys. ' +
        'All keys are attempted even when one fails; partial success is reported per-key.',
      options: [
        { name: 'schedule-id', type: OptionType.STRING, description: 'The schedule ID to sign (e.g. 0.0.5678)', required: true },
        { name: 'signer-keys', type: OptionType.STRING, description: 'Comma-separated key reference IDs (e.g. "key-alice,key-bob")', required: true },
      ],
      handler: cosignSchedule,
      output: { schema: CosignOutputSchema, humanTemplate: COSIGN_HUMAN_TEMPLATE },
    },

    // ── schedule:signers ──────────────────────────────────────────────────────
    {
      name: 'schedule:signers',
      summary: 'Show signatures collected so far on a scheduled transaction',
      description:
        'Pending Signer Tracking. ' +
        'Queries the mirror node and returns each collected signature (public key prefix + type). ' +
        'Use with schedule:cosign to coordinate multi-party signing.',
      options: [
        { name: 'schedule-id', type: OptionType.STRING, description: 'The schedule ID to inspect (e.g. 0.0.5678)', required: true },
      ],
      handler: getScheduleSigners,
      output: { schema: SignersOutputSchema, humanTemplate: SIGNERS_HUMAN_TEMPLATE },
    },

    // ── schedule:status ───────────────────────────────────────────────────────
    {
      name: 'schedule:status',
      summary: 'Check the current state of a scheduled transaction',
      description:
        'Queries the Hedera mirror node and returns whether the schedule is ' +
        'PENDING, EXECUTED, or DELETED, plus how many signatures have been collected.',
      options: [
        { name: 'schedule-id', type: OptionType.STRING, description: 'The schedule ID to look up (e.g. 0.0.5678)', required: true },
      ],
      handler: getScheduleStatus,
      output: { schema: StatusOutputSchema, humanTemplate: STATUS_HUMAN_TEMPLATE },
    },

    // ── schedule:watch ────────────────────────────────────────────────────────
    {
      name: 'schedule:watch',
      summary: 'Watch a scheduled transaction until it is executed or deleted',
      description:
        'Mirror Polling Engine. ' +
        'Polls the mirror node at a configurable interval until EXECUTED, DELETED, or timeout. ' +
        'Optionally POSTs a webhook callback when a terminal state is reached (--webhook-url).',
      options: [
        { name: 'schedule-id', type: OptionType.STRING, description: 'The schedule ID to watch (e.g. 0.0.5678)', required: true },
        { name: 'poll-interval', type: OptionType.NUMBER, description: 'Polling interval in seconds (default: 3)', required: false },
        { name: 'timeout', type: OptionType.NUMBER, description: 'Maximum seconds to wait before exiting (default: 3600)', required: false },
        { name: 'webhook-url', type: OptionType.STRING, description: 'HTTPS URL to POST a JSON payload to when a terminal state is reached', required: false },
      ],
      handler: watchSchedule,
      output: { schema: WatchOutputSchema, humanTemplate: WATCH_HUMAN_TEMPLATE },
    },

    // ── schedule:recurring ────────────────────────────────────────────────────
    {
      name: 'schedule:recurring',
      summary: 'Pre-schedule a series of recurring HBAR transfers',
      description:
        'Recurring Scheduler Engine. ' +
        'Creates N scheduled transfers with staggered expiry windows to simulate a recurring payment series. ' +
        'Each schedule must be signed independently to execute.',
      options: [
        { name: 'to', type: OptionType.STRING, description: 'Recipient account ID for every payment', required: true },
        { name: 'amount', type: OptionType.STRING, description: 'Amount in tinybars per payment', required: true },
        { name: 'count', type: OptionType.NUMBER, description: 'Number of payment schedules to create (max 50)', required: true },
        { name: 'interval-seconds', type: OptionType.NUMBER, description: 'Expiry offset between consecutive schedules (default: 2592000 = 30 days)', required: false },
        { name: 'first-expiry-seconds', type: OptionType.NUMBER, description: 'Expiry of the first schedule (default: 2592000 = 30 days)', required: false },
        { name: 'memo', type: OptionType.STRING, description: 'Base memo; "(N of M)" is appended per schedule (max 80 chars)', required: false },
      ],
      handler: createRecurringSchedules,
      output: { schema: RecurringOutputSchema, humanTemplate: RECURRING_HUMAN_TEMPLATE },
    },

    // ── schedule:list ─────────────────────────────────────────────────────────
    {
      name: 'schedule:list',
      summary: 'List schedules tracked in the local registry',
      description:
        'Local Schedule Registry. ' +
        'Reads the local registry file (default: ~/.hiero/schedule-registry.json) and ' +
        'returns tracked schedules with optional tag, network, and state filtering.',
      options: [
        { name: 'tag', type: OptionType.STRING, description: 'Filter by tag label', required: false },
        { name: 'network', type: OptionType.STRING, description: 'Filter by network name (testnet / mainnet)', required: false },
        { name: 'state', type: OptionType.STRING, description: 'Filter by state: PENDING | EXECUTED | DELETED | UNKNOWN', required: false },
        { name: 'registry-file', type: OptionType.STRING, description: 'Custom path to the registry JSON file', required: false },
      ],
      handler: listSchedules,
      output: { schema: ListOutputSchema, humanTemplate: LIST_HUMAN_TEMPLATE },
    },
  ],
};
