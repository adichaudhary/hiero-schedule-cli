import {
  ESCROW_TEMPLATE,
  getTemplate,
  RECURRING_PAYMENT_TEMPLATE,
  SCHEDULE_TEMPLATES,
  TEMPLATE_NAMES,
  VESTING_TEMPLATE,
} from '../../templates';

describe('schedule templates', () => {
  test('VESTING_TEMPLATE has 60-day expiry (network max)', () => {
    expect(VESTING_TEMPLATE.defaults['expiry-seconds']).toBe(5_184_000);
  });

  test('ESCROW_TEMPLATE has 7-day expiry', () => {
    expect(ESCROW_TEMPLATE.defaults['expiry-seconds']).toBe(604_800);
  });

  test('RECURRING_PAYMENT_TEMPLATE has 30-day expiry', () => {
    expect(RECURRING_PAYMENT_TEMPLATE.defaults['expiry-seconds']).toBe(2_592_000);
  });

  test('all templates have a name, displayName, and description', () => {
    for (const tmpl of Object.values(SCHEDULE_TEMPLATES)) {
      expect(tmpl.name).toBeTruthy();
      expect(tmpl.displayName).toBeTruthy();
      expect(tmpl.description).toBeTruthy();
    }
  });

  test('TEMPLATE_NAMES contains all template keys', () => {
    expect(TEMPLATE_NAMES).toEqual(expect.arrayContaining(Object.keys(SCHEDULE_TEMPLATES)));
  });

  test('getTemplate returns the correct template', () => {
    expect(getTemplate('vesting')).toBe(VESTING_TEMPLATE);
    expect(getTemplate('escrow')).toBe(ESCROW_TEMPLATE);
    expect(getTemplate('recurring-payment')).toBe(RECURRING_PAYMENT_TEMPLATE);
  });

  test('getTemplate throws for unknown name', () => {
    expect(() => getTemplate('unknown-template')).toThrow('Unknown template');
  });

  test('all templates have a memo default', () => {
    for (const tmpl of Object.values(SCHEDULE_TEMPLATES)) {
      expect(typeof tmpl.defaults.memo).toBe('string');
    }
  });
});
