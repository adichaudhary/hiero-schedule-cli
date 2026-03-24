/**
 * Example: Basic scheduled HBAR transfer using the programmatic SDK.
 *
 * This example shows how to check the status of a scheduled transfer and
 * poll until it reaches a terminal state — without using the CLI.
 *
 * Prerequisites:
 *   npm install @hiero-ledger/schedule-plugin @hashgraph/sdk
 */

import { ScheduleClient } from '../src/sdk';

async function main() {
  // Create a client targeting Hedera testnet
  const client = new ScheduleClient({ network: 'testnet' });

  // Replace with a real schedule ID from your testnet
  const scheduleId = '0.0.5678';

  // ── 1. Check current status ─────────────────────────────────────────────────
  try {
    const status = await client.getStatus(scheduleId);
    console.log('Schedule status:', status.state);
    console.log('Signatures collected:', status.signaturesCollected);
    if (status.expiresAt) {
      console.log('Expires at:', status.expiresAt);
    }
  } catch (err) {
    console.error('Could not fetch status:', err);
    process.exit(1);
  }

  // ── 2. Watch until executed or deleted (max 5 minutes) ─────────────────────
  const watcher = client.createWatcher(scheduleId, {
    pollIntervalSeconds: 5,
    timeoutSeconds: 300,
  });

  watcher.on('poll', (e) => {
    console.log(`Poll #${e.pollCount}: ${e.state} (${e.elapsedSeconds}s elapsed)`);
  });

  watcher.on('executed', (e) => {
    console.log(`✓ Schedule executed at ${e.resolvedAt} after ${e.elapsedSeconds}s`);
  });

  watcher.on('deleted', (e) => {
    console.log(`✗ Schedule deleted at ${e.resolvedAt}`);
  });

  watcher.on('timeout', (e) => {
    console.log(`⏳ Watch timed out after ${e.elapsedSeconds}s (${e.pollCount} polls)`);
  });

  await watcher.start();
}

main().catch(console.error);
