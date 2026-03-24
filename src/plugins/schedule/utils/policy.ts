/**
 * Policy guardrails and safety checks for schedule operations.
 *
 * A policy configuration file at ~/.hiero/schedule-policy.json (or a path
 * supplied via --policy-file) is loaded at runtime. An absent file means
 * "no restrictions" (all operations allowed).
 *
 * Example policy file:
 * {
 *   "maxAmountTinybars": "1000000000",
 *   "allowedRecipients": ["0.0.1234", "0.0.5678"],
 *   "blockedRecipients": ["0.0.9999"],
 *   "maxExpirySeconds": 2592000
 * }
 */
import * as fs from 'fs';
import * as path from 'path';

export interface PolicyConfig {
  /** Maximum transfer amount in tinybars (as a decimal string to avoid JS precision loss). */
  maxAmountTinybars?: string;

  /**
   * Allowlist of recipient account IDs.
   * When non-empty, only these accounts may receive scheduled transfers.
   */
  allowedRecipients?: string[];

  /**
   * Blocklist of recipient account IDs that are always denied.
   * Evaluated even when allowedRecipients is empty.
   */
  blockedRecipients?: string[];

  /** Maximum allowed expiry window in seconds. */
  maxExpirySeconds?: number;
}

export class PolicyViolationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PolicyViolationError';
  }
}

/**
 * Validates schedule creation parameters against a policy configuration.
 * Throws {@link PolicyViolationError} on the first violation encountered.
 */
export function validateCreatePolicy(
  params: {
    to: string;
    amountTinybars: string;
    expirySeconds: number;
  },
  policy: PolicyConfig,
): void {
  const { to, amountTinybars, expirySeconds } = params;

  if (policy.maxAmountTinybars !== undefined) {
    if (BigInt(amountTinybars) > BigInt(policy.maxAmountTinybars)) {
      throw new PolicyViolationError(
        `Amount ${amountTinybars} tinybars exceeds the policy limit of ` +
          `${policy.maxAmountTinybars} tinybars.`,
      );
    }
  }

  if (policy.blockedRecipients?.includes(to)) {
    throw new PolicyViolationError(
      `Recipient ${to} is on the blocked-recipients policy list.`,
    );
  }

  if (policy.allowedRecipients && policy.allowedRecipients.length > 0) {
    if (!policy.allowedRecipients.includes(to)) {
      throw new PolicyViolationError(
        `Recipient ${to} is not on the allowed-recipients policy list.`,
      );
    }
  }

  if (
    policy.maxExpirySeconds !== undefined &&
    expirySeconds > policy.maxExpirySeconds
  ) {
    throw new PolicyViolationError(
      `Expiry ${expirySeconds}s exceeds the policy limit of ${policy.maxExpirySeconds}s.`,
    );
  }
}

/**
 * Loads a {@link PolicyConfig} from disk, or returns an empty (permissive) config
 * if the file does not exist.
 *
 * @param configPath - Explicit path to a policy JSON file.  When omitted the
 *   default location (~/.hiero/schedule-policy.json) is checked.
 */
export function loadPolicy(configPath?: string): PolicyConfig {
  const home = process.env['HOME'] ?? process.env['USERPROFILE'] ?? '.';
  const resolved = configPath
    ? path.resolve(configPath)
    : path.join(home, '.hiero', 'schedule-policy.json');

  if (!fs.existsSync(resolved)) {
    return {};
  }

  const raw = fs.readFileSync(resolved, 'utf-8');
  return JSON.parse(raw) as PolicyConfig;
}
