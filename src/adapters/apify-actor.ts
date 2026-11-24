import { Actor } from 'apify';
import { filterAndDeduplicateTenders } from '../domain/tender-filter.js';
import { parseActorInput, type NormalizedTender } from '../domain/tender-schema.js';
import type { BillingEventName, BillingMeter } from '../ports/billing-meter.js';
import type { TenderSource } from '../ports/tender-source.js';
import { TedHttpClient } from './ted-http-client.js';

export interface ExtractionDependencies {
  source: TenderSource;
  billing: BillingMeter;
  pushData: (items: NormalizedTender[]) => Promise<void>;
}

/**
 * Validates input, queries TenderSource, filters/deduplicates, pushes to dataset, and charges PPE events.
 */
export async function runTenderExtraction(
  rawInput: unknown,
  deps: ExtractionDependencies,
): Promise<NormalizedTender[]> {
  const criteria = parseActorInput(rawInput);
  const rawTenders = await deps.source.searchTenders(criteria);
  const tenders = filterAndDeduplicateTenders(rawTenders, criteria);

  if (tenders.length > 0) {
    await deps.pushData(tenders);
    await deps.billing.charge('tender-extracted', tenders.length);
  }

  return tenders;
}

/**
 * Creates a BillingMeter backed by Apify Actor.charge() for Pay-Per-Event monetization.
 */
export function createApifyBillingMeter(): BillingMeter {
  return {
    async charge(eventName: BillingEventName, count = 1): Promise<void> {
      await Actor.charge({ eventName, count });
    },
  };
}

/**
 * Runs the standard batch Apify Actor extraction mode.
 */
export async function runActorMode(): Promise<void> {
  const input = await Actor.getInput();
  const source = new TedHttpClient();
  const billing = createApifyBillingMeter();

  await runTenderExtraction(input, {
    source,
    billing,
    pushData: async (items) => {
      await Actor.pushData(items);
    },
  });
}
