import type { FilterCriteria, NormalizedTender } from './tender-schema.js';

function matchesCriteria(tender: NormalizedTender, criteria: FilterCriteria): boolean {
  if (criteria.countries.length > 0) {
    const countryUpper = tender.country.toUpperCase();
    const matched = criteria.countries.some((c) => c.toUpperCase() === countryUpper);
    if (!matched) {
      return false;
    }
  }

  if (criteria.cpvCodes.length > 0) {
    const matched = tender.cpvCodes.some((cpv) =>
      criteria.cpvCodes.some((prefix) => cpv.startsWith(prefix)),
    );
    if (!matched) {
      return false;
    }
  }

  if (criteria.minBudget !== undefined || criteria.maxBudget !== undefined) {
    if (tender.estimatedValue === null) {
      return false;
    }
    if (criteria.minBudget !== undefined && tender.estimatedValue < criteria.minBudget) {
      return false;
    }
    if (criteria.maxBudget !== undefined && tender.estimatedValue > criteria.maxBudget) {
      return false;
    }
  }

  if (criteria.publishedFrom !== undefined && tender.publicationDate < criteria.publishedFrom) {
    return false;
  }

  if (criteria.publishedTo !== undefined && tender.publicationDate > criteria.publishedTo) {
    return false;
  }

  if (criteria.minDeadline !== undefined) {
    if (tender.submissionDeadline === null || tender.submissionDeadline < criteria.minDeadline) {
      return false;
    }
  }

  if (criteria.maxDeadline !== undefined) {
    if (tender.submissionDeadline === null || tender.submissionDeadline > criteria.maxDeadline) {
      return false;
    }
  }

  return true;
}

/**
 * Deduplicates normalized tenders by tenderId, filters by criteria, and truncates to maxItems.
 */
export function filterAndDeduplicateTenders(
  tenders: readonly NormalizedTender[],
  criteria: FilterCriteria,
): NormalizedTender[] {
  const seenIds = new Set<string>();
  const result: NormalizedTender[] = [];

  for (const tender of tenders) {
    if (seenIds.has(tender.tenderId)) {
      continue;
    }
    seenIds.add(tender.tenderId);

    if (!matchesCriteria(tender, criteria)) {
      continue;
    }

    result.push(tender);
    if (result.length >= criteria.maxItems) {
      break;
    }
  }

  return result;
}
