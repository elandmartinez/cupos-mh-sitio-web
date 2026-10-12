import { describe, expect, it } from 'vitest';
import es from './es';
import en from './en';
import { i18n } from '../index';

/**
 * Interpolation parity plus the runtime contract of `t()`.
 *
 * Key-set parity (`parity.test.ts`) is not enough: a key can exist in both
 * languages while the Spanish string interpolates `{{value}}` and the English one
 * `{{amount}}` — the kind of drift that only shows up as `{amount}` on screen.
 *
 * The smoke tests then prove the plumbing end to end: plural selection,
 * interpolation and the `returnNull: false` rule that turns a missing key into a
 * visible key instead of an empty node.
 */

/** Dotted path per leaf, so `products.count_one` reads like the `t()` call. */
function flatten(source: Record<string, unknown>, prefix = ''): Record<string, string> {
  const flat: Record<string, string> = {};

  for (const [key, value] of Object.entries(source)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') {
      flat[path] = value;
    } else if (value && typeof value === 'object') {
      Object.assign(flat, flatten(value as Record<string, unknown>, path));
    }
  }

  return flat;
}

/** Every `{{name}}` in the string, sorted, so order never decides the result. */
function placeholders(value: string): string[] {
  return [...value.matchAll(/\{\{\s*([^}]+?)\s*\}\}/g)].map((match) => match[1]).sort();
}

const esFlat = flatten(es);
const enFlat = flatten(en);

describe('placeholder parity', () => {
  it('uses the same placeholders for every translated key', () => {
    const mismatched = Object.keys(esFlat)
      .filter((key) => key in enFlat)
      .filter((key) => placeholders(esFlat[key]).join('|') !== placeholders(enFlat[key]).join('|'))
      .map((key) => key);

    expect(mismatched).toEqual([]);
  });
});

describe('resource interpolation', () => {
  it('resolves a plural phrase per language without a hand-rolled suffix', async () => {
    await i18n.changeLanguage('es');
    // One whole phrase, not a count glued to a noun: the plural and the currency
    // both land inside the sentence, so English is free to reorder them.
    const spanish = i18n.t('summary.owed', { count: 2, amount: '$10' });
    expect(spanish).toContain('2');
    expect(spanish).toContain('$10');
    expect(spanish).not.toContain('{{');

    await i18n.changeLanguage('en');
    const english = i18n.t('summary.owed', { count: 2, amount: '$10' });
    expect(english).toContain('2');
    expect(english).toContain('$10');
    expect(english).not.toContain('{{');
    expect(english).not.toBe(spanish);

    // Leave the singleton as the rest of the suite expects to find it.
    await i18n.changeLanguage('es');
  });

  it('interpolates the variable list in the config error', () => {
    expect(i18n.t('errors.configMissing', { name: 'PUBLIC_SUPABASE_URL' })).toContain(
      'PUBLIC_SUPABASE_URL'
    );
  });

  it('renders a missing key as its key rather than nothing', () => {
    // `returnNull: false` (src/i18n/index.ts): an untranslated string has to show
    // up loudly instead of leaving an empty label behind.
    expect(i18n.t('common.thisKeyDoesNotExist' as never)).toBe('common.thisKeyDoesNotExist');
  });
});
