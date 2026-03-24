/**
 * Config profiles — named environment presets for hiero-schedule.
 *
 * A profile bundles the settings that differ between dev, test, and mainnet
 * environments (mirror URL, policy file path, registry file path, etc.) so
 * operators can switch contexts with a single flag rather than repeating every
 * option on every command.
 *
 * Profiles are stored as individual JSON files under ~/.hiero/profiles/<name>.json.
 *
 * Built-in profiles:
 *   testnet   — public Hedera testnet mirror, ~/.hiero/schedule-registry.json
 *   mainnet   — public Hedera mainnet mirror, ~/.hiero/schedule-registry.json
 *   previewnet — public Hedera previewnet mirror
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface ScheduleProfile {
  /** Human-readable profile name (also the filename stem). */
  name: string;

  /** Hedera network this profile targets. */
  network: 'mainnet' | 'testnet' | 'previewnet';

  /** Mirror node base URL (default: Hedera public mirror for the network). */
  mirrorNodeUrl?: string;

  /**
   * Default policy file path for schedule:create --policy-file.
   * Set to "" to disable policy checks by default.
   */
  policyFile?: string;

  /** Custom registry file path (default: ~/.hiero/schedule-registry.json). */
  registryFile?: string;

  /** Additional arbitrary key/value config. */
  extra?: Record<string, unknown>;
}

// ── Default profiles ───────────────────────────────────────────────────────────

const DEFAULT_PROFILES: Record<string, ScheduleProfile> = {
  testnet: {
    name: 'testnet',
    network: 'testnet',
    mirrorNodeUrl: 'https://testnet.mirrornode.hedera.com',
  },
  mainnet: {
    name: 'mainnet',
    network: 'mainnet',
    mirrorNodeUrl: 'https://mainnet-public.mirrornode.hedera.com',
  },
  previewnet: {
    name: 'previewnet',
    network: 'previewnet',
    mirrorNodeUrl: 'https://previewnet.mirrornode.hedera.com',
  },
};

// ── Storage helpers ────────────────────────────────────────────────────────────

function profilesDir(): string {
  return path.join(os.homedir(), '.hiero', 'profiles');
}

function profilePath(name: string): string {
  return path.join(profilesDir(), `${name}.json`);
}

function ensureProfilesDir(): void {
  fs.mkdirSync(profilesDir(), { recursive: true });
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Loads a named profile.  Built-in profiles (testnet, mainnet, previewnet) are
 * returned without reading from disk unless a file with that name exists (the
 * file overrides the built-in).
 *
 * @throws {ProfileNotFoundError} when no built-in or file profile is found.
 */
export function loadProfile(name: string): ScheduleProfile {
  const filePath = profilePath(name);

  if (fs.existsSync(filePath)) {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as ScheduleProfile;
  }

  if (name in DEFAULT_PROFILES) {
    return DEFAULT_PROFILES[name]!;
  }

  throw new ProfileNotFoundError(name);
}

/**
 * Persists a profile to disk.  Creates ~/.hiero/profiles/ if needed.
 */
export function saveProfile(profile: ScheduleProfile): void {
  ensureProfilesDir();
  fs.writeFileSync(
    profilePath(profile.name),
    JSON.stringify(profile, null, 2),
    'utf-8',
  );
}

/**
 * Deletes a custom profile from disk.
 * Built-in profiles cannot be deleted; calling this for them is a no-op.
 */
export function deleteProfile(name: string): void {
  const filePath = profilePath(name);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

/**
 * Lists all known profile names: built-ins + any saved to disk.
 * Duplicates are deduplicated (disk file overrides built-in, same name).
 */
export function listProfiles(): ScheduleProfile[] {
  const profiles = new Map<string, ScheduleProfile>(Object.entries(DEFAULT_PROFILES));

  const dir = profilesDir();
  if (fs.existsSync(dir)) {
    for (const file of fs.readdirSync(dir)) {
      if (!file.endsWith('.json')) continue;
      const name = path.basename(file, '.json');
      try {
        const raw = fs.readFileSync(path.join(dir, file), 'utf-8');
        profiles.set(name, JSON.parse(raw) as ScheduleProfile);
      } catch {
        // Skip malformed profile files silently
      }
    }
  }

  return [...profiles.values()];
}

// ── Error ──────────────────────────────────────────────────────────────────────

export class ProfileNotFoundError extends Error {
  constructor(public readonly profileName: string) {
    super(
      `Profile "${profileName}" not found. ` +
      `Available profiles: ${Object.keys(DEFAULT_PROFILES).join(', ')} ` +
      `(or any file in ${profilesDir()}).`,
    );
    this.name = 'ProfileNotFoundError';
  }
}
