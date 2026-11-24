import { gotScraping } from 'got-scraping';
import {
  toIso3Country,
  type FilterCriteria,
  type NormalizedTender,
} from '../domain/tender-schema.js';
import { parseTedSearchResponse } from '../domain/ted-parser.js';
import type { TenderSource } from '../ports/tender-source.js';

const DEFAULT_TED_BASE_URL = 'https://api.ted.europa.eu/v3/notices/search';
const TED_NOTICE_FIELDS = [
  'publication-number',
  'notice-title',
  'buyer-name',
  'buyer-country',
  'classification-cpv',
  'estimated-value-glo',
  'estimated-value-cur-glo',
  'estimated-value-lot',
  'estimated-value-cur-lot',
  'publication-date',
  'deadline-receipt-tender-date-lot',
  'links',
] as const;

const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);

export interface TedHttpClientOptions {
  baseUrl?: string;
  pageSize?: number;
  maxRetries?: number;
  retryDelayMs?: number;
}

function buildTedExpertQuery(criteria: FilterCriteria): string {
  const clauses: string[] = [];

  if (criteria.countries.length > 0) {
    const iso3List = criteria.countries
      .map((c) => toIso3Country(c) ?? c.toUpperCase())
      .join(' ');
    clauses.push(`buyer-country IN (${iso3List})`);
  }

  if (criteria.cpvCodes.length > 0) {
    clauses.push(`classification-cpv IN (${criteria.cpvCodes.join(' ')})`);
  }

  if (criteria.minBudget !== undefined) {
    clauses.push(
      `(estimated-value-glo >= ${criteria.minBudget} OR estimated-value-lot >= ${criteria.minBudget})`,
    );
  }

  if (criteria.maxBudget !== undefined) {
    clauses.push(
      `(estimated-value-glo <= ${criteria.maxBudget} OR estimated-value-lot <= ${criteria.maxBudget})`,
    );
  }

  if (criteria.publishedFrom !== undefined) {
    clauses.push(`publication-date >= ${criteria.publishedFrom.replaceAll('-', '')}`);
  }

  if (criteria.publishedTo !== undefined) {
    clauses.push(`publication-date <= ${criteria.publishedTo.replaceAll('-', '')}`);
  }

  if (criteria.minDeadline !== undefined) {
    clauses.push(`deadline-receipt-tender-date-lot >= ${criteria.minDeadline.replaceAll('-', '')}`);
  }

  if (criteria.maxDeadline !== undefined) {
    clauses.push(`deadline-receipt-tender-date-lot <= ${criteria.maxDeadline.replaceAll('-', '')}`);
  }

  const baseQuery = clauses.length > 0 ? clauses.join(' AND ') : 'publication-date >= 20250101';
  return `${baseQuery} SORT BY publication-date DESC`;
}

async function sleep(ms: number): Promise<void> {
  if (ms <= 0) {
    return;
  }
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export class TedHttpClient implements TenderSource {
  private readonly baseUrl: string;
  private readonly pageSize: number;
  private readonly maxRetries: number;
  private readonly retryDelayMs: number;

  constructor(options: TedHttpClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? DEFAULT_TED_BASE_URL;
    this.pageSize = options.pageSize ?? 50;
    this.maxRetries = options.maxRetries ?? 3;
    this.retryDelayMs = options.retryDelayMs ?? 500;
  }

  async searchTenders(criteria: FilterCriteria): Promise<NormalizedTender[]> {
    const query = buildTedExpertQuery(criteria);
    const scope =
      criteria.publishedFrom !== undefined || criteria.publishedTo !== undefined ? 'ALL' : 'ACTIVE';
    const collected: NormalizedTender[] = [];
    let page = 1;

    while (collected.length < criteria.maxItems) {
      const limit = Math.min(this.pageSize, criteria.maxItems - collected.length);
      const payload = await this.postSearch({
        query,
        fields: [...TED_NOTICE_FIELDS],
        limit,
        page,
        scope,
      });

      const { tenders } = parseTedSearchResponse(payload);
      if (tenders.length === 0) {
        break;
      }

      collected.push(...tenders);
      if (tenders.length < limit) {
        break;
      }

      page += 1;
    }

    return collected.slice(0, criteria.maxItems);
  }

  async getTenderById(tenderId: string): Promise<NormalizedTender | null> {
    const sanitizedId = tenderId.trim().replace(/[^a-zA-Z0-9-]/g, '');
    if (sanitizedId.length === 0) {
      return null;
    }

    const payload = await this.postSearch({
      query: `publication-number = "${sanitizedId}"`,
      fields: [...TED_NOTICE_FIELDS],
      limit: 1,
      page: 1,
      scope: 'ALL',
    });

    const { tenders } = parseTedSearchResponse(payload);
    return tenders[0] ?? null;
  }

  private async postSearch(body: Record<string, unknown>): Promise<unknown> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= this.maxRetries; attempt += 1) {
      try {
        const response = await gotScraping.post(this.baseUrl, {
          json: body,
          headers: {
            Accept: 'application/json',
          },
          http2: false,
          retry: { limit: 0 },
          throwHttpErrors: false,
        });

        if (response.statusCode >= 200 && response.statusCode < 300) {
          return JSON.parse(response.body) as unknown;
        }

        const error = new Error(`TED API responded with HTTP ${response.statusCode}`);
        if (!RETRYABLE_STATUS_CODES.has(response.statusCode) || attempt === this.maxRetries) {
          throw error;
        }
        lastError = error;
      } catch (err) {
        lastError = err;
        if (attempt === this.maxRetries) {
          throw err;
        }
      }

      await sleep(this.retryDelayMs * attempt);
    }

    throw lastError instanceof Error ? lastError : new Error('TED API request failed');
  }
}
