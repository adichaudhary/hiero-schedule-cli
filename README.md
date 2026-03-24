# Hiero Schedule Plugin

[![CI](https://github.com/hiero-ledger/hiero-schedule/actions/workflows/ci.yml/badge.svg)](https://github.com/hiero-ledger/hiero-schedule/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)

A plugin for [hiero-cli](https://github.com/hiero-ledger/hiero-cli) that adds end-to-end support for Hedera scheduled transactions:

- **Create** a scheduled HBAR transfer
- **Sign** an existing schedule to add your signature
- **Check** the current lifecycle state (`PENDING`, `EXECUTED`, `DELETED`)
- **Watch** until terminal state or timeout

## Prerequisites

- Node.js 20 or later
- npm 10 or later
- A hiero-cli installation (for integration use)

## Installation

### As a standalone development repo

```bash
git clone https://github.com/hiero-ledger/hiero-schedule.git
cd hiero-schedule
npm install
```

### Integrating into hiero-cli

1. Copy `src/plugins/schedule/` into your hiero-cli `src/plugins/` directory.
2. Apply the core patch documented in [CORE_DIFF.md](CORE_DIFF.md) to expose `scheduleId` in `TxExecutionService`.
3. Register the manifest in your plugin loader:

```typescript
import { manifest as scheduleManifest } from './plugins/schedule';

pluginRegistry.register(scheduleManifest);
```

## Quickstart

```bash
# Create a scheduled HBAR transfer (held until all signers approve)
hiero schedule:create --to 0.0.1234 --amount 50000000 --memo "season-1"

# Preview without submitting (shows fee estimate)
hiero schedule:create --to 0.0.1234 --amount 50000000 --dry-run

# Add your operator's signature to an existing schedule
hiero schedule:sign --schedule-id 0.0.5678

# Check current state (PENDING / EXECUTED / DELETED)
hiero schedule:status --schedule-id 0.0.5678

# Block until executed, deleted, or 10-minute timeout
hiero schedule:watch --schedule-id 0.0.5678 --timeout 600
```

## Commands

| Command | Description |
|---|---|
| `schedule:create` | Wraps an HBAR transfer in `ScheduleCreateTransaction` and submits it |
| `schedule:sign` | Adds the operator signature to an existing schedule |
| `schedule:status` | Returns current state from mirror node (`PENDING` / `EXECUTED` / `DELETED`) |
| `schedule:watch` | Polls mirror node until terminal state or timeout |

### schedule:create

| Option | Required | Default | Description |
|---|---|---|---|
| `--to` | yes | — | Recipient account ID (e.g. `0.0.1234`) |
| `--amount` | yes | — | Amount in tinybars (e.g. `50000000` = 0.5 HBAR) |
| `--expiry-seconds` | no | `2592000` | Seconds until expiry (max `5184000` = 60 days) |
| `--memo` | no | — | Memo stored on the schedule (max 100 chars) |
| `--dry-run` | no | `false` | Build the transaction without submitting; shows fee estimate |

### schedule:sign

| Option | Required | Description |
|---|---|---|
| `--schedule-id` | yes | Schedule ID to sign (e.g. `0.0.5678`) |

### schedule:status

| Option | Required | Description |
|---|---|---|
| `--schedule-id` | yes | Schedule ID to look up |

### schedule:watch

| Option | Required | Default | Description |
|---|---|---|---|
| `--schedule-id` | yes | — | Schedule ID to watch |
| `--poll-interval` | no | `3` | Polling interval in seconds |
| `--timeout` | no | `3600` | Max seconds to wait before exiting |

## Lifecycle States

A scheduled transaction moves through the following states:

```
PENDING → EXECUTED   (all required signatures collected before expiry)
PENDING → DELETED    (manually cancelled, expired, or superseded)
```

`TIMEOUT` is a polling sentinel returned by `schedule:watch` when the watch window elapses before a terminal on-chain state is reached.

See [src/plugins/schedule/lifecycle.ts](src/plugins/schedule/lifecycle.ts) for the formal state model.

## Structured Output

All commands return structured JSON via `--output json` (handled by the hiero-cli core):

```bash
hiero schedule:status --schedule-id 0.0.5678 --output json
```

Output schemas are defined using Zod in each command's `output.ts` file.

## Repository Structure

```
src/
  core/                          # Type stubs mirroring hiero-cli core
  plugins/
    schedule/
      lifecycle.ts               # Formal ScheduleState enum + helpers
      manifest.ts                # Plugin manifest (all 4 commands)
      index.ts                   # Public API re-exports
      commands/
        create/                  # schedule:create
        sign/                    # schedule:sign
        status/                  # schedule:status
        watch/                   # schedule:watch
      __tests__/unit/            # Jest unit tests
```

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
