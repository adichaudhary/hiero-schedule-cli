/**
 * Type definitions for the local schedule registry.
 */

export type RegistryEntryState = 'PENDING' | 'EXECUTED' | 'DELETED' | 'UNKNOWN';

export interface ScheduleRegistryEntry {
  /** Hedera schedule ID, e.g. "0.0.9000" */
  scheduleId: string;

  /** Transaction ID that created the schedule */
  transactionId: string;

  /** Hedera network (testnet / mainnet / previewnet) */
  network: string;

  /** Operator account that paid for the ScheduleCreateTransaction */
  payer: string;

  /** Optional memo stored on the schedule */
  memo?: string;

  /** User-defined labels for grouping and filtering */
  tags: string[];

  /** ISO-8601 timestamp when the schedule was created locally */
  createdAt: string;

  /** ISO-8601 expiry timestamp (derived from expirySeconds at creation time) */
  expiresAt?: string;

  /** Last known on-chain lifecycle state */
  state: RegistryEntryState;

  /** ISO-8601 timestamp when the state was last refreshed from the mirror node */
  lastCheckedAt?: string;
}

export interface RegistryFilter {
  tag?: string;
  network?: string;
  state?: RegistryEntryState;
}
