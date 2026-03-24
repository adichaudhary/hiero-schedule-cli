/**
 * Example: Multi-signature escrow workflow.
 *
 * Demonstrates the schedule:cosign pattern using the programmatic SDK +
 * CLI commands: create an escrow schedule, collect three signatures, and
 * monitor until execution.
 *
 * In a real integration each party would run their own signing step.
 * Here we illustrate the flow using the CLI handler functions directly.
 */

import { ScheduleClient } from '../src/sdk';

async function main() {
  const client = new ScheduleClient({ network: 'testnet' });

  // ── 1. Assume a schedule was already created (e.g. via schedule:create) ─────
  const scheduleId = '0.0.9001'; // replace with real escrow schedule ID

  // ── 2. Check who has signed so far ──────────────────────────────────────────
  const signersResult = await client.getSigners(scheduleId);
  console.log(`Current state:    ${signersResult.state}`);
  console.log(`Signatures so far: ${signersResult.signaturesCollected}`);
  signersResult.signatures.forEach((s, i) => {
    console.log(`  [${i + 1}] ${s.type}: ${s.publicKeyPrefix}… at ${s.consensusTimestamp ?? 'unknown'}`);
  });

  // ── 3. Watch with exponential backoff until terminal state ───────────────────
  const watcher = client.createWatcher(scheduleId, {
    pollIntervalSeconds: 5,
    timeoutSeconds: 600,
    backoff: { initialMs: 5_000, maxMs: 60_000, multiplier: 1.5 },
  });

  watcher.on('executed', (e) => {
    console.log(`\n✓ Escrow executed after ${e.elapsedSeconds}s — funds released.`);
  });

  watcher.on('deleted', (e) => {
    console.log(`\n✗ Escrow schedule deleted at ${e.resolvedAt} — funds not released.`);
  });

  watcher.on('timeout', (e) => {
    console.log(`\n⏳ Watch timed out (${e.pollCount} polls). Check manually.`);
  });

  console.log('\nWatching for escrow execution (up to 10 minutes)…');
  await watcher.start();
}

main().catch(console.error);
