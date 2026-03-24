import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

import {
  loadPolicy,
  PolicyViolationError,
  validateCreatePolicy,
} from '../../utils/policy';

describe('validateCreatePolicy', () => {
  test('passes when policy is empty (no restrictions)', () => {
    expect(() =>
      validateCreatePolicy(
        { to: '0.0.1234', amountTinybars: '999999999', expirySeconds: 9999999 },
        {},
      ),
    ).not.toThrow();
  });

  test('throws PolicyViolationError when amount exceeds max', () => {
    expect(() =>
      validateCreatePolicy(
        { to: '0.0.1234', amountTinybars: '200', expirySeconds: 100 },
        { maxAmountTinybars: '100' },
      ),
    ).toThrow(PolicyViolationError);
  });

  test('passes when amount equals max', () => {
    expect(() =>
      validateCreatePolicy(
        { to: '0.0.1234', amountTinybars: '100', expirySeconds: 100 },
        { maxAmountTinybars: '100' },
      ),
    ).not.toThrow();
  });

  test('throws when recipient is blocked', () => {
    expect(() =>
      validateCreatePolicy(
        { to: '0.0.9999', amountTinybars: '1', expirySeconds: 100 },
        { blockedRecipients: ['0.0.9999'] },
      ),
    ).toThrow(PolicyViolationError);
  });

  test('throws when recipient is not on allowlist', () => {
    expect(() =>
      validateCreatePolicy(
        { to: '0.0.5000', amountTinybars: '1', expirySeconds: 100 },
        { allowedRecipients: ['0.0.1234', '0.0.5678'] },
      ),
    ).toThrow(PolicyViolationError);
  });

  test('passes when recipient is on allowlist', () => {
    expect(() =>
      validateCreatePolicy(
        { to: '0.0.1234', amountTinybars: '1', expirySeconds: 100 },
        { allowedRecipients: ['0.0.1234'] },
      ),
    ).not.toThrow();
  });

  test('throws when expiry exceeds policy max', () => {
    expect(() =>
      validateCreatePolicy(
        { to: '0.0.1234', amountTinybars: '1', expirySeconds: 9000 },
        { maxExpirySeconds: 3600 },
      ),
    ).toThrow(PolicyViolationError);
  });

  test('PolicyViolationError has correct name', () => {
    try {
      validateCreatePolicy(
        { to: '0.0.1234', amountTinybars: '999', expirySeconds: 100 },
        { maxAmountTinybars: '1' },
      );
    } catch (err) {
      expect(err).toBeInstanceOf(PolicyViolationError);
      expect((err as Error).name).toBe('PolicyViolationError');
    }
  });
});

describe('loadPolicy', () => {
  test('returns empty object when file does not exist', () => {
    const result = loadPolicy('/nonexistent/path/policy.json');
    expect(result).toEqual({});
  });

  test('loads and parses a valid policy file', () => {
    const dir = os.tmpdir();
    const filePath = path.join(dir, 'test-policy.json');
    const policy = { maxAmountTinybars: '1000000', allowedRecipients: ['0.0.1234'] };
    fs.writeFileSync(filePath, JSON.stringify(policy));

    const result = loadPolicy(filePath);
    expect(result).toEqual(policy);

    fs.unlinkSync(filePath);
  });
});
