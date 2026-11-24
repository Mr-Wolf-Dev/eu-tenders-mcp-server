import { describe, expect, it } from 'vitest';
import fixture from '../fixtures/ted-search-response.json' with { type: 'json' };
import { parseTedSearchResponse } from '../../src/domain/ted-parser.js';
import type { BillingEventName, BillingMeter } from '../../src/ports/billing-meter.js';
import type { TenderSource } from '../../src/ports/tender-source.js';
import { runTenderExtraction } from '../../src/adapters/apify-actor.js';

const { tenders: fixtureTenders } = parseTedSearchResponse(fixture);

function createFakeSource(tenders = fixtureTenders): TenderSource {
  return {
    async searchTenders() {
      return tenders;
    },
    async getTenderById(tenderId: string) {
      return tenders.find((t) => t.tenderId === tenderId) ?? null;
    },
  };
}

function createSpyBilling() {
  const charges: Array<{ eventName: BillingEventName; count: number }> = [];
  const meter: BillingMeter = {
    async charge(eventName, count = 1) {
      charges.push({ eventName, count });
    },
  };
  return { meter, charges };
}

describe('runTenderExtraction (Apify Actor orchestrator)', () => {
  it('validates input, filters/deduplicates tenders, pushes to dataset, and charges PPE events', async () => {
    const pushed: unknown[] = [];
    const { meter, charges } = createSpyBilling();

    const result = await runTenderExtraction(
      { countries: ['IT'], maxItems: 10 },
      {
        source: createFakeSource([fixtureTenders[0]!, fixtureTenders[0]!, fixtureTenders[1]!]),
        billing: meter,
        pushData: async (items) => {
          pushed.push(...items);
        },
      },
    );

    expect(result).toHaveLength(2);
    expect(pushed).toHaveLength(2);
    expect(charges).toEqual([{ eventName: 'tender-extracted', count: 2 }]);
  });

  it('does not push data or charge PPE when zero tenders match', async () => {
    const pushed: unknown[] = [];
    const { meter, charges } = createSpyBilling();

    const result = await runTenderExtraction(
      { countries: ['ES'] },
      {
        source: createFakeSource(fixtureTenders),
        billing: meter,
        pushData: async (items) => {
          pushed.push(...items);
        },
      },
    );

    expect(result).toEqual([]);
    expect(pushed).toEqual([]);
    expect(charges).toEqual([]);
  });

  it('rejects invalid input before calling TenderSource', async () => {
    let called = false;
    const { meter } = createSpyBilling();

    await expect(
      runTenderExtraction(
        { minBudget: 500, maxBudget: 100 },
        {
          source: {
            async searchTenders() {
              called = true;
              return [];
            },
            async getTenderById() {
              return null;
            },
          },
          billing: meter,
          pushData: async () => {},
        },
      ),
    ).rejects.toThrow();

    expect(called).toBe(false);
  });
});
