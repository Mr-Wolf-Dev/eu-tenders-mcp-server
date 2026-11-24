import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import fixture from '../fixtures/ted-search-response.json' with { type: 'json' };
import { TedHttpClient } from '../../src/adapters/ted-http-client.js';

const TED_SEARCH_URL = 'https://api.ted.europa.eu/v3/notices/search';
const server = setupServer();

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('TedHttpClient', () => {
  it('constructs a TED expert query sorted by publication-date DESC with ACTIVE scope', async () => {
    let capturedQuery = '';
    let capturedScope = '';

    server.use(
      http.post(TED_SEARCH_URL, async ({ request }) => {
        const body = (await request.json()) as { query?: string; scope?: string };
        capturedQuery = body.query ?? '';
        capturedScope = body.scope ?? '';
        return HttpResponse.json({
          totalNoticeCount: 2,
          notices: [fixture.notices[0], fixture.notices[1]],
        });
      }),
    );

    const client = new TedHttpClient({ retryDelayMs: 0 });
    const tenders = await client.searchTenders({
      countries: ['IT'],
      cpvCodes: ['42600000'],
      minBudget: 100000,
      maxItems: 50,
    });

    expect(capturedQuery).toContain('buyer-country IN (ITA)');
    expect(capturedQuery).toContain('estimated-value-glo >= 100000');
    expect(capturedQuery.endsWith('SORT BY publication-date DESC')).toBe(true);
    expect(capturedScope).toBe('ACTIVE');
    expect(tenders.map((t) => t.tenderId)).toEqual(['792483-2023', '48025-2024']);
  });

  it('adds publication/deadline period clauses and uses ALL scope when publishedFrom/publishedTo is set', async () => {
    let capturedQuery = '';
    let capturedScope = '';

    server.use(
      http.post(TED_SEARCH_URL, async ({ request }) => {
        const body = (await request.json()) as { query?: string; scope?: string };
        capturedQuery = body.query ?? '';
        capturedScope = body.scope ?? '';
        return HttpResponse.json({
          totalNoticeCount: 1,
          notices: [fixture.notices[0]],
        });
      }),
    );

    const client = new TedHttpClient({ retryDelayMs: 0 });
    await client.searchTenders({
      countries: ['IT'],
      cpvCodes: [],
      publishedFrom: '2023-12-01',
      publishedTo: '2024-01-31',
      minDeadline: '2024-02-01',
      maxDeadline: '2024-03-01',
      maxItems: 10,
    });

    expect(capturedQuery).toContain('publication-date >= 20231201');
    expect(capturedQuery).toContain('publication-date <= 20240131');
    expect(capturedQuery).toContain('deadline-receipt-tender-date-lot >= 20240201');
    expect(capturedQuery).toContain('deadline-receipt-tender-date-lot <= 20240301');
    expect(capturedScope).toBe('ALL');
  });

  it('paginates across multiple pages until maxItems is reached', async () => {
    const requestedPages: number[] = [];

    server.use(
      http.post(TED_SEARCH_URL, async ({ request }) => {
        const body = (await request.json()) as { page: number };
        requestedPages.push(body.page);

        if (body.page === 1) {
          return HttpResponse.json({
            totalNoticeCount: 4,
            notices: [fixture.notices[0], fixture.notices[1]],
          });
        }
        return HttpResponse.json({
          totalNoticeCount: 4,
          notices: [fixture.notices[3], fixture.notices[4]],
        });
      }),
    );

    const client = new TedHttpClient({ pageSize: 2, retryDelayMs: 0 });
    const tenders = await client.searchTenders({
      countries: [],
      cpvCodes: [],
      maxItems: 3,
    });

    expect(requestedPages).toEqual([1, 2]);
    expect(tenders.map((t) => t.tenderId)).toEqual(['792483-2023', '48025-2024', '50012-2024']);
  });

  it('retries on 429 and 503 responses and succeeds on subsequent 200', async () => {
    let attempts = 0;

    server.use(
      http.post(TED_SEARCH_URL, () => {
        attempts += 1;
        if (attempts === 1) {
          return new HttpResponse(null, { status: 429 });
        }
        if (attempts === 2) {
          return new HttpResponse(null, { status: 503 });
        }
        return HttpResponse.json({
          totalNoticeCount: 1,
          notices: [fixture.notices[4]],
        });
      }),
    );

    const client = new TedHttpClient({ maxRetries: 3, retryDelayMs: 0 });
    const tenders = await client.searchTenders({
      countries: ['DE'],
      cpvCodes: [],
      maxItems: 10,
    });

    expect(attempts).toBe(3);
    expect(tenders.map((t) => t.tenderId)).toEqual(['99001-2025']);
  });

  it('fetches a single tender by publication-number with ALL scope or returns null when absent', async () => {
    let capturedScope = '';
    server.use(
      http.post(TED_SEARCH_URL, async ({ request }) => {
        const body = (await request.json()) as { query: string; scope?: string };
        capturedScope = body.scope ?? '';
        if (body.query.includes('48025-2024')) {
          return HttpResponse.json({
            totalNoticeCount: 1,
            notices: [fixture.notices[1]],
          });
        }
        return HttpResponse.json({ totalNoticeCount: 0, notices: [] });
      }),
    );

    const client = new TedHttpClient({ retryDelayMs: 0 });
    const found = await client.getTenderById('48025-2024');
    const missing = await client.getTenderById('999999-2099');

    expect(capturedScope).toBe('ALL');
    expect(found?.tenderId).toBe('48025-2024');
    expect(missing).toBeNull();
  });
});
