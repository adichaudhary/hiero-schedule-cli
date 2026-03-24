import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import type { CommandHandlerArgs } from '@/core';

import { Status } from '@/core/shared/constants';

import { listSchedules } from '../../commands/list/handler';
import type { ListOutput } from '../../commands/list/output';
import type { ScheduleRegistryEntry } from '../../registry/registry.types';

const makeLogger = () => ({
  info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn(),
});

function makeEntry(overrides: Partial<ScheduleRegistryEntry> = {}): ScheduleRegistryEntry {
  return {
    scheduleId: '0.0.9000',
    transactionId: '0.0.1001@1700000000.000000000',
    network: 'testnet',
    payer: '0.0.1001',
    tags: [],
    createdAt: new Date().toISOString(),
    state: 'PENDING',
    ...overrides,
  };
}

function makeArgs(
  argOverrides: Record<string, unknown> = {},
  registryPath?: string,
): CommandHandlerArgs {
  return {
    args: { 'registry-file': registryPath, ...argOverrides },
    api: {} as unknown as CommandHandlerArgs['api'],
    logger: makeLogger(),
    state: {} as CommandHandlerArgs['state'],
    config: {} as CommandHandlerArgs['config'],
  };
}

describe('schedule:list handler', () => {
  let registryPath: string;

  beforeEach(() => {
    registryPath = path.join(os.tmpdir(), `list-test-${Date.now()}.json`);
  });

  afterEach(() => {
    if (fs.existsSync(registryPath)) fs.unlinkSync(registryPath);
  });

  test('returns empty list when registry does not exist', async () => {
    const result = await listSchedules(makeArgs({}, registryPath));

    expect(result.status).toBe(Status.Success);
    const output: ListOutput = JSON.parse(result.outputJson!);
    expect(output.count).toBe(0);
    expect(output.entries).toEqual([]);
  });

  test('returns all entries without filters', async () => {
    const entries = [
      makeEntry({ scheduleId: '0.0.1111' }),
      makeEntry({ scheduleId: '0.0.2222' }),
    ];
    fs.writeFileSync(registryPath, JSON.stringify(entries));

    const result = await listSchedules(makeArgs({}, registryPath));
    const output: ListOutput = JSON.parse(result.outputJson!);
    expect(output.count).toBe(2);
  });

  test('filters by tag', async () => {
    const entries = [
      makeEntry({ scheduleId: '0.0.1111', tags: ['finance'] }),
      makeEntry({ scheduleId: '0.0.2222', tags: ['ops'] }),
    ];
    fs.writeFileSync(registryPath, JSON.stringify(entries));

    const result = await listSchedules(makeArgs({ tag: 'finance' }, registryPath));
    const output: ListOutput = JSON.parse(result.outputJson!);
    expect(output.count).toBe(1);
    expect(output.entries[0]!.scheduleId).toBe('0.0.1111');
  });

  test('filters by state', async () => {
    const entries = [
      makeEntry({ scheduleId: '0.0.1111', state: 'PENDING' }),
      makeEntry({ scheduleId: '0.0.2222', state: 'EXECUTED' }),
    ];
    fs.writeFileSync(registryPath, JSON.stringify(entries));

    const result = await listSchedules(makeArgs({ state: 'EXECUTED' }, registryPath));
    const output: ListOutput = JSON.parse(result.outputJson!);
    expect(output.count).toBe(1);
    expect(output.entries[0]!.state).toBe('EXECUTED');
  });

  test('output contains applied filters', async () => {
    fs.writeFileSync(registryPath, JSON.stringify([]));
    const result = await listSchedules(
      makeArgs({ tag: 'finance', network: 'testnet' }, registryPath),
    );
    const output: ListOutput = JSON.parse(result.outputJson!);
    expect(output.filters.tag).toBe('finance');
    expect(output.filters.network).toBe('testnet');
  });
});
