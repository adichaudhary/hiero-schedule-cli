/**
 * Type definitions for schedule templates.
 *
 * A template is a named preset that provides sensible default values for
 * schedule:create so users do not have to remember the right expiry window
 * or memo prefix for common use cases.
 */

export interface ScheduleTemplate {
  /** Machine-readable name, matches the --template option value. */
  name: string;

  /** Human-readable display name shown in help output. */
  displayName: string;

  /** Description of the intended use case. */
  description: string;

  /**
   * Default field values injected into schedule:create args before Zod
   * validation.  CLI flags always override template defaults.
   */
  defaults: {
    'expiry-seconds'?: number;
    memo?: string;
    [key: string]: unknown;
  };
}
