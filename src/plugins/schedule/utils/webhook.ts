/**
 * Webhook / callback support for schedule terminal-state notifications.
 *
 * When a schedule reaches a terminal state the watch command can POST a JSON
 * payload to an arbitrary HTTPS endpoint.  Failures are non-fatal — an error
 * is returned (not thrown) so the caller can log and continue.
 */

export interface WebhookPayload {
  /** The schedule that reached a terminal state. */
  scheduleId: string;

  /** Terminal state that was detected. */
  finalState: 'EXECUTED' | 'DELETED' | 'TIMEOUT';

  /** ISO-8601 timestamp when the terminal state was detected. */
  resolvedAt: string;

  /** Total seconds spent polling before the terminal state was reached. */
  elapsedSeconds: number;

  /** Hedera network (testnet / mainnet / previewnet). */
  network: string;
}

export interface WebhookResult {
  ok: boolean;
  /** Human-readable error description, present only when ok === false. */
  error?: string;
}

/**
 * POSTs {@link WebhookPayload} as JSON to the given URL.
 *
 * Failures (network errors, non-2xx responses) are returned as
 * `{ ok: false, error: "..." }` rather than thrown so the caller can
 * decide whether to surface them to the user without aborting the overall result.
 */
export async function notifyWebhook(
  url: string,
  payload: WebhookPayload,
): Promise<WebhookResult> {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      return {
        ok: false,
        error: `Webhook POST returned HTTP ${response.status} from ${url}`,
      };
    }

    return { ok: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `Webhook POST to ${url} failed: ${message}` };
  }
}
