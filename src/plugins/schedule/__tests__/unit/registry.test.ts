import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { ScheduleRegistry } from '../../registry/registry';
import type { ScheduleRegistryEntry } from '../../registry/registry.types';

function tempRegistryPath(): string {
  return path.join(os.tmpdir(), `schedule-registry-test-${Date.now()}.json`);
}

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

describe('ScheduleRegistry', () => {
  let registryPath: string;
  let registry: ScheduleRegistry;

  beforeEach(() => {
    registryPath = tempRegistryPath();
    registry = new ScheduleRegistry(registryPath);
  });

  afterEach(() => {
    if (fs.existsSync(registryPath)) fs.unlinkSync(registryPath);
  });

  test('list returns empty array when registry file does not exist', () => {
    expect(registry.list()).toEqual([]);
  });

  test('add persists an entry', () => {
    registry.add(makeEntry());
    expect(registry.list()).toHaveLength(1);
  });

  test('add overwrites an existing entry with same scheduleId', () => {
    registry.add(makeEntry({ state: 'PENDING' }));
    registry.add(makeEntry({ state: 'EXECUTED' }));
    const entries = registry.list();
    expect(entries).toHaveLength(1);
    expect(entries[0]!.state).toBe('EXECUTED');
  });

  test('get returns the correct entry', () => {
    registry.add(makeEntry({ scheduleId: '0.0.1111' }));
    registry.add(makeEntry({ scheduleId: '0.0.2222' }));
    const found = registry.get('0.0.2222');
    expect(found?.scheduleId).toBe('0.0.2222');
  });

  test('get returns undefined for unknown scheduleId', () => {
    expect(registry.get('0.0.9999')).toBeUndefined();
  });

  test('list filters by tag', () => {
    registry.add(makeEntry({ scheduleId: '0.0.1111', tags: ['finance'] }));
    registry.add(makeEntry({ scheduleId: '0.0.2222', tags: ['ops'] }));
    const result = registry.list({ tag: 'finance' });
    expect(result).toHaveLength(1);
    expect(result[0]!.scheduleId).toBe('0.0.1111');
  });

  test('list filters by network', () => {
    registry.add(makeEntry({ scheduleId: '0.0.1111', network: 'testnet' }));
    registry.add(makeEntry({ scheduleId: '0.0.2222', network: 'mainnet' }));
    expect(registry.list({ network: 'mainnet' })).toHaveLength(1);
  });

  test('list filters by state', () => {
    registry.add(makeEntry({ scheduleId: '0.0.1111', state: 'PENDING' }));
    registry.add(makeEntry({ scheduleId: '0.0.2222', state: 'EXECUTED' }));
    expect(registry.list({ state: 'EXECUTED' })).toHaveLength(1);
  });

  test('updateState changes the cached state', () => {
    registry.add(makeEntry());
    registry.updateState('0.0.9000', 'EXECUTED');
    expect(registry.get('0.0.9000')?.state).toBe('EXECUTED');
  });

  test('updateState no-ops for unknown scheduleId', () => {
    registry.add(makeEntry());
    expect(() => registry.updateState('0.0.9999', 'DELETED')).not.toThrow();
    expect(registry.list()).toHaveLength(1);
  });

  test('remove deletes an entry and returns true', () => {
    registry.add(makeEntry());
    expect(registry.remove('0.0.9000')).toBe(true);
    expect(registry.list()).toHaveLength(0);
  });

  test('remove returns false when entry not found', () => {
    expect(registry.remove('0.0.9999')).toBe(false);
  });

  test('addTag appends a tag to an existing entry', () => {
    registry.add(makeEntry({ tags: ['a'] }));
    registry.addTag('0.0.9000', 'b');
    expect(registry.get('0.0.9000')?.tags).toEqual(['a', 'b']);
  });

  test('addTag does not duplicate an existing tag', () => {
    registry.add(makeEntry({ tags: ['a'] }));
    registry.addTag('0.0.9000', 'a');
    expect(registry.get('0.0.9000')?.tags).toEqual(['a']);
  });

  test('count returns total number of entries', () => {
    registry.add(makeEntry({ scheduleId: '0.0.1111' }));
    registry.add(makeEntry({ scheduleId: '0.0.2222' }));
    expect(registry.count()).toBe(2);
  });
});
