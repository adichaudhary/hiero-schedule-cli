# Hiero Schedule CLI Plugin

`hiero-schedule-cli` is a repository that contains a `schedule` plugin for the Hiero CLI.

It adds end-to-end support for Hedera scheduled transactions:

- create a scheduled HBAR transfer
- check current schedule state
- watch until terminal state (`EXECUTED` or `DELETED`)

## Commands

| Command | Description |
|---|---|
| `schedule:create` | Wraps an HBAR transfer in `ScheduleCreateTransaction` and submits it |
| `schedule:status` | Fetches a schedule from mirror node and returns `PENDING`, `EXECUTED`, or `DELETED` |
| `schedule:watch` | Polls mirror node until `EXECUTED`, `DELETED`, or timeout |

### schedule:create options

- `--to` (required): recipient account ID, e.g. `0.0.1234`
- `--amount` (required): tinybar amount as a non-negative integer string
- `--expiry-seconds` (optional, default `2592000`): max `5184000`
- `--memo` (optional): max 100 chars

### schedule:status options

- `--schedule-id` (required): schedule ID, e.g. `0.0.5678`

### schedule:watch options

- `--schedule-id` (required): schedule ID to watch
- `--poll-interval` (optional, default `3`)
- `--timeout` (optional, default `3600`)

## Repository Structure

```
src/
    plugins/
        schedule/
            manifest.ts
            index.ts
            commands/
                create/
                status/
                watch/
            __tests__/unit/
```

## Integrating Into Hiero CLI

1. Copy `src/plugins/schedule` into your Hiero CLI repository.
2. Apply the core tx-execution changes documented in `CORE_DIFF.md`.
3. Register the schedule plugin manifest in your CLI plugin loader/registry.

Without the core patch in `CORE_DIFF.md`, `schedule:create` may succeed on-chain but fail to return `scheduleId` from tx execution results.

## Testing

From your Hiero CLI repository root:

```bash
npx jest src/plugins/schedule --coverage
```

Unit tests included in this repo:

- `create.test.ts`
- `status.test.ts`
- `watch.test.ts`
