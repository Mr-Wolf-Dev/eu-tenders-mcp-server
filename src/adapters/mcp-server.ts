import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import { filterAndDeduplicateTenders } from '../domain/tender-filter.js';
import { parseActorInput } from '../domain/tender-schema.js';
import type { BillingMeter } from '../ports/billing-meter.js';
import type { TenderSource } from '../ports/tender-source.js';

export interface McpServerDependencies {
  source: TenderSource;
  billing: BillingMeter;
}

function createConfiguredMcpServer(deps: McpServerDependencies): McpServer {
  const server = new McpServer({
    name: 'eu-tenders-mcp-server',
    version: '0.1.0',
  });

  server.registerTool(
    'search_eu_tenders',
    {
      description:
        'Search and filter European public procurement tenders (TED Europa) by country, CPV code, budget, and deadline.',
      inputSchema: {
        cpv: z.string().optional().describe('CPV code or prefix (e.g. "72000000" or "42600000")'),
        country: z
          .string()
          .optional()
          .describe('ISO-2 or ISO-3 country code (e.g. "IT", "DE", "FRA")'),
        minBudget: z.number().nonnegative().optional().describe('Minimum estimated value in EUR'),
        publishedFrom: z
          .string()
          .optional()
          .describe('Minimum publication date in YYYY-MM-DD format'),
        publishedTo: z
          .string()
          .optional()
          .describe('Maximum publication date in YYYY-MM-DD format'),
        minDeadline: z
          .string()
          .optional()
          .describe('Minimum submission deadline in YYYY-MM-DD format'),
        maxDeadline: z
          .string()
          .optional()
          .describe('Maximum submission deadline in YYYY-MM-DD format'),
        maxItems: z.number().int().min(1).max(100).optional().describe('Maximum tenders to return'),
      },
    },
    async ({ cpv, country, minBudget, publishedFrom, publishedTo, minDeadline, maxDeadline, maxItems }) => {
      const criteria = parseActorInput({
        countries: country ? [country] : [],
        cpvCodes: cpv ? [cpv] : [],
        minBudget,
        publishedFrom,
        publishedTo,
        minDeadline,
        maxDeadline,
        maxItems: maxItems ?? 20,
      });

      const raw = await deps.source.searchTenders(criteria);
      const tenders = filterAndDeduplicateTenders(raw, criteria);
      await deps.billing.charge('mcp-query', 1);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ count: tenders.length, tenders }, null, 2),
          },
        ],
      };
    },
  );

  server.registerTool(
    'get_tender_details',
    {
      description: 'Fetch normalized details for a specific TED Europa tender by publication ID.',
      inputSchema: {
        tenderId: z.string().min(1).describe('TED publication number (e.g. "48025-2024")'),
      },
    },
    async ({ tenderId }) => {
      const tender = await deps.source.getTenderById(tenderId);
      await deps.billing.charge('mcp-query', 1);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ found: tender !== null, tender }, null, 2),
          },
        ],
      };
    },
  );

  return server;
}

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  return raw.length > 0 ? (JSON.parse(raw) as unknown) : undefined;
}

/**
 * Creates a stateless Streamable HTTP MCP server compatible with Apify Standby mode.
 */
export function createMcpHttpServer(deps: McpServerDependencies): Server {
  return createServer(async (req: IncomingMessage, res: ServerResponse) => {
    const pathname = new URL(req.url ?? '/', 'http://localhost').pathname;

    if (req.method === 'GET' && (pathname === '/' || pathname === '/health')) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', service: 'eu-tenders-mcp-server' }));
      return;
    }

    if (pathname === '/mcp') {
      if (req.method !== 'POST') {
        res.writeHead(405, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Method Not Allowed. Use POST /mcp.' }));
        return;
      }

      const mcpServer = createConfiguredMcpServer(deps);
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
      });

      try {
        const body = await readJsonBody(req);
        await mcpServer.connect(transport);
        await transport.handleRequest(req, res, body);
      } catch (err) {
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              error: err instanceof Error ? err.message : 'Internal MCP server error',
            }),
          );
        }
      } finally {
        await transport.close().catch(() => {});
        await mcpServer.close().catch(() => {});
      }
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not Found' }));
  });
}
