import { pathToFileURL } from 'node:url';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { Actor } from 'apify';
import { createApifyBillingMeter, runActorMode } from './adapters/apify-actor.js';
import { createConfiguredMcpServer, createMcpHttpServer } from './adapters/mcp-server.js';
import { TedHttpClient } from './adapters/ted-http-client.js';

export async function main(): Promise<void> {
  const source = new TedHttpClient();
  const billing = createApifyBillingMeter();

  if (process.env.MCP_TRANSPORT === 'stdio' || process.argv.includes('--stdio')) {
    const server = createConfiguredMcpServer({ source, billing });
    const transport = new StdioServerTransport();
    await server.connect(transport);
    return;
  }

  await Actor.init();

  const isStandby = process.env.APIFY_META_ORIGIN === 'STANDBY';

  if (isStandby) {
    const port = Number(process.env.ACTOR_STANDBY_PORT ?? 4321);
    console.log(`Starting MCP Standby server on port ${port}`);
    const server = createMcpHttpServer({ source, billing });

    await new Promise<void>((resolve) => {
      server.listen(port, () => resolve());
    });
    return;
  }

  console.log('Running batch tender extraction mode');

  try {
    await runActorMode();
  } finally {
    await Actor.exit();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main();
}
