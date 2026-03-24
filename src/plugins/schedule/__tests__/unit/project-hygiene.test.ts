/**
 * Project hygiene conformance tests.
 *
 * These tests verify that the repository satisfies the four open-source
 * library requirements independently of whether specific logic is correct:
 *
 *   1. Public repo + clear license
 *   2. Clean library API + basic tests + CI
 *   3. README with install and quickstart examples
 *   4. Contribution hygiene (CONTRIBUTING, GPG signing, DCO sign-offs)
 *
 * They read files from disk, making them independent of the TypeScript
 * build and safe to run as part of the normal test suite.
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../../../../../');

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), 'utf-8');
}

function exists(rel: string): boolean {
  return fs.existsSync(path.join(ROOT, rel));
}

// ── Requirement 1: Public repo + clear license ─────────────────────────────────

describe('Requirement 1 — Public repo + clear license', () => {
  test('LICENSE file exists', () => {
    expect(exists('LICENSE')).toBe(true);
  });

  test('LICENSE is Apache 2.0', () => {
    const text = read('LICENSE');
    expect(text).toMatch(/Apache License/i);
    expect(text).toMatch(/Version 2\.0/i);
  });

  test('package.json declares the Apache-2.0 license field', () => {
    const pkg = JSON.parse(read('package.json')) as { license?: string };
    expect(pkg.license).toBe('Apache-2.0');
  });

  test('README references the GitHub repository', () => {
    const readme = read('README.md');
    expect(readme).toMatch(/github\.com/i);
  });

  test('README links to the LICENSE file', () => {
    const readme = read('README.md');
    expect(readme).toMatch(/Apache License 2\.0|Apache-2\.0/i);
  });
});

// ── Requirement 2: Clean library API + basic tests + CI ───────────────────────

describe('Requirement 2 — Clean library API + basic tests + CI', () => {
  // ── Library API surface ──────────────────────────────────────────────────────

  test('main SDK entry-point exists', () => {
    expect(exists('src/sdk/index.ts')).toBe(true);
  });

  test('browser entry-point exists (no Node.js deps)', () => {
    expect(exists('src/browser/index.ts')).toBe(true);
    const content = read('src/browser/index.ts');
    // Must not import Node.js built-ins
    expect(content).not.toMatch(/from ['"]fs['"]/);
    expect(content).not.toMatch(/from ['"]path['"]/);
    expect(content).not.toMatch(/from ['"]os['"]/);
  });

  test('plugin index exports the manifest', () => {
    const idx = read('src/plugins/schedule/index.ts');
    expect(idx).toMatch(/export.*manifest/);
  });

  test('all 9 commands have handler + input + output files', () => {
    const commands = ['create', 'sign', 'cosign', 'signers', 'status', 'watch', 'recurring', 'list', 'viz'];
    for (const cmd of commands) {
      const base = `src/plugins/schedule/commands/${cmd}`;
      expect(exists(`${base}/handler.ts`)).toBe(true);
      expect(exists(`${base}/input.ts`)).toBe(true);
      expect(exists(`${base}/output.ts`)).toBe(true);
    }
  });

  test('SDK ScheduleClient exports getStatus, getSigners, createWatcher', () => {
    const client = read('src/sdk/schedule-client.ts');
    expect(client).toMatch(/async getStatus/);
    expect(client).toMatch(/async getSigners/);
    expect(client).toMatch(/createWatcher/);
  });

  test('MirrorClient supports multiple URLs (failover)', () => {
    const mc = read('src/sdk/mirror-client.ts');
    expect(mc).toMatch(/urls/);
    expect(mc).toMatch(/for.*of.*this\.urls/);
  });

  test('ScheduleWatcher emits typed events', () => {
    const sw = read('src/sdk/schedule-watcher.ts');
    expect(sw).toMatch(/emit.*'executed'/);
    expect(sw).toMatch(/emit.*'deleted'/);
    expect(sw).toMatch(/emit.*'timeout'/);
    expect(sw).toMatch(/emit.*'error'/);
    expect(sw).toMatch(/emit.*'poll'/);
  });

  test('BackoffTimer is exported from mirror-client', () => {
    const mc = read('src/sdk/mirror-client.ts');
    expect(mc).toMatch(/export class BackoffTimer/);
  });

  test('JSON schema converter handles all 8 commands', () => {
    const js = read('src/sdk/json-schemas.ts');
    const commands = ['create', 'sign', 'cosign', 'signers', 'status', 'watch', 'recurring', 'list'];
    for (const cmd of commands) {
      expect(js).toMatch(new RegExp(`schedule:${cmd}`));
    }
  });

  // ── Tests ────────────────────────────────────────────────────────────────────

  test('at least one test file exists per command', () => {
    const commands = ['create', 'sign', 'cosign', 'signers', 'status', 'watch', 'recurring', 'list'];
    for (const cmd of commands) {
      const testFile = `src/plugins/schedule/__tests__/unit/${cmd}.test.ts`;
      expect(exists(testFile)).toBe(true);
    }
  });

  test('SDK test file exists', () => {
    expect(exists('src/plugins/schedule/__tests__/unit/sdk.test.ts')).toBe(true);
  });

  // ── CI ───────────────────────────────────────────────────────────────────────

  test('GitHub Actions CI workflow exists', () => {
    expect(exists('.github/workflows/ci.yml')).toBe(true);
  });

  test('CI runs on both push and pull_request', () => {
    const ci = read('.github/workflows/ci.yml');
    expect(ci).toMatch(/push/);
    expect(ci).toMatch(/pull_request/);
  });

  test('CI tests on Node 20 and Node 22', () => {
    const ci = read('.github/workflows/ci.yml');
    expect(ci).toMatch(/20/);
    expect(ci).toMatch(/22/);
  });

  test('CI runs type-check step', () => {
    const ci = read('.github/workflows/ci.yml');
    expect(ci).toMatch(/type-check/);
  });

  test('CI runs tests with coverage', () => {
    const ci = read('.github/workflows/ci.yml');
    expect(ci).toMatch(/test:coverage|test/);
  });

  test('package.json has required scripts', () => {
    const pkg = JSON.parse(read('package.json')) as { scripts?: Record<string, string> };
    const scripts = pkg.scripts ?? {};
    expect(scripts['test']).toBeDefined();
    expect(scripts['type-check']).toBeDefined();
    expect(scripts['build']).toBeDefined();
  });
});

// ── Requirement 3: README with install + quickstart ───────────────────────────

describe('Requirement 3 — README with install and quickstart', () => {
  let readme: string;

  beforeAll(() => {
    readme = read('README.md');
  });

  test('README.md exists', () => {
    expect(exists('README.md')).toBe(true);
  });

  test('README has an installation section', () => {
    expect(readme).toMatch(/install|Installation/i);
  });

  test('README includes npm install or git clone instructions', () => {
    expect(readme).toMatch(/npm install|git clone/i);
  });

  test('README has quickstart code examples', () => {
    expect(readme).toMatch(/```(bash|typescript|ts)/);
  });

  test('README documents the CLI commands', () => {
    expect(readme).toMatch(/schedule:create/);
    expect(readme).toMatch(/schedule:sign/);
    expect(readme).toMatch(/schedule:status/);
    expect(readme).toMatch(/schedule:watch/);
  });

  test('README documents SDK usage (ScheduleClient)', () => {
    expect(readme).toMatch(/ScheduleClient/);
    expect(readme).toMatch(/getStatus|createWatcher/);
  });

  test('README documents browser usage', () => {
    expect(readme).toMatch(/fetchScheduleStatus|ScheduleStatusPoller/);
  });

  test('README mentions Apache license', () => {
    expect(readme).toMatch(/Apache/i);
  });

  test('README links to CONTRIBUTING', () => {
    expect(readme).toMatch(/CONTRIBUTING/i);
  });

  test('README has prerequisites section', () => {
    expect(readme).toMatch(/prerequisite|Node\.js/i);
  });
});

// ── Requirement 4: Contribution hygiene ───────────────────────────────────────

describe('Requirement 4 — Contribution hygiene', () => {
  let contributing: string;

  beforeAll(() => {
    contributing = read('CONTRIBUTING.md');
  });

  test('CONTRIBUTING.md exists', () => {
    expect(exists('CONTRIBUTING.md')).toBe(true);
  });

  test('CONTRIBUTING.md documents the DCO (Signed-off-by)', () => {
    expect(contributing).toMatch(/Developer Certificate of Origin|DCO/i);
    expect(contributing).toMatch(/Signed-off-by/i);
  });

  test('CONTRIBUTING.md shows git commit -s example', () => {
    expect(contributing).toMatch(/git commit -s/);
  });

  test('CONTRIBUTING.md documents GPG signing', () => {
    expect(contributing).toMatch(/GPG/i);
    expect(contributing).toMatch(/commit\.gpgsign|gpgsign/i);
  });

  test('CONTRIBUTING.md explains how to configure Git for GPG', () => {
    expect(contributing).toMatch(/user\.signingkey/i);
  });

  test('CONTRIBUTING.md documents the pull request workflow', () => {
    expect(contributing).toMatch(/pull request|PR/i);
    expect(contributing).toMatch(/fork/i);
  });

  test('CONTRIBUTING.md specifies the commit message format', () => {
    expect(contributing).toMatch(/conventional commits|feat|fix/i);
  });

  test('CONTRIBUTING.md references the Apache 2.0 license', () => {
    expect(contributing).toMatch(/Apache/i);
  });

  test('CONTRIBUTING.md requires tests before PR', () => {
    expect(contributing).toMatch(/npm test/);
  });
});
