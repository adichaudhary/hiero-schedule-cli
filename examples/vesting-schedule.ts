/**
 * Example: Inspect a vesting schedule's status and signer progress.
 *
 * Shows how to combine getStatus() and getSigners() to build a summary
 * suitable for a dashboard or notification system.
 */

import { ScheduleClient } from '../src/sdk';

async function main() {
  const client = new ScheduleClient({ network: 'mainnet' });

  const scheduleId = '0.0.12345'; // replace with real vesting schedule

  const [status, signers] = await Promise.all([
    client.getStatus(scheduleId),
    client.getSigners(scheduleId),
  ]);

  console.log('═══════════════════════════════════════');
  console.log('  Vesting Schedule Summary');
  console.log('═══════════════════════════════════════');
  console.log(`  ID:      ${status.scheduleId}`);
  console.log(`  State:   ${status.state}`);
  console.log(`  Network: ${status.network}`);
  if (status.memo) console.log(`  Memo:    ${status.memo}`);
  if (status.createdAt) console.log(`  Created: ${status.createdAt}`);
  if (status.expiresAt) console.log(`  Expires: ${status.expiresAt}`);
  console.log(`\n  Signatures (${signers.signaturesCollected} collected):`);
  signers.signatures.forEach((s, i) => {
    const ts = s.consensusTimestamp
      ? new Date(Number(s.consensusTimestamp.split('.')[0]) * 1000).toISOString()
      : '—';
    console.log(`    ${i + 1}. ${s.type} — ${s.publicKeyPrefix}… @ ${ts}`);
  });
  console.log('═══════════════════════════════════════');
}

main().catch(console.error);
