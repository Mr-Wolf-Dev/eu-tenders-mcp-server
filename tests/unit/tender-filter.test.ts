import { describe, expect, it } from 'vitest';
import fixture from '../fixtures/ted-search-response.json' with { type: 'json' };
import { parseTedSearchResponse } from '../../src/domain/ted-parser.js';
import { filterAndDeduplicateTenders } from '../../src/domain/tender-filter.js';
import type { FilterCriteria, NormalizedTender } from '../../src/domain/tender-schema.js';

const { tenders: fixtureTenders } = parseTedSearchResponse(fixture);

function baseCriteria(overrides: Partial<FilterCriteria> = {}): FilterCriteria {
  return {
    countries: [],
    cpvCodes: [],
    maxItems: 50,
    ...overrides,
  };
}

describe('filterAndDeduplicateTenders', () => {
  it('deduplicates tenders by tenderId preserving the first occurrence', () => {
    const first = fixtureTenders[0]!;
    const duplicate: NormalizedTender = { ...first, title: 'Duplicate title' };

    const result = filterAndDeduplicateTenders([first, duplicate, fixtureTenders[1]!], baseCriteria());

    expect(result).toHaveLength(2);
    expect(result[0]?.title).toBe(first.title);
    expect(result.map((t) => t.tenderId)).toEqual(['792483-2023', '48025-2024']);
  });

  it('filters by ISO-2 country code', () => {
    const result = filterAndDeduplicateTenders(
      fixtureTenders,
      baseCriteria({ countries: ['IT'] }),
    );

    expect(result.map((t) => t.tenderId)).toEqual(['792483-2023', '48025-2024']);
  });

  it('filters by CPV prefix match', () => {
    const result = filterAndDeduplicateTenders(
      fixtureTenders,
      baseCriteria({ cpvCodes: ['71'] }),
    );

    expect(result.map((t) => t.tenderId)).toEqual(['792483-2023', '1-2025']);
  });

  it('filters by minBudget and maxBudget and excludes null estimatedValue when budget is set', () => {
    const result = filterAndDeduplicateTenders(
      fixtureTenders,
      baseCriteria({ minBudget: 500000, maxBudget: 1000000 }),
    );

    expect(result.map((t) => t.tenderId)).toEqual(['48025-2024', '50012-2024']);
  });

  it('filters by maxDeadline inclusive and excludes null submissionDeadline when set', () => {
    const result = filterAndDeduplicateTenders(
      fixtureTenders,
      baseCriteria({ maxDeadline: '2024-03-01' }),
    );

    expect(result.map((t) => t.tenderId)).toEqual(['792483-2023', '48025-2024']);
  });

  it('filters by publication period (publishedFrom / publishedTo) inclusive', () => {
    const result = filterAndDeduplicateTenders(
      fixtureTenders,
      baseCriteria({ publishedFrom: '2024-01-01', publishedTo: '2025-01-15' }),
    );

    expect(result.map((t) => t.tenderId)).toEqual(['48025-2024', '1-2025', '50012-2024']);
  });

  it('filters by deadline period (minDeadline / maxDeadline) inclusive', () => {
    const result = filterAndDeduplicateTenders(
      fixtureTenders,
      baseCriteria({ minDeadline: '2024-02-20', maxDeadline: '2025-12-31' }),
    );

    expect(result.map((t) => t.tenderId)).toEqual(['48025-2024', '1-2025', '50012-2024']);
  });

  it('truncates results to maxItems', () => {
    const result = filterAndDeduplicateTenders(fixtureTenders, baseCriteria({ maxItems: 2 }));

    expect(result).toHaveLength(2);
    expect(result.map((t) => t.tenderId)).toEqual(['792483-2023', '48025-2024']);
  });
});
