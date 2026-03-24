import {
  parseAbsoluteTimestamp,
  parseDuration,
  resolveExpirySeconds,
} from '../../utils/time-parse';

describe('parseDuration', () => {
  test.each([
    ['3600s', 3600],
    ['90m', 5400],
    ['1h', 3600],
    ['30d', 2592000],
    ['2w', 1209600],
    ['1 day', 86400],
    ['2 weeks', 1209600],
  ])('"%s" → %i seconds', (input, expected) => {
    expect(parseDuration(input)).toBe(expected);
  });

  test('throws on missing unit', () => {
    expect(() => parseDuration('30')).toThrow('Invalid duration');
  });

  test('throws on unknown unit', () => {
    expect(() => parseDuration('5x')).toThrow('Unknown time unit');
  });

  test('supports decimal values', () => {
    expect(parseDuration('0.5h')).toBe(1800);
  });
});

describe('parseAbsoluteTimestamp', () => {
  test('returns plain integer unchanged', () => {
    expect(parseAbsoluteTimestamp('1735689600')).toBe(1735689600);
  });

  test('parses ISO-8601 datetime', () => {
    const result = parseAbsoluteTimestamp('2024-12-31T00:00:00Z');
    expect(result).toBe(Math.floor(Date.parse('2024-12-31T00:00:00Z') / 1000));
  });

  test('parses plain date (UTC midnight)', () => {
    const result = parseAbsoluteTimestamp('2024-12-31');
    expect(result).toBeGreaterThan(0);
  });

  test('throws on invalid string', () => {
    expect(() => parseAbsoluteTimestamp('not-a-date')).toThrow('Invalid timestamp');
  });
});

describe('resolveExpirySeconds', () => {
  test('returns defaultSeconds when neither executeIn nor executeAt is set', () => {
    expect(resolveExpirySeconds({ defaultSeconds: 2592000 })).toBe(2592000);
  });

  test('uses execute-in duration when provided', () => {
    expect(resolveExpirySeconds({ executeIn: '1h', defaultSeconds: 2592000 })).toBe(3600);
  });

  test('uses execute-at timestamp when provided', () => {
    const futureEpoch = Math.floor(Date.now() / 1000) + 7200;
    const result = resolveExpirySeconds({
      executeAt: String(futureEpoch),
      defaultSeconds: 2592000,
    });
    expect(result).toBeGreaterThan(7190);
    expect(result).toBeLessThanOrEqual(7200);
  });

  test('throws when both execute-in and execute-at are set', () => {
    expect(() =>
      resolveExpirySeconds({
        executeIn: '1h',
        executeAt: '2024-12-31',
        defaultSeconds: 2592000,
      }),
    ).toThrow('not both');
  });

  test('throws when execute-at is in the past', () => {
    expect(() =>
      resolveExpirySeconds({
        executeAt: '2000-01-01',
        defaultSeconds: 2592000,
      }),
    ).toThrow('in the past');
  });
});
