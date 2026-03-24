/**
 * Programmatic JS/TS SDK for hiero-schedule.
 *
 * Import this module when you want to use hiero-schedule features from your
 * own application code, without the hiero-cli command infrastructure.
 *
 * @example
 * ```ts
 * import { ScheduleClient, ScheduleWatcher } from '@hiero-ledger/schedule-plugin/sdk';
 *
 * const client = new ScheduleClient({ network: 'testnet' });
 * const status = await client.getStatus('0.0.5678');
 *
 * const watcher = client.createWatcher('0.0.5678', { timeoutSeconds: 300 });
 * watcher.on('executed', (e) => console.log('executed at', e.resolvedAt));
 * await watcher.start();
 * ```
 */

export { MirrorClient, MirrorClientError, BackoffTimer, defaultMirrorUrl } from './mirror-client';
export type {
  MirrorClientOptions,
  MirrorScheduleData,
  MirrorScheduleSignature,
  BackoffOptions,
} from './mirror-client';

export { ScheduleWatcher } from './schedule-watcher';
export type {
  ScheduleWatcherOptions,
  ScheduleWatcherEvents,
  WatcherPollEvent,
  WatcherTerminalEvent,
  WatcherTimeoutEvent,
  WatcherErrorEvent,
} from './schedule-watcher';

export { ScheduleClient, ScheduleNotFoundError } from './schedule-client';
export type {
  ScheduleClientOptions,
  ScheduleStatusResult,
  ScheduleSignersResult,
} from './schedule-client';

export { zodToJsonSchema, schemas } from './json-schemas';
export type { JsonSchema } from './json-schemas';

// Re-export Zod schemas for consumers who need them
export {
  CreateInputSchema,
  CreateOutputSchema,
  SignInputSchema,
  SignOutputSchema,
  CosignInputSchema,
  CosignOutputSchema,
  SignersInputSchema,
  SignersOutputSchema,
  StatusInputSchema,
  StatusOutputSchema,
  WatchInputSchema,
  WatchOutputSchema,
  RecurringInputSchema,
  RecurringOutputSchema,
  ListInputSchema,
  ListOutputSchema,
} from './json-schemas';
