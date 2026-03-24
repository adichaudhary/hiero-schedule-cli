# Changelog

All notable changes to `@hiero-ledger/schedule-plugin` are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] — 2026-03-23

### Added

#### Core Plugin (8 commands)

- **schedule:create** — Creates a scheduled HBAR transfer with full option coverage:
  - `--template` preset support (`vesting`, `escrow`, `recurring-payment`)
  - `--execute-in` / `--execute-at` human-readable and absolute time expressions
  - `--from-file` JSON transaction builder
  - `--tag` labelling for local registry
  - `--policy-file` guardrails (max amount, allowed/blocked recipients, max expiry)
  - `--dry-run` mode with fee estimation
- **schedule:sign** — Operator-key signature submission
- **schedule:cosign** — Multi-key concurrent signature submission with per-key results
- **schedule:signers** — Live signature audit (public key prefix + type)
- **schedule:status** — Returns PENDING / EXECUTED / DELETED plus signature count
- **schedule:watch** — Mirror-node polling engine with `--timeout`, `--poll-interval`, `--webhook-url`
- **schedule:recurring** — Pre-schedules N HBAR transfers with staggered expiry windows
- **schedule:list** — Queries the local schedule registry with tag/state/network filters
- **schedule:viz** — ASCII lifecycle timeline visualization

#### SDK Layer (`src/sdk/`)

- `MirrorClient` — HTTP client with multi-URL failover and configurable timeout
- `BackoffTimer` — Exponential backoff utility (initial/max delay, multiplier)
- `ScheduleWatcher` — Typed EventEmitter (`poll`, `executed`, `deleted`, `timeout`, `error`)
- `ScheduleClient` — Programmatic API: `getStatus()`, `getSigners()`, `createWatcher()`
- `zodToJsonSchema()` — Lightweight Zod-to-JSON-Schema converter (draft-07)
- `schemas` — Pre-built JSON Schemas for all 8 command input/output types

#### Browser Layer (`src/browser/`)

- `fetchScheduleStatus()` — One-shot schedule status fetch (browser-safe)
- `fetchScheduleSigners()` — One-shot signers fetch (browser-safe)
- `ScheduleStatusPoller` — Polling class using `setTimeout` (no Node.js dependencies)

#### Infrastructure

- `ScheduleRegistry` — Local JSON file registry with add/list/update/tag operations
- Schedule templates system: `vesting`, `escrow`, `recurring-payment` presets
- `parseDuration()` / `parseAbsoluteTimestamp()` / `resolveExpirySeconds()` time utilities
- `validateCreatePolicy()` / `loadPolicy()` policy guardrails
- `notifyWebhook()` terminal-state HTTP callback
- `collectSignatures()` multi-key signing orchestrator
- Config profiles system (`loadProfile`, `saveProfile`, `listProfiles`, `deleteProfile`)
  with built-in `testnet`, `mainnet`, `previewnet` profiles
- GitHub Actions CI pipeline (Node 20 + 22 matrix, type-check + jest)
- Formal `ScheduleState` enum with `deriveScheduleState()` and `isTerminal()`

#### Examples (`examples/`)

- `basic-transfer.ts` — SDK status check + watch loop
- `multisig-escrow.ts` — Multi-sig workflow with exponential backoff
- `recurring-payments.ts` — Batch status table for recurring schedules
- `vesting-schedule.ts` — Combined status + signers summary
- `monitor-with-webhook.ts` — Watch + webhook notification via SDK

### Tests

- 12 test suites, 100+ tests, all passing on Node 20 and 22

---

[1.0.0]: https://github.com/hiero-ledger/hiero-schedule/releases/tag/v1.0.0
