import { describe, expect, it } from 'vitest';
import es from './es';
import en from './en';

/**
 * Key-set parity between the two locales.
 *
 * `es.ts` is the reference locale: it defines which keys exist, and `t()`'s types
 * are built from it. That makes `en.ts` the only side that can silently drift —
 * and a forgotten key does not fail the build, it renders the raw key on screen.
 * This test is the gate that stops that reaching `main`.
 *
 * Pure resource checks, so they run in plain Node: no DOM, no network.
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

const esFlat = flatten(es);
const enFlat = flatten(en);
const esKeys = Object.keys(esFlat).sort();
const enKeys = Object.keys(enFlat).sort();

describe('locale parity', () => {
  it('defines exactly the same keys in both languages', () => {
    // Asserted both ways, so the failure names the missing side in either
    // direction — a key in `en` that `es` never had is drift too.
    expect(enKeys.filter((key) => !(key in esFlat))).toEqual([]);
    expect(esKeys.filter((key) => !(key in enFlat))).toEqual([]);
  });

  it('gives both languages the same number of strings', () => {
    // Guards against a duplicated key silently collapsing the set above.
    expect(enKeys.length).toBe(esKeys.length);
  });

  it('keeps every plural pair complete', () => {
    // i18next picks `_one` / `_other` from `count`; a base key with only one of
    // the two forms renders as a raw key for half the values.
    const unpaired = enKeys
      .filter((key) => key.endsWith('_one') || key.endsWith('_other'))
      .filter((key) => {
        const counterpart = key.endsWith('_one')
          ? `${key.slice(0, -'_one'.length)}_other`
          : `${key.slice(0, -'_other'.length)}_one`;
        return !(counterpart in enFlat);
      });

    expect(unpaired).toEqual([]);
  });

  it('ships no empty copy', () => {
    const empty = esKeys.filter((key) => esFlat[key].trim() === '' || enFlat[key].trim() === '');
    expect(empty).toEqual([]);
  });
});
