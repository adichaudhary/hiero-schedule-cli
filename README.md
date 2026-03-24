# hiero-schedule

[![CI](https://github.com/adichaudhary/hiero-schedule-cli/actions/workflows/ci.yml/badge.svg)](https://github.com/adichaudhary/hiero-schedule-cli/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](package.json)
[![Tests](https://img.shields.io/badge/tests-118%20passing-brightgreen)](#running-tests)

A Hiero-ready open-source TypeScript library that makes it easy for developers to create, sign, inspect, and monitor Hedera scheduled transactions — as a CLI plugin, a Node.js SDK, or a browser module.

Scheduled transactions are one of Hedera's most powerful primitives, but there is no dedicated developer tooling for them in the ecosystem. This library fills that gap. It was born out of real production use: an earlier version powered the game-season lifecycle engine in [StakeClash](https://github.com/jazibrq/StakeClash), a project that won a main track prize at ETH Denver by driving automated on-chain game seasons through scheduled transactions.

---

## Architecture

The library ships as three independently consumable layers from a single package.

```
┌─────────────────────────────────────────────────────────────────┐
│                        Your Application                          │
│                                                                  │
│   ┌──────────────────┐  ┌────────────────┐  ┌───────────────┐  │
│   │   CLI Plugin     │  │  Node.js SDK   │  │ Browser Module│  │
│   │  (9 commands)    │  │ ScheduleClient │  │fetchSchedule  │  │
│   │  hiero-cli       │  │ ScheduleWatcher│  │Status/Signers │  │
│   │  integration     │  │ MirrorClient   │  │StatusPoller   │  │
│   └────────┬─────────┘  └───────┬────────┘  └──────┬────────┘  │
└────────────┼────────────────────┼──────────────────┼────────────┘
             │                    │                  │
             ▼                    ▼                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Hedera Network                            │
│                                                                  │
│   ┌──────────────────────────────┐  ┌────────────────────────┐  │
│   │    Hedera Consensus Nodes    │  │  Mirror Node REST API  │  │
│   │  ScheduleCreateTransaction   │  │  /api/v1/schedules/:id │  │
│   │  ScheduleSignTransaction     │  │  (failover + backoff)  │  │
│   └──────────────────────────────┘  └────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Schedule Lifecycle

```
                    schedule:create
                          │
                          ▼
                      ┌───────┐
                      │PENDING│ ◄── signatures collecting
                      └───┬───┘
               ┌──────────┴──────────┐
               ▼                     ▼
          ┌──────────┐          ┌─────────┐
          │ EXECUTED │          │ DELETED │
          │ (all sigs│          │(expired │
          │collected)│          │cancelled│
          └──────────┘          └─────────┘

  TIMEOUT is a watch-only sentinel — the schedule stays
  on-chain; only the local polling window has elapsed.
```

---

## What's in the box

| Layer | Exports | Environment |
|---|---|---|
| CLI Plugin | 9 commands via `hiero-cli` | Node.js |
| Node.js SDK | `ScheduleClient`, `ScheduleWatcher`, `MirrorClient`, `BackoffTimer` | Node.js |
| Browser Module | `fetchScheduleStatus`, `fetchScheduleSigners`, `ScheduleStatusPoller` | Browser / any `fetch` |

| Capability | Detail |
|---|---|
| Create | Scheduled HBAR transfer with templates, time expressions, file input, policy guardrails |
| Sign | Single-key (`schedule:sign`) and multi-key (`schedule:cosign`) signature coordination |
| Inspect | Live state (`schedule:status`), signature detail (`schedule:signers`), ASCII timeline (`schedule:viz`) |
| Watch | Mirror polling engine with exponential backoff and webhook callbacks (`schedule:watch`) |
| Automate | Recurring payment scheduler (`schedule:recurring`) |
| Organise | Local registry (`schedule:list`) with tag system and named config profiles |

---

## Prerequisites

- Node.js 20 or later
- npm 10 or later
- A hiero-cli installation (for CLI integration only)

---

## Installation

**Clone and run standalone:**

```bash
git clone https://github.com/adichaudhary/hiero-schedule-cli.git
cd hiero-schedule-cli
npm install
```

**Integrate into hiero-cli:**

Copy `src/plugins/schedule/` into `src/plugins/` in your hiero-cli repo, apply the patch in [CORE_DIFF.md](CORE_DIFF.md) to expose `scheduleId` in `TxExecutionService`, then register the manifest:

```typescript
import { manifest as scheduleManifest } from './plugins/schedule';
pluginRegistry.register(scheduleManifest);
```

---

## Quickstart

### CLI

```bash
# Create a scheduled HBAR transfer
hiero schedule:create --to 0.0.1234 --amount 50000000

# Use a template (sets expiry and memo automatically)
hiero schedule:create --to 0.0.1234 --amount 50000000 --template vesting

# Human-readable expiry expressions
hiero schedule:create --to 0.0.1234 --amount 50000000 --execute-in 30d
hiero schedule:create --to 0.0.1234 --amount 50000000 --execute-at 2025-06-30T00:00:00Z

# Preview without submitting
hiero schedule:create --to 0.0.1234 --amount 50000000 --dry-run

# Sign with a single key
hiero schedule:sign --schedule-id 0.0.5678

# Sign with multiple keys at once
hiero schedule:cosign --schedule-id 0.0.5678 --signer-keys "key-alice,key-bob,key-treasury"

# Check state (PENDING / EXECUTED / DELETED)
hiero schedule:status --schedule-id 0.0.5678

# Poll until executed or deleted, fire webhook on completion
hiero schedule:watch --schedule-id 0.0.5678 --timeout 600 --webhook-url https://hooks.example.com/notify

# Pre-schedule 12 monthly payments
hiero schedule:recurring --to 0.0.1234 --amount 50000000 --count 12 --memo "Monthly salary"

# List and filter locally tracked schedules
hiero schedule:list --tag finance --state PENDING

# ASCII lifecycle visualization
hiero schedule:viz --schedule-id 0.0.5678
```

### Node.js SDK

```typescript
import { ScheduleClient } from '@hiero-ledger/schedule-plugin/sdk';

const client = new ScheduleClient({ network: 'testnet' });

// One-shot status check
const status = await client.getStatus('0.0.5678');
console.log(status.state); // 'PENDING' | 'EXECUTED' | 'DELETED'

// Watch until terminal state
const watcher = client.createWatcher('0.0.5678', { timeoutSeconds: 300 });
watcher.on('poll',     (e) => console.log(`Poll #${e.pollCount}: ${e.state}`));
watcher.on('executed', (e) => console.log('Executed at', e.resolvedAt));
watcher.on('deleted',  (e) => console.log('Deleted at', e.resolvedAt));
watcher.on('timeout',  (e) => console.log(`Timed out after ${e.elapsedSeconds}s`));
await watcher.start();
```

### Browser

```typescript
import { fetchScheduleStatus, ScheduleStatusPoller } from '@hiero-ledger/schedule-plugin/browser';

// One-shot fetch (no Node.js deps — works in any browser)
const status = await fetchScheduleStatus('0.0.5678', 'testnet');
console.log(status.state, status.signaturesCollected);

// Live polling (React example)
const poller = new ScheduleStatusPoller({
  scheduleId: '0.0.5678',
  network:    'testnet',
  intervalMs: 5_000,
  onPoll:     (s) => setStatus(s),
  onTerminal: (s) => setDone(true),
});
poller.start();
// cleanup: poller.stop();
```

---

## CLI Command Reference

### schedule:create

Wraps an HBAR transfer in `ScheduleCreateTransaction` and submits it.

| Option | Required | Default | Description |
|---|---|---|---|
| `--to` | yes | | Recipient account ID |
| `--amount` | yes | | Tinybars to transfer |
| `--expiry-seconds` | no | `2592000` | Seconds until expiry |
| `--execute-in` | no | | Duration expression (`30d`, `2w`, `1h`) — overrides `--expiry-seconds` |
| `--execute-at` | no | | ISO-8601 or epoch seconds — overrides `--expiry-seconds` |
| `--memo` | no | | Memo (max 100 chars) |
| `--template` | no | | `vesting` \| `escrow` \| `recurring-payment` |
| `--from-file` | no | | Path to JSON file with field values (CLI flags win) |
| `--tag` | no | | Comma-separated tags for local registry |
| `--policy-file` | no | `~/.hiero/schedule-policy.json` | Policy guardrail config |
| `--dry-run` | no | `false` | Build without submitting; shows fee estimate |

### schedule:sign

Adds the operator's signature to an existing schedule.

| Option | Required | Description |
|---|---|---|
| `--schedule-id` | yes | Schedule to sign |

### schedule:cosign

Submits a `ScheduleSignTransaction` for each key in `--signer-keys`. All keys are attempted even when one fails; partial results are reported per-key.

| Option | Required | Description |
|---|---|---|
| `--schedule-id` | yes | Schedule to sign |
| `--signer-keys` | yes | Comma-separated key ref IDs (e.g. `key-alice,key-bob`) |

### schedule:signers

Shows every signature collected so far with public key prefix and type.

| Option | Required | Description |
|---|---|---|
| `--schedule-id` | yes | Schedule to inspect |

### schedule:status

Returns `PENDING`, `EXECUTED`, or `DELETED` plus signature count from the mirror node.

| Option | Required | Description |
|---|---|---|
| `--schedule-id` | yes | Schedule to check |

### schedule:watch

Polls the mirror node until a terminal state or timeout. Fires an optional webhook on completion.

| Option | Required | Default | Description |
|---|---|---|---|
| `--schedule-id` | yes | | Schedule to watch |
| `--poll-interval` | no | `3` | Seconds between polls |
| `--timeout` | no | `3600` | Max wait in seconds |
| `--webhook-url` | no | | HTTPS endpoint to POST on terminal state |

### schedule:recurring

Pre-schedules N HBAR transfers with staggered expiry windows.

| Option | Required | Default | Description |
|---|---|---|---|
| `--to` | yes | | Recipient for all payments |
| `--amount` | yes | | Tinybars per payment |
| `--count` | yes | | Number of schedules (max 50) |
| `--interval-seconds` | no | `2592000` | Expiry offset between consecutive schedules |
| `--first-expiry-seconds` | no | `2592000` | Expiry of the first schedule |
| `--memo` | no | | Base memo; `(N of M)` appended per schedule |

### schedule:list

Lists schedules recorded in the local registry with tag, state, and network filtering.

| Option | Required | Description |
|---|---|---|
| `--tag` | no | Filter by tag |
| `--network` | no | Filter by network (`testnet`, `mainnet`) |
| `--state` | no | `PENDING` \| `EXECUTED` \| `DELETED` \| `UNKNOWN` |
| `--registry-file` | no | Custom registry path (default: `~/.hiero/schedule-registry.json`) |

### schedule:viz

Renders an ASCII timeline showing the current lifecycle stage and signature progress.

| Option | Required | Description |
|---|---|---|
| `--schedule-id` | yes | Schedule to visualize |

---

## Templates

Templates set default expiry windows and memo prefixes for common use cases. Pass `--template <name>` to `schedule:create`.

| Template | Expiry | Memo prefix | Use case |
|---|---|---|---|
| `vesting` | 60 days (network max) | `[vesting]` | Token vesting arrangements |
| `escrow` | 7 days | `[escrow]` | Two-party escrow settlements |
| `recurring-payment` | 30 days | `[recurring]` | Periodic payment series |

---

## Policy Guardrails

Create `~/.hiero/schedule-policy.json` (or pass `--policy-file`) to enforce limits at create time:

```json
{
  "maxAmountTinybars": "1000000000",
  "allowedRecipients": ["0.0.1234", "0.0.5678"],
  "blockedRecipients": ["0.0.9999"],
  "maxExpirySeconds": 2592000
}
```

---

## Mirror Failover and Backoff

```typescript
import { MirrorClient } from '@hiero-ledger/schedule-plugin/sdk';

const mirror = new MirrorClient({
  urls: [
    'https://mainnet-public.mirrornode.hedera.com',
    'https://mirror.hashionode.com',
  ],
  backoff: { initialMs: 1000, maxMs: 30_000, multiplier: 2 },
});
```

---

## Webhook Payload

When `--webhook-url` is provided to `schedule:watch`, this JSON body is POSTed on terminal state:

```json
{
  "scheduleId": "0.0.5678",
  "finalState": "EXECUTED",
  "resolvedAt": "2025-01-01T00:00:00.000Z",
  "elapsedSeconds": 42,
  "network": "testnet"
}
```

---

## Transaction File Input

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

---

## Config Profiles

Switch environments without repeating flags:

```typescript
import { loadProfile, saveProfile } from '@hiero-ledger/schedule-plugin';

const profile = loadProfile('mainnet');

saveProfile({
  name: 'staging',
  network: 'testnet',
  mirrorNodeUrl: 'https://mirror.staging.internal',
  policyFile: '/etc/hiero/staging-policy.json',
});
```

---

## JSON Schema Export

All command input and output types are exported as draft-07 JSON Schemas for use in validators, form builders, or API documentation:

```typescript
import { schemas } from '@hiero-ledger/schedule-plugin/sdk';

const schema = schemas['schedule:create'].input;
console.log(JSON.stringify(schema, null, 2));
```

---

## Structured Output

All commands support `--output json` for machine-readable output:

```bash
hiero schedule:status --schedule-id 0.0.5678 --output json
```

Zod output schemas are in each command's `output.ts` file.

---

## Examples

See [`examples/`](examples/) for runnable integrations:

| File | Description |
|---|---|
| `basic-transfer.ts` | Status check + watch loop |
| `multisig-escrow.ts` | Multi-sig workflow with exponential backoff |
| `recurring-payments.ts` | Batch status table for recurring schedules |
| `vesting-schedule.ts` | Combined status + signers summary |
| `monitor-with-webhook.ts` | Watch + webhook notification via SDK |

---

## Repository Structure

```
src/
  core/                           Type stubs mirroring hiero-cli core
  sdk/                            Programmatic JS/TS SDK (no CLI infrastructure)
    mirror-client.ts              MirrorClient (failover + backoff) + BackoffTimer
    schedule-watcher.ts           ScheduleWatcher (typed EventEmitter)
    schedule-client.ts            ScheduleClient: getStatus / getSigners / createWatcher
    json-schemas.ts               zodToJsonSchema() + pre-built schemas for all commands
    index.ts                      SDK public exports
  browser/                        Browser-safe layer (no fs / os / EventEmitter)
    schedule-status-poller.ts     fetchScheduleStatus / fetchScheduleSigners / ScheduleStatusPoller
    index.ts
  plugins/
    schedule/
      lifecycle.ts                ScheduleState enum + helpers
      manifest.ts                 Plugin manifest (all 9 commands)
      index.ts                    Clean public API re-exports
      config/
        profiles.ts               Named env profiles (testnet / mainnet / previewnet + custom)
      templates/                  Vesting, escrow, recurring-payment presets
      registry/                   Local JSON schedule registry
      utils/
        time-parse.ts             --execute-in / --execute-at parsing
        policy.ts                 Guardrail validation
        webhook.ts                Terminal-state callbacks
        collect-signatures.ts     Multi-key signing utility
      commands/
        create/  sign/  cosign/  signers/
        status/  watch/ recurring/ list/ viz/
      __tests__/unit/             Jest unit tests (13 files, 118 tests)
examples/                         Runnable integration examples
frontend/                         Reference dashboard (Vite + TypeScript)
server/                           Local API server for frontend create/sign
```

---

## Running Tests

```bash
npm test                   # run all 118 unit tests
npm run test:coverage      # with coverage report
npm run type-check         # TypeScript strict mode check
```

CI runs on every push and pull request against Node.js 20 and 22. See [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

---

## Contributing

All contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for the full workflow including DCO sign-off requirements, commit message format, and code style guidelines.

**DCO sign-off** — every commit must include a `Signed-off-by` trailer certifying you have the right to submit the work under Apache 2.0:

```bash
git commit -s -m "feat(create): add support for multi-asset transfers"
```

Commits without a `Signed-off-by` line will not be merged.

**GPG signed commits** — all commits in this repository are GPG signed. Configure Git to sign your commits before opening a pull request:

```bash
git config --global user.signingkey <your-key-id>
git config --global commit.gpgsign true
```

---

## License

Apache License 2.0 — see [LICENSE](LICENSE).
