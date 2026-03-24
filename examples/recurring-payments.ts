/**
 * Example: Monitor a batch of recurring payment schedules.
 *
 * After using `schedule:recurring` to create N payment schedules,
 * this script polls each one and prints a summary table.
 */

import { ScheduleClient } from '../src/sdk';

const SCHEDULE_IDS = [
  '0.0.9001',
  '0.0.9002',
  '0.0.9003',
  // … add all schedule IDs from your recurring batch
];

async function main() {
  const client = new ScheduleClient({ network: 'testnet' });

  console.log(`Checking ${SCHEDULE_IDS.length} recurring payment schedules…\n`);
  console.log('  #  Schedule ID    State      Sigs  Expires');
  console.log('  ─  ─────────────  ─────────  ────  ───────────────────────');

  for (const [i, id] of SCHEDULE_IDS.entries()) {
    try {
      const s = await client.getStatus(id);
      const expires = s.expiresAt ? s.expiresAt.slice(0, 19).replace('T', ' ') : '—';
      const row = [
        String(i + 1).padStart(3),
        id.padEnd(13),
        s.state.padEnd(9),
        String(s.signaturesCollected).padStart(4),
        expires,
      ].join('  ');
      console.log(row);
    } catch {
      console.log(`  ${String(i + 1).padStart(2)}  ${id}  NOT FOUND`);
    }
  }
}

main().catch(console.error);
