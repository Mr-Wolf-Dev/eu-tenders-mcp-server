import { toIso2Country, type NormalizedTender } from './tender-schema.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function pickPreferredText(map: unknown): string | null {
  if (typeof map === 'string') {
    const trimmed = map.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (!isRecord(map)) {
    return null;
  }

  const preferredKeys = ['eng', 'ENG'];
  for (const key of preferredKeys) {
    const candidate = extractFirstString(map[key]);
    if (candidate) {
      return candidate;
    }
  }

  for (const value of Object.values(map)) {
    const candidate = extractFirstString(value);
    if (candidate) {
      return candidate;
    }
  }

  return null;
}

function extractFirstString(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      if (typeof item === 'string' && item.trim().length > 0) {
        return item.trim();
      }
    }
  }
  return null;
}

function stripTimezoneToIsoDate(value: unknown): string | null {
  const raw = extractFirstString(value);
  if (!raw) {
    return null;
  }
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(raw);
  return match?.[1] ?? null;
}

function pickLatestDeadline(value: unknown): string | null {
  const items = Array.isArray(value) ? value : [value];
  let latest: string | null = null;
  for (const item of items) {
    const date = stripTimezoneToIsoDate(item);
    if (date && (latest === null || date > latest)) {
      latest = date;
    }
  }
  return latest;
}

function parseEstimatedValue(value: unknown): number | null {
  const candidates = Array.isArray(value) ? value : [value];
  for (const item of candidates) {
    if (typeof item === 'number' && Number.isFinite(item)) {
      return item;
    }
    if (typeof item === 'string') {
      const parsed = Number(item.trim());
      if (item.trim().length > 0 && Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return null;
}

function parseLotEstimatedValueSum(value: unknown): number | null {
  const candidates = Array.isArray(value) ? value : [value];
  let sum = 0;
  let hasValidValue = false;

  for (const item of candidates) {
    const parsed = parseEstimatedValue(item);
    if (parsed !== null) {
      sum += parsed;
      hasValidValue = true;
    }
  }

  return hasValidValue ? Math.round(sum * 100) / 100 : null;
}

function parseCpvCodes(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of value) {
    if (typeof item === 'string') {
      const trimmed = item.trim();
      if (trimmed.length > 0 && !seen.has(trimmed)) {
        seen.add(trimmed);
        result.push(trimmed);
      }
    }
  }
  return result;
}

function resolveDocumentUrl(links: unknown, tenderId: string): string {
  if (isRecord(links) && isRecord(links.html)) {
    const engUrl = extractFirstString(links.html.ENG ?? links.html.eng);
    if (engUrl) {
      return engUrl;
    }
    for (const val of Object.values(links.html)) {
      const anyUrl = extractFirstString(val);
      if (anyUrl) {
        return anyUrl;
      }
    }
  }
  return `https://ted.europa.eu/en/notice/-/detail/${tenderId}`;
}

/**
 * Parses a single raw TED API v3 notice object into a NormalizedTender, or null if malformed.
 */
export function parseTedNotice(raw: unknown): NormalizedTender | null {
  if (!isRecord(raw)) {
    return null;
  }

  const tenderId = extractFirstString(raw['publication-number']);
  if (!tenderId) {
    return null;
  }

  const title = pickPreferredText(raw['notice-title']) ?? `Untitled tender (${tenderId})`;
  const buyerName = pickPreferredText(raw['buyer-name']) ?? 'Unknown buyer';

  const rawCountry = extractFirstString(raw['buyer-country']);
  const country = rawCountry ? (toIso2Country(rawCountry) ?? rawCountry.toUpperCase()) : 'EU';

  const cpvCodes = parseCpvCodes(raw['classification-cpv']);
  const estimatedValue =
    parseEstimatedValue(raw['estimated-value-glo']) ??
    parseLotEstimatedValueSum(raw['estimated-value-lot']);
  const rawCurrency =
    extractFirstString(raw['estimated-value-cur-glo']) ??
    extractFirstString(raw['estimated-value-cur-lot']);
  const currency = rawCurrency ? rawCurrency.toUpperCase() : null;

  const publicationDate = stripTimezoneToIsoDate(raw['publication-date']) ?? '1970-01-01';
  const submissionDeadline = pickLatestDeadline(raw['deadline-receipt-tender-date-lot']);
  const documentUrl = resolveDocumentUrl(raw.links, tenderId);

  return {
    tenderId,
    title,
    buyerName,
    country,
    cpvCodes,
    estimatedValue,
    currency,
    publicationDate,
    submissionDeadline,
    documentUrl,
  };
}

/**
 * Parses a TED API v3 search response payload into normalized tenders and total count.
 */
export function parseTedSearchResponse(raw: unknown): {
  tenders: NormalizedTender[];
  totalCount: number;
} {
  if (!isRecord(raw)) {
    return { tenders: [], totalCount: 0 };
  }

  const notices = Array.isArray(raw.notices) ? raw.notices : [];
  const tenders: NormalizedTender[] = [];
  for (const notice of notices) {
    const parsed = parseTedNotice(notice);
    if (parsed) {
      tenders.push(parsed);
    }
  }

  const totalCount =
    typeof raw.totalNoticeCount === 'number' && Number.isFinite(raw.totalNoticeCount)
      ? raw.totalNoticeCount
      : tenders.length;

  return { tenders, totalCount };
}
