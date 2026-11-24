import { describe, expect, it } from 'vitest';
import {
  NormalizedTenderSchema,
  parseActorInput,
  toIso2Country,
  toIso3Country,
} from '../../src/domain/tender-schema.js';

describe('country normalization', () => {
  it('maps ISO-2 and ISO-3 EU/EEA country codes case-insensitively', () => {
    expect(toIso2Country('it')).toBe('IT');
    expect(toIso2Country('ITA')).toBe('IT');
    expect(toIso2Country('hrv')).toBe('HR');
    expect(toIso3Country('de')).toBe('DEU');
    expect(toIso3Country('DEU')).toBe('DEU');
  });

  it('returns null for unknown country codes', () => {
    expect(toIso2Country('XX')).toBeNull();
    expect(toIso3Country('ZZZ')).toBeNull();
  });
});

describe('parseActorInput', () => {
  it('applies sensible defaults for empty input', () => {
    expect(parseActorInput({})).toEqual({
      countries: [],
      cpvCodes: [],
      maxItems: 50,
    });
  });

  it('normalizes mixed ISO-2 and ISO-3 countries to ISO-2', () => {
    const parsed = parseActorInput({
      countries: ['ita', 'DE', 'fra'],
      cpvCodes: ['72000000', '4531'],
      minBudget: 10000,
      maxBudget: 500000,
      publishedFrom: '2026-01-01',
      publishedTo: '2026-11-30',
      minDeadline: '2026-12-01',
      maxDeadline: '2026-12-31',
      maxItems: 25,
    });

    expect(parsed).toEqual({
      countries: ['IT', 'DE', 'FR'],
      cpvCodes: ['72000000', '4531'],
      minBudget: 10000,
      maxBudget: 500000,
      publishedFrom: '2026-01-01',
      publishedTo: '2026-11-30',
      minDeadline: '2026-12-01',
      maxDeadline: '2026-12-31',
      maxItems: 25,
    });
  });

  it('rejects inverted budget range (minBudget > maxBudget)', () => {
    expect(() =>
      parseActorInput({
        minBudget: 500000,
        maxBudget: 100000,
      }),
    ).toThrow(/minBudget/i);
  });

  it('rejects inverted publication or deadline date ranges', () => {
    expect(() =>
      parseActorInput({
        publishedFrom: '2026-12-01',
        publishedTo: '2026-11-01',
      }),
    ).toThrow(/publishedFrom/i);

    expect(() =>
      parseActorInput({
        minDeadline: '2026-12-31',
        maxDeadline: '2026-12-01',
      }),
    ).toThrow(/minDeadline/i);
  });

  it('rejects invalid country codes, malformed CPV codes, invalid dates, and out-of-range maxItems', () => {
    expect(() => parseActorInput({ countries: ['INVALID'] })).toThrow();
    expect(() => parseActorInput({ cpvCodes: ['abc'] })).toThrow();
    expect(() => parseActorInput({ maxDeadline: '2026-02-31' })).toThrow();
    expect(() => parseActorInput({ maxItems: 0 })).toThrow();
    expect(() => parseActorInput({ maxItems: 1001 })).toThrow();
  });
});

describe('NormalizedTenderSchema', () => {
  it('accepts a valid normalized tender with nullable optional fields', () => {
    const tender = NormalizedTenderSchema.parse({
      tenderId: '1-2025',
      title: 'Supervision of works',
      buyerName: 'Nacionalni park Plitvička jezera',
      country: 'HR',
      cpvCodes: ['71247000'],
      estimatedValue: null,
      currency: null,
      publicationDate: '2025-01-02',
      submissionDeadline: '2025-02-07',
      documentUrl: 'https://ted.europa.eu/en/notice/-/detail/1-2025',
    });

    expect(tender.tenderId).toBe('1-2025');
  });
});
