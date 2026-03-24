/**
 * Formal lifecycle state model for Hedera scheduled transactions.
 *
 * A schedule moves through these states exactly once:
 *   PENDING → EXECUTED  (all required signatures collected before expiry)
 *   PENDING → DELETED   (manually cancelled, or expired, or superseded)
 *
 * TIMEOUT is not a true on-chain state — it is a polling sentinel used by the
 * schedule:watch command to signal that the watch window elapsed before the
 * schedule reached a terminal on-chain state.
 */

/** The three on-chain states a Hedera scheduled transaction can occupy. */
export enum ScheduleState {
  /** Created but not yet executed or deleted. */
  PENDING = 'PENDING',
  /** All required signatures were collected and the inner transaction executed. */
  EXECUTED = 'EXECUTED',
  /** Deleted before execution (manual cancel, expiry, or duplicate schedule). */
  DELETED = 'DELETED',
}

/** Terminal states — no further on-chain transitions are possible. */
export const TERMINAL_STATES = new Set<ScheduleState>([
  ScheduleState.EXECUTED,
  ScheduleState.DELETED,
]);

/**
 * Derives the current {@link ScheduleState} from raw mirror-node fields.
 *
 * @param executedTimestamp - `executed_timestamp` from the mirror node response.
 *   Any non-null/non-undefined value indicates the schedule was executed.
 * @param deleted - `deleted` from the mirror node response.
 */
export function deriveScheduleState(
  executedTimestamp: string | null | undefined,
  deleted: boolean,
): ScheduleState {
  if (executedTimestamp !== null && executedTimestamp !== undefined) {
    return ScheduleState.EXECUTED;
  }
  if (deleted) {
    return ScheduleState.DELETED;
  }
  return ScheduleState.PENDING;
}

/** Returns true if no further on-chain transitions are possible. */
export function isTerminal(state: ScheduleState): boolean {
  return TERMINAL_STATES.has(state);
}
