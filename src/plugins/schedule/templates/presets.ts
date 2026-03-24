/**
 * Built-in schedule templates for common Hedera use cases.
 *
 * Templates provide default values for schedule:create so users get correct
 * expiry windows and memo prefixes without manual configuration.
 */
import type { ScheduleTemplate } from './template.types';

/**
 * Token vesting — long-lived schedule held until all required parties sign.
 * Uses the network-maximum 60-day expiry so signers have the most time.
 */
export const VESTING_TEMPLATE: ScheduleTemplate = {
  name: 'vesting',
  displayName: 'Token Vesting',
  description:
    'Long-lived schedule for vesting arrangements. ' +
    'Expires in 60 days (network maximum). ' +
    'Suitable when multiple parties must sign over an extended period.',
  defaults: {
    'expiry-seconds': 5_184_000, // 60 days — Hedera network maximum
    memo: '[vesting]',
  },
};

/**
 * Two-party escrow — short window to ensure timely settlement.
 * Both payer and recipient must sign before the 7-day window closes.
 */
export const ESCROW_TEMPLATE: ScheduleTemplate = {
  name: 'escrow',
  displayName: 'Two-Party Escrow',
  description:
    'Short-lived schedule for escrow-style settlements. ' +
    'Expires in 7 days. ' +
    'Requires both payer and recipient to submit signatures.',
  defaults: {
    'expiry-seconds': 604_800, // 7 days
    memo: '[escrow]',
  },
};

/**
 * Recurring payment — standard 30-day window for periodic transfers.
 * Pair with schedule:recurring to pre-schedule multiple payment periods.
 */
export const RECURRING_PAYMENT_TEMPLATE: ScheduleTemplate = {
  name: 'recurring-payment',
  displayName: 'Recurring Payment',
  description:
    'Standard 30-day expiry for recurring payment schedules. ' +
    'Use with schedule:recurring to pre-schedule a series of periodic payments.',
  defaults: {
    'expiry-seconds': 2_592_000, // 30 days
    memo: '[recurring]',
  },
};

/** All built-in templates keyed by name for O(1) lookup. */
export const SCHEDULE_TEMPLATES: Record<string, ScheduleTemplate> = {
  [VESTING_TEMPLATE.name]: VESTING_TEMPLATE,
  [ESCROW_TEMPLATE.name]: ESCROW_TEMPLATE,
  [RECURRING_PAYMENT_TEMPLATE.name]: RECURRING_PAYMENT_TEMPLATE,
};

/** Resolves a template by name. Throws if the name is not recognised. */
export function getTemplate(name: string): ScheduleTemplate {
  const tmpl = SCHEDULE_TEMPLATES[name];
  if (!tmpl) {
    const valid = Object.keys(SCHEDULE_TEMPLATES).join(', ');
    throw new Error(`Unknown template "${name}". Valid templates: ${valid}`);
  }
  return tmpl;
}

/** Names of all available templates — used to build Zod enum schemas. */
export const TEMPLATE_NAMES = Object.keys(SCHEDULE_TEMPLATES) as [string, ...string[]];
