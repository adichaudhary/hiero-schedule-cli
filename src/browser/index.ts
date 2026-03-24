/**
 * Browser-safe re-exports for hiero-schedule.
 *
 * This module contains ONLY code that is safe to import in a browser
 * environment (no Node.js built-ins: no fs, path, os, EventEmitter, etc.).
 *
 * Includes:
 *   - fetchScheduleStatus / fetchScheduleSigners — one-shot fetch helpers
 *   - ScheduleStatusPoller — polling class using browser setTimeout
 *
 * NOT included (Node.js only):
 *   - ScheduleClient / ScheduleWatcher (uses EventEmitter from 'events')
 *   - ScheduleRegistry (uses fs / os)
 *   - loadPolicy / loadProfile (uses fs / os)
 *   - CLI command handlers (use CommandHandlerArgs infrastructure)
 */

export {
  fetchScheduleStatus,
  fetchScheduleSigners,
  ScheduleStatusPoller,
} from './schedule-status-poller';

export type {
  BrowserScheduleStatus,
  BrowserScheduleSigners,
  BrowserSignatureEntry,
  ScheduleState,
  ScheduleStatusPollerOptions,
} from './schedule-status-poller';
