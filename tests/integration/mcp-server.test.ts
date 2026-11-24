import type { AddressInfo } from 'node:net';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import fixture from '../fixtures/ted-search-response.json' with { type: 'json' };
import { parseTedSearchResponse } from '../../src/domain/ted-parser.js';
import type { BillingEventName, BillingMeter } from '../../src/ports/billing-meter.js';
import type { TenderSource } from '../../src/ports/tender-source.js';
import { createMcpHttpServer } from '../../src/adapters/mcp-server.js';

const { tenders: fixtureTenders } = parseTedSearchResponse(fixture);

function createFakeSource(): TenderSource {
  return {
    async searchTenders() {
      return fixtureTenders;
    },
    async getTenderById(tenderId: string) {
      return fixtureTenders.find((t) => t.tenderId === tenderId) ?? null;
    },
  };
}

describe('createMcpHttpServer (Standby MCP Server)', () => {
  const charges: Array<{ eventName: BillingEventName; count: number }> = [];
  const billing: BillingMeter = {
    async charge(eventName, count = 1) {
      charges.push({ eventName, count });
    },
  };

  let baseUrl = '';
  let closeServer: () => Promise<void>;

  beforeAll(async () => {
    const server = createMcpHttpServer({
      source: createFakeSource(),
      billing,
    });

    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address() as AddressInfo;
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });

    closeServer = () =>
      new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
  });

  afterAll(async () => {
    await closeServer();
  });

  it('responds 200 to Apify Standby readiness probe on GET /', async () => {
    const res = await fetch(`${baseUrl}/`, {
      headers: { 'x-apify-container-server-readiness-probe': '1' },
    });
    expect(res.status).toBe(200);
  });

  it('exposes search_eu_tenders and get_tender_details over Streamable HTTP and charges mcp-query', async () => {
    const client = new Client({ name: 'test-mcp-client', version: '1.0.0' });
    const transport = new StreamableHTTPClientTransport(new URL(`${baseUrl}/mcp`));
    await client.connect(transport);

    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual(['get_tender_details', 'search_eu_tenders']);

    const searchResult = await client.callTool({
      name: 'search_eu_tenders',
      arguments: {
        country: 'IT',
        cpv: '42600000',
        publishedFrom: '2024-01-01',
        minDeadline: '2024-02-20',
      },
    });
    const searchText = (searchResult.content as Array<{ type: string; text: string }>)[0]?.text ?? '';
    const parsedSearch = JSON.parse(searchText) as { count: number; tenders: Array<{ tenderId: string }> };
    expect(parsedSearch.count).toBe(1);
    expect(parsedSearch.tenders[0]?.tenderId).toBe('48025-2024');

    const detailsResult = await client.callTool({
      name: 'get_tender_details',
      arguments: { tenderId: '48025-2024' },
    });
    const detailsText =
      (detailsResult.content as Array<{ type: string; text: string }>)[0]?.text ?? '';
    const parsedDetails = JSON.parse(detailsText) as { found: boolean; tender: { tenderId: string } };
    expect(parsedDetails.found).toBe(true);
    expect(parsedDetails.tender.tenderId).toBe('48025-2024');

    const missingResult = await client.callTool({
      name: 'get_tender_details',
      arguments: { tenderId: 'MISSING-999' },
    });
    const missingText =
      (missingResult.content as Array<{ type: string; text: string }>)[0]?.text ?? '';
    const parsedMissing = JSON.parse(missingText) as { found: boolean; tender: null };
    expect(parsedMissing).toEqual({ found: false, tender: null });

    expect(charges).toEqual([
      { eventName: 'mcp-query', count: 1 },
      { eventName: 'mcp-query', count: 1 },
      { eventName: 'mcp-query', count: 1 },
    ]);

    await transport.close();
  });
});
