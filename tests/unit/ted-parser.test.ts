import { describe, expect, it } from 'vitest';
import fixture from '../fixtures/ted-search-response.json' with { type: 'json' };
import { parseTedNotice, parseTedSearchResponse } from '../../src/domain/ted-parser.js';

describe('parseTedNotice', () => {
  it('normalizes an Italian notice with duplicate CPV codes and multilingual fields', () => {
    const result = parseTedNotice(fixture.notices[0]);

    expect(result).toEqual({
      tenderId: '792483-2023',
      title:
        'Italy – Energy and related services – Affidamento in concessione del servizio energia del Comune di Elmas',
      buyerName: 'Comune di Elmas',
      country: 'IT',
      cpvCodes: ['71314000', '45316000', '45315000', '50232100', '50232110', '50720000'],
      estimatedValue: 4500000,
      currency: 'EUR',
      publicationDate: '2023-12-28',
      submissionDeadline: '2024-02-12',
      documentUrl: 'https://ted.europa.eu/en/notice/-/detail/792483-2023',
    });
  });

  it('picks the latest submission deadline across multi-lot tenders', () => {
    const result = parseTedNotice(fixture.notices[1]);

    expect(result?.tenderId).toBe('48025-2024');
    expect(result?.cpvCodes).toEqual(['42600000']);
    expect(result?.estimatedValue).toBe(956000);
    expect(result?.submissionDeadline).toBe('2024-02-26');
  });

  it('falls back to non-English title/buyer and null estimatedValue when omitted', () => {
    const result = parseTedNotice(fixture.notices[2]);

    expect(result).toEqual({
      tenderId: '1-2025',
      title: 'Hrvatska – Nadzor nad građenjem – Nacionalni park Plitvička jezera',
      buyerName: 'Javna ustanova Nacionalni park Plitvička jezera',
      country: 'HR',
      cpvCodes: ['71247000'],
      estimatedValue: null,
      currency: null,
      publicationDate: '2025-01-02',
      submissionDeadline: '2025-02-07',
      documentUrl: 'https://ted.europa.eu/en/notice/-/detail/1-2025',
    });
  });

  it('falls back to summing estimated-value-lot and estimated-value-cur-lot when glo is omitted', () => {
    const result = parseTedNotice({
      'publication-number': '812690-2026',
      'notice-title': { eng: 'Italy – Enteral feeds' },
      'buyer-name': { ita: ['AST Ancona'] },
      'buyer-country': ['ITA'],
      'classification-cpv': ['33692300'],
      'estimated-value-lot': ['2383677.68', '1379276.88'],
      'estimated-value-cur-lot': ['EUR'],
      'publication-date': '2026-11-23+01:00',
      'deadline-receipt-tender-date-lot': ['2026-12-28+01:00'],
    });

    expect(result?.estimatedValue).toBe(3762954.56);
    expect(result?.currency).toBe('EUR');
  });

  it('returns null for malformed notices without a publication-number', () => {
    expect(parseTedNotice({})).toBeNull();
    expect(parseTedNotice(null)).toBeNull();
    expect(parseTedNotice({ 'publication-number': '' })).toBeNull();
  });
});

describe('parseTedSearchResponse', () => {
  it('parses all valid notices and preserves totalCount from TED search response', () => {
    const result = parseTedSearchResponse(fixture);

    expect(result.totalCount).toBe(5);
    expect(result.tenders).toHaveLength(5);
    expect(result.tenders.map((t) => t.tenderId)).toEqual([
      '792483-2023',
      '48025-2024',
      '1-2025',
      '50012-2024',
      '99001-2025',
    ]);
  });
});
