# Hiero Schedule Plugin

[![CI](https://github.com/hiero-ledger/hiero-schedule/actions/workflows/ci.yml/badge.svg)](https://github.com/hiero-ledger/hiero-schedule/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)

A plugin for [hiero-cli](https://github.com/hiero-ledger/hiero-cli) that adds comprehensive support for Hedera scheduled transactions:

| Capability | Feature |
|---|---|
| Create | Scheduled HBAR transfer with templates, time expressions, file input, and policy guardrails |
| Sign | Single-key (`schedule:sign`) and multi-key (`schedule:cosign`) signature submission |
| Inspect | Live state (`schedule:status`), signature detail (`schedule:signers`), ASCII timeline (`schedule:viz`) |
| Track | Mirror polling engine (`schedule:watch`) with exponential backoff and webhook callbacks |
| Automate | Recurring payment scheduler (`schedule:recurring`) |
| Organise | Local registry (`schedule:list`) with tag and label system, named config profiles |
| SDK | Programmatic JS/TS layer (`ScheduleClient`, `ScheduleWatcher`, `MirrorClient`) — no CLI needed |
| Browser | `fetchScheduleStatus`, `fetchScheduleSigners`, `ScheduleStatusPoller` (no Node.js deps) |

## Prerequisites

- Node.js 20 or later
- npm 10 or later
- A hiero-cli installation (for integration use)

## Installation

### Standalone development repo

```bash
git clone https://github.com/hiero-ledger/hiero-schedule.git
cd hiero-schedule
npm install
```

### Integrating into hiero-cli

1. Copy `src/plugins/schedule/` into `src/plugins/` in your hiero-cli repo.
2. Apply the patch in [CORE_DIFF.md](CORE_DIFF.md) to expose `scheduleId` in `TxExecutionService`.
3. Register the manifest:

```typescript
import { manifest as scheduleManifest } from './plugins/schedule';
pluginRegistry.register(scheduleManifest);
```

## Quickstart

```bash
# Create a scheduled HBAR transfer
hiero schedule:create --to 0.0.1234 --amount 50000000

# Using a template (sets expiry and memo automatically)
hiero schedule:create --to 0.0.1234 --amount 50000000 --template vesting

# Human-readable time expressions
hiero schedule:create --to 0.0.1234 --amount 50000000 --execute-in 30d
hiero schedule:create --to 0.0.1234 --amount 50000000 --execute-at 2025-06-30T00:00:00Z

# Load parameters from a JSON file
hiero schedule:create --from-file ./payment.json --tag "finance,q4"

# Preview without submitting
hiero schedule:create --to 0.0.1234 --amount 50000000 --dry-run

# Enforce a policy (e.g. max amount, allowed recipients)
hiero schedule:create --to 0.0.1234 --amount 100 --policy-file ./my-policy.json

# Sign with a single key
hiero schedule:sign --schedule-id 0.0.5678

# Sign with multiple keys at once
hiero schedule:cosign --schedule-id 0.0.5678 --signer-keys "key-alice,key-bob,key-treasury"

# Check who has signed so far
hiero schedule:signers --schedule-id 0.0.5678

# Check state (PENDING / EXECUTED / DELETED)
hiero schedule:status --schedule-id 0.0.5678

# Poll until executed, deleted, or 10-minute timeout; POST webhook on completion
hiero schedule:watch --schedule-id 0.0.5678 --timeout 600 --webhook-url https://hooks.example.com/notify

# Pre-schedule 12 monthly payments
hiero schedule:recurring --to 0.0.1234 --amount 50000000 --count 12 --memo "Monthly salary"

# List all locally tracked schedules
hiero schedule:list
hiero schedule:list --tag finance --state PENDING

# ASCII lifecycle visualization
hiero schedule:viz --schedule-id 0.0.5678
```

## Commands

### schedule:create

Wraps an HBAR transfer in `ScheduleCreateTransaction` and submits it.

| Option | Required | Default | Description |
|---|---|---|---|
| `--to` | yes | — | Recipient account ID |
| `--amount` | yes | — | Tinybars to transfer |
| `--expiry-seconds` | no | `2592000` | Seconds until expiry |
| `--execute-in` | no | — | Duration expression (`30d`, `2w`, `1h`). Overrides `--expiry-seconds` |
| `--execute-at` | no | — | ISO-8601 or epoch seconds. Overrides `--expiry-seconds` |
| `--memo` | no | — | Memo (max 100 chars) |
| `--template` | no | — | `vesting` \| `escrow` \| `recurring-payment` |
| `--from-file` | no | — | Path to JSON file with field values (CLI flags win) |
| `--tag` | no | — | Comma-separated tags for local registry |
| `--policy-file` | no | `~/.hiero/schedule-policy.json` | Policy guardrail config |
| `--dry-run` | no | `false` | Build without submitting; shows fee estimate |

### schedule:sign

Adds the operator's signature to an existing schedule.

| Option | Required | Description |
|---|---|---|
| `--schedule-id` | yes | Schedule to sign |

### schedule:cosign — Multi-Signature Coordination Layer

Submits a `ScheduleSignTransaction` for each key in `--signer-keys`. All keys are attempted even when one fails; partial results are reported per-key.

| Option | Required | Description |
|---|---|---|
| `--schedule-id` | yes | Schedule to sign |
| `--signer-keys` | yes | Comma-separated key ref IDs (e.g. `key-alice,key-bob`) |

### schedule:signers — Pending Signer Tracking

Shows every signature collected so far (public key prefix + type).

| Option | Required | Description |
|---|---|---|
| `--schedule-id` | yes | Schedule to inspect |

### schedule:status

Returns `PENDING`, `EXECUTED`, or `DELETED` plus signature count from the mirror node.

| Option | Required | Description |
|---|---|---|
| `--schedule-id` | yes | Schedule to check |

### schedule:watch — Mirror Polling Engine

Polls the mirror node until a terminal state or timeout. Fires an optional webhook.

| Option | Required | Default | Description |
|---|---|---|---|
| `--schedule-id` | yes | — | Schedule to watch |
| `--poll-interval` | no | `3` | Seconds between polls |
| `--timeout` | no | `3600` | Max wait in seconds |
| `--webhook-url` | no | — | HTTPS endpoint to POST on terminal state |

### schedule:recurring — Recurring Scheduler Engine

Pre-schedules N HBAR transfers with staggered expiry windows.

| Option | Required | Default | Description |
|---|---|---|---|
| `--to` | yes | — | Recipient for all payments |
| `--amount` | yes | — | Tinybars per payment |
| `--count` | yes | — | Number of schedules (max 50) |
| `--interval-seconds` | no | `2592000` | Expiry offset between consecutive schedules |
| `--first-expiry-seconds` | no | `2592000` | Expiry of the first schedule |
| `--memo` | no | — | Base memo; `(N of M)` appended per schedule |

### schedule:list — Local Schedule Registry

Lists schedules recorded in the local registry with tag/state/network filtering.

| Option | Required | Description |
|---|---|---|
| `--tag` | no | Filter by tag |
| `--network` | no | Filter by network (`testnet`, `mainnet`) |
| `--state` | no | `PENDING` \| `EXECUTED` \| `DELETED` \| `UNKNOWN` |
| `--registry-file` | no | Custom registry path (default: `~/.hiero/schedule-registry.json`) |

## Schedule Templates

Templates set default expiry windows and memo prefixes for common use cases.

| Template | Expiry | Memo prefix | Use case |
|---|---|---|---|
| `vesting` | 60 days (network max) | `[vesting]` | Token vesting arrangements |
| `escrow` | 7 days | `[escrow]` | Two-party escrow settlements |
| `recurring-payment` | 30 days | `[recurring]` | Periodic payment series |

## Policy Guardrails

Create `~/.hiero/schedule-policy.json` (or pass `--policy-file`) to enforce limits:

```json
{
  "maxAmountTinybars": "1000000000",
  "allowedRecipients": ["0.0.1234", "0.0.5678"],
  "blockedRecipients": ["0.0.9999"],
  "maxExpirySeconds": 2592000
}
```

## Webhook Payload

When `--webhook-url` is set on `schedule:watch`, this JSON body is POSTed:

```json
{
  "scheduleId": "0.0.5678",
  "finalState": "EXECUTED",
  "resolvedAt": "2025-01-01T00:00:00.000Z",
  "elapsedSeconds": 42,
  "network": "testnet"
}
```

## Transaction Builder (--from-file)

Pass `--from-file ./payment.json` to load parameters. CLI flags override file values.

```json
{
  "to": "0.0.1234",
  "amount": "50000000",
  "expiry-seconds": 2592000,
  "memo": "Monthly payment",
  "tag": "finance,monthly"
}
```

## Lifecycle States

```
PENDING → EXECUTED   (all required signatures collected before expiry)
PENDING → DELETED    (manually cancelled, expired, or superseded)
```

`TIMEOUT` is a watch-only sentinel — returned when the polling window elapses before a terminal state is reached on-chain.

See [lifecycle.ts](src/plugins/schedule/lifecycle.ts) for the formal `ScheduleState` enum.

## Local Registry

Every successful `schedule:create` is automatically recorded in `~/.hiero/schedule-registry.json`. Use `schedule:list` to query it. The registry is a plain JSON file and can be edited manually.

## Structured Output

All commands return JSON via `--output json` (handled by the hiero-cli core):

```bash
hiero schedule:status --schedule-id 0.0.5678 --output json
```

Zod output schemas are in each command's `output.ts` file.

## Programmatic SDK

Use hiero-schedule from your own application without the CLI:

```typescript
import { ScheduleClient } from '@hiero-ledger/schedule-plugin/sdk';

const client = new ScheduleClient({ network: 'testnet' });

// One-shot status check
const status = await client.getStatus('0.0.5678');
console.log(status.state); // 'PENDING' | 'EXECUTED' | 'DELETED'

// Watch until terminal state
const watcher = client.createWatcher('0.0.5678', { timeoutSeconds: 300 });
watcher.on('executed', (e) => console.log('Executed at', e.resolvedAt));
watcher.on('poll', (e) => console.log(`Poll #${e.pollCount}: ${e.state}`));
await watcher.start();
```

### Mirror failover + exponential backoff

```typescript
import { MirrorClient, BackoffTimer } from '@hiero-ledger/schedule-plugin/sdk';

const client = new MirrorClient({
  urls: [
    'https://mainnet-public.mirrornode.hedera.com',
    'https://mirror.hashionode.com', // fallback
  ],
  backoff: { initialMs: 1000, maxMs: 30_000, multiplier: 2 },
});
```

## Browser Layer

Import the browser-safe module for use in React, Vue, or plain JS — no Node.js dependencies:

```typescript
import { fetchScheduleStatus, ScheduleStatusPoller } from '@hiero-ledger/schedule-plugin/browser';

// One-shot
const status = await fetchScheduleStatus('0.0.5678', 'testnet');

// Polling (React example)
const poller = new ScheduleStatusPoller({
  scheduleId: '0.0.5678',
  network: 'testnet',
  intervalMs: 5_000,
  onPoll: (s) => setStatus(s),
  onTerminal: (s) => setDone(true),
});
poller.start();
// cleanup: poller.stop();
```

## Config Profiles

Switch environments without repeating flags:

```typescript
import { loadProfile, saveProfile } from '@hiero-ledger/schedule-plugin';

// Use a built-in profile (testnet / mainnet / previewnet)
const profile = loadProfile('mainnet');

// Save a custom profile
saveProfile({
  name: 'staging',
  network: 'testnet',
  mirrorNodeUrl: 'https://mirror.staging.internal',
  policyFile: '/etc/hiero/staging-policy.json',
});
```

## JSON Schema Validation

All command input/output types are exported as draft-07 JSON Schemas:

```typescript
import { schemas } from '@hiero-ledger/schedule-plugin/sdk';

// Validate an external payload before passing to the CLI
const schema = schemas['schedule:create'].input;
console.log(JSON.stringify(schema, null, 2));
```

## Examples

See [`examples/`](examples/) for runnable integrations:

| File | Description |
|---|---|
| `basic-transfer.ts` | Status check + watch loop |
| `multisig-escrow.ts` | Multi-sig workflow with exponential backoff |
| `recurring-payments.ts` | Batch status table for recurring schedules |
| `vesting-schedule.ts` | Combined status + signers summary |
| `monitor-with-webhook.ts` | Watch + webhook notification via SDK |

## Repository Structure

```
src/
  core/                          # Type stubs mirroring hiero-cli core
  sdk/                           # Programmatic JS/TS SDK (no CLI infrastructure)
    mirror-client.ts             # MirrorClient (failover) + BackoffTimer
    schedule-watcher.ts          # ScheduleWatcher (typed EventEmitter)
    schedule-client.ts           # ScheduleClient: getStatus / getSigners / createWatcher
    json-schemas.ts              # zodToJsonSchema() + pre-built schemas for all commands
    index.ts                     # SDK public exports
  browser/                       # Browser-safe layer (no fs / os / EventEmitter)
    schedule-status-poller.ts    # fetchScheduleStatus / fetchScheduleSigners / ScheduleStatusPoller
    index.ts
  plugins/
    schedule/
      lifecycle.ts               # ScheduleState enum + helpers
      manifest.ts                # Plugin manifest (all 9 commands)
      index.ts                   # Clean public API re-exports
      config/
        profiles.ts              # Named env profiles (testnet / mainnet / previewnet + custom)
      templates/                 # Vesting, escrow, recurring-payment presets
      registry/                  # Local JSON schedule registry
      utils/
        time-parse.ts            # --execute-in / --execute-at parsing
        policy.ts                # Guardrail validation
        webhook.ts               # Terminal-state callbacks
        collect-signatures.ts    # Multi-key signing utility
      commands/
        create/   sign/   cosign/   signers/
        status/   watch/  recurring/  list/  viz/
      __tests__/unit/            # Jest unit tests (13 test files, 118 tests)
examples/                        # Runnable integration examples
```

### schedule:viz — Lifecycle Visualization

Renders an ASCII timeline showing the current lifecycle stage and signature progress.

| Option | Required | Description |
|---|---|---|
| `--schedule-id` | yes | Schedule to visualize |

## Running Tests

```bash
npm test                  # run all unit tests
npm run test:coverage     # with coverage report
npm run type-check        # TypeScript type check only
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines and DCO sign-off requirements.

## License

Apache License 2.0 — see [LICENSE](LICENSE).
