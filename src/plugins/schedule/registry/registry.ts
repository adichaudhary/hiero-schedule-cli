/**
 * Local schedule registry — a lightweight JSON file that tracks every schedule
 * created through this plugin, enabling tag-based filtering, state refresh, and
 * auditing without querying the mirror node every time.
 *
 * Default location: ~/.hiero/schedule-registry.json
 */
import * as fs from 'fs';
import * as path from 'path';

import type {
  RegistryEntryState,
  RegistryFilter,
  ScheduleRegistryEntry,
} from './registry.types';

function defaultRegistryPath(): string {
  const home = process.env['HOME'] ?? process.env['USERPROFILE'] ?? '.';
  return path.join(home, '.hiero', 'schedule-registry.json');
}

export class ScheduleRegistry {
  private readonly filePath: string;

  constructor(registryPath?: string) {
    this.filePath = registryPath ?? defaultRegistryPath();
  }

  // ── I/O helpers ─────────────────────────────────────────────────────────────

  private load(): ScheduleRegistryEntry[] {
    if (!fs.existsSync(this.filePath)) return [];
    const raw = fs.readFileSync(this.filePath, 'utf-8');
    return JSON.parse(raw) as ScheduleRegistryEntry[];
  }

  private save(entries: ScheduleRegistryEntry[]): void {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(this.filePath, JSON.stringify(entries, null, 2) + '\n', 'utf-8');
  }

  // ── Public API ───────────────────────────────────────────────────────────────

  /**
   * Adds or updates an entry.  If an entry with the same scheduleId already
   * exists it is replaced in-place.
   */
  add(entry: ScheduleRegistryEntry): void {
    const entries = this.load();
    const idx = entries.findIndex((e) => e.scheduleId === entry.scheduleId);
    if (idx >= 0) {
      entries[idx] = entry;
    } else {
      entries.push(entry);
    }
    this.save(entries);
  }

  /** Returns all entries, optionally filtered. */
  list(filter?: RegistryFilter): ScheduleRegistryEntry[] {
    let entries = this.load();

    if (filter?.tag) {
      entries = entries.filter((e) => e.tags.includes(filter.tag!));
    }
    if (filter?.network) {
      entries = entries.filter((e) => e.network === filter.network);
    }
    if (filter?.state) {
      entries = entries.filter((e) => e.state === filter.state);
    }

    return entries;
  }

  /** Returns a single entry by schedule ID, or undefined if not found. */
  get(scheduleId: string): ScheduleRegistryEntry | undefined {
    return this.load().find((e) => e.scheduleId === scheduleId);
  }

  /**
   * Updates the cached state for a schedule and stamps lastCheckedAt.
   * No-ops if the schedule is not in the registry.
   */
  updateState(scheduleId: string, state: RegistryEntryState): void {
    const entries = this.load();
    const entry = entries.find((e) => e.scheduleId === scheduleId);
    if (entry) {
      entry.state = state;
      entry.lastCheckedAt = new Date().toISOString();
      this.save(entries);
    }
  }

  /**
   * Removes an entry by schedule ID.
   * Returns true if an entry was removed, false if it was not found.
   */
  remove(scheduleId: string): boolean {
    const entries = this.load();
    const next = entries.filter((e) => e.scheduleId !== scheduleId);
    if (next.length === entries.length) return false;
    this.save(next);
    return true;
  }

  /** Adds a tag to an existing entry. No-ops if the entry or tag is not found. */
  addTag(scheduleId: string, tag: string): void {
    const entries = this.load();
    const entry = entries.find((e) => e.scheduleId === scheduleId);
    if (entry && !entry.tags.includes(tag)) {
      entry.tags.push(tag);
      this.save(entries);
    }
  }

  /** Total number of entries in the registry. */
  count(): number {
    return this.load().length;
  }
}
