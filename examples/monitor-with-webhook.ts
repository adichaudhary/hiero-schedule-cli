/**
 * Example: Watch a schedule and POST a webhook on terminal state.
 *
 * Mirrors the schedule:watch --webhook-url CLI flag but uses the SDK
 * directly so you can embed this in a larger application.
 */

import { ScheduleClient } from '../src/sdk';
import { notifyWebhook } from '../src/plugins/schedule/utils/webhook';

const SCHEDULE_ID = '0.0.5678';
const WEBHOOK_URL = 'https://hooks.example.com/hedera/schedule';
const NETWORK = 'testnet';

async function main() {
  const client = new ScheduleClient({ network: NETWORK });
  const watcher = client.createWatcher(SCHEDULE_ID, {
    pollIntervalSeconds: 10,
    timeoutSeconds: 3600,
  });

  const startedAt = Date.now();

  watcher.on('poll', (e) => process.stdout.write(`.`));

  async function onTerminal(state: 'EXECUTED' | 'DELETED' | 'TIMEOUT') {
    const elapsedSeconds = Math.round((Date.now() - startedAt) / 1000);
    const payload = {
      scheduleId: SCHEDULE_ID,
      finalState: state,
      resolvedAt: new Date().toISOString(),
      elapsedSeconds,
      network: NETWORK,
    };

    console.log(`\n\nTerminal state: ${state} after ${elapsedSeconds}s`);
    console.log('Notifying webhook…');

    const result = await notifyWebhook(WEBHOOK_URL, payload);
    if (result.ok) {
      console.log('Webhook notified successfully.');
    } else {
      console.error('Webhook notification failed:', result.error);
    }
  }

  watcher.on('executed', (e) => onTerminal('EXECUTED').catch(console.error));
  watcher.on('deleted', (e) => onTerminal('DELETED').catch(console.error));
  watcher.on('timeout', () => onTerminal('TIMEOUT').catch(console.error));
  watcher.on('error', (e) => {
    console.error('\nWatcher error:', e.error.message);
    process.exit(1);
  });

  console.log(`Watching ${SCHEDULE_ID} on ${NETWORK}…`);
  await watcher.start();
}

main().catch(console.error);
