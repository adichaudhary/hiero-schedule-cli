/**
 * Hiero Schedule API Server
 *
 * Provides a local REST API so the frontend can create and sign Hedera
 * scheduled transactions without exposing private keys to the browser.
 *
 * Endpoints:
 *   POST /api/schedules              — create a scheduled HBAR transfer
 *   POST /api/schedules/recurring    — create N recurring scheduled transfers
 *   POST /api/schedules/:id/sign     — sign an existing schedule
 *   GET  /api/registry               — list locally tracked schedules
 *
 * ⚠️  For local development only. Never deploy this with real private keys
 *     over an untrusted network.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import express, { Request, Response } from 'express';
import cors from 'cors';
import {
  AccountId,
  Client,
  Hbar,
  PrivateKey,
  ScheduleCreateTransaction,
  ScheduleSignTransaction,
  Timestamp,
  TransferTransaction,
} from '@hashgraph/sdk';

const app = express();

app.use(cors({ origin: /^http:\/\/localhost(:\d+)?$/ }));
app.use(express.json());

// ── Hedera client factory ─────────────────────────────────────────────────────

function buildClient(network: string, accountId: string, privateKey: string): Client {
  const client =
    network === 'mainnet'    ? Client.forMainnet() :
    network === 'previewnet' ? Client.forPreviewnet() :
                               Client.forTestnet();

  client.setOperator(AccountId.fromString(accountId), PrivateKey.fromString(privateKey));
  return client;
}

// ── POST /api/schedules — create a scheduled HBAR transfer ───────────────────

interface CreateBody {
  accountId: string;
  privateKey: string;
  network?: string;
  to: string;
  amount: string;
  memo?: string;
  expirySeconds?: number;
}

app.post('/api/schedules', async (req: Request, res: Response) => {
  const {
    accountId,
    privateKey,
    network = 'testnet',
    to,
    amount,
    memo,
    expirySeconds = 2_592_000,
  } = req.body as CreateBody;

  if (!accountId || !privateKey || !to || !amount) {
    res.status(400).json({ error: 'accountId, privateKey, to, and amount are required' });
    return;
  }

  if (!/^\d+$/.test(amount)) {
    res.status(400).json({ error: 'amount must be a non-negative integer string (tinybars)' });
    return;
  }

  const client = buildClient(network, accountId, privateKey);

  try {
    const innerTx = new TransferTransaction()
      .addHbarTransfer(to, Hbar.fromTinybars(amount))
      .addHbarTransfer(accountId, Hbar.fromTinybars(`-${amount}`));

    const expiresAt = new Timestamp(Math.floor(Date.now() / 1000) + expirySeconds, 0);

    const scheduleTx = new ScheduleCreateTransaction()
      .setScheduledTransaction(innerTx)
      .setExpirationTime(expiresAt)
      .setWaitForExpiry(true);

    if (memo) scheduleTx.setScheduleMemo(memo);

    const response = await scheduleTx.execute(client);
    const receipt  = await response.getReceipt(client);

    if (!receipt.scheduleId) {
      res.status(500).json({ error: 'Transaction succeeded but no scheduleId was returned in the receipt.' });
      return;
    }

    res.json({
      scheduleId:    receipt.scheduleId.toString(),
      transactionId: response.transactionId.toString(),
      payer:         accountId,
      network,
      expirySeconds,
      expiresAt: new Date((Math.floor(Date.now() / 1000) + expirySeconds) * 1000).toISOString(),
      memo: memo ?? null,
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  } finally {
    client.close();
  }
});

// ── POST /api/schedules/recurring — create N recurring transfers ──────────────

interface RecurringBody {
  accountId: string;
  privateKey: string;
  network?: string;
  to: string;
  amount: string;
  count: number;
  intervalSeconds?: number;
  firstExpirySeconds?: number;
  memo?: string;
}

app.post('/api/schedules/recurring', async (req: Request, res: Response) => {
  const {
    accountId,
    privateKey,
    network = 'testnet',
    to,
    amount,
    count,
    intervalSeconds = 2_592_000,
    firstExpirySeconds = 2_592_000,
    memo,
  } = req.body as RecurringBody;

  if (!accountId || !privateKey || !to || !amount || !count) {
    res.status(400).json({ error: 'accountId, privateKey, to, amount, and count are required' });
    return;
  }

  if (!/^\d+$/.test(amount)) {
    res.status(400).json({ error: 'amount must be a non-negative integer string (tinybars)' });
    return;
  }

  const total = Math.min(Number(count), 50);
  const results: Array<{ index: number; scheduleId: string; transactionId: string; expirySeconds: number }> = [];
  const errors:  Array<{ index: number; error: string }> = [];

  for (let i = 0; i < total; i++) {
    const client = buildClient(network, accountId, privateKey);
    try {
      const expirySeconds = firstExpirySeconds + i * intervalSeconds;
      const scheduleMemo  = memo
        ? `${memo} (${i + 1} of ${total})`
        : `Recurring payment (${i + 1} of ${total})`;

      const innerTx = new TransferTransaction()
        .addHbarTransfer(to, Hbar.fromTinybars(amount))
        .addHbarTransfer(accountId, Hbar.fromTinybars(`-${amount}`));

      const expiresAt = new Timestamp(Math.floor(Date.now() / 1000) + expirySeconds, 0);

      const scheduleTx = new ScheduleCreateTransaction()
        .setScheduledTransaction(innerTx)
        .setExpirationTime(expiresAt)
        .setWaitForExpiry(true)
        .setScheduleMemo(scheduleMemo);

      const response = await scheduleTx.execute(client);
      const receipt  = await response.getReceipt(client);

      results.push({
        index:         i + 1,
        scheduleId:    receipt.scheduleId?.toString() ?? '',
        transactionId: response.transactionId.toString(),
        expirySeconds,
      });
    } catch (err) {
      errors.push({ index: i + 1, error: err instanceof Error ? err.message : String(err) });
    } finally {
      client.close();
    }
  }

  res.json({ results, errors, total, succeeded: results.length });
});

// ── POST /api/schedules/:id/sign — sign an existing schedule ─────────────────

interface SignBody {
  accountId: string;
  privateKey: string;
  network?: string;
}

app.post('/api/schedules/:id/sign', async (req: Request, res: Response) => {
  const scheduleId = req.params['id'] as string;
  const { accountId, privateKey, network = 'testnet' } = req.body as SignBody;

  if (!accountId || !privateKey) {
    res.status(400).json({ error: 'accountId and privateKey are required' });
    return;
  }

  const client = buildClient(network, accountId, privateKey);

  try {
    const signTx   = new ScheduleSignTransaction().setScheduleId(scheduleId);
    const response = await signTx.execute(client);
    await response.getReceipt(client);

    res.json({
      scheduleId,
      transactionId: response.transactionId.toString(),
      signer:  accountId,
      network,
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  } finally {
    client.close();
  }
});

// ── GET /api/registry — list locally tracked schedules ───────────────────────

app.get('/api/registry', (_req: Request, res: Response) => {
  const registryPath = path.join(os.homedir(), '.hiero', 'schedule-registry.json');
  try {
    if (!fs.existsSync(registryPath)) {
      res.json([]);
      return;
    }
    const content = fs.readFileSync(registryPath, 'utf-8');
    const data = JSON.parse(content) as unknown;
    res.json(Array.isArray(data) ? data : []);
  } catch (err) {
    res.status(500).json({ error: 'Failed to read local registry' });
  }
});

// ── Health check ─────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => res.json({ ok: true }));

// ── Start ─────────────────────────────────────────────────────────────────────

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Hiero Schedule API  →  http://localhost:${PORT}`);
  console.log('⚠️  Local dev only — do not expose this server publicly.');
});
