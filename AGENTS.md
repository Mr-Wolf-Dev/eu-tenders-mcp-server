# AGENTS.md

Repository rules and engineering workflow for **EU Public Tenders & Grants Monitor (Apify Actor + MCP Server)**.

## Architecture & Boundaries

- **TypeScript strict mode** (`strict: true`, `noUncheckedIndexedAccess: true`, ESM `NodeNext`).
- **HTTP-only**: Never introduce Playwright, Puppeteer, or headless browser dependencies.
- **Pure `src/domain/`**: `src/domain/**` MUST NOT import `apify`, `crawlee`, `got-scraping`, or `@modelcontextprotocol/sdk` (enforced by `eslint.config.js`).
- **Ports & Adapters**:
  - `src/domain/`: Zod contracts, TED parser, tender filters, normalization.
  - `src/ports/`: Interfaces / pre-agreed test seams (`TenderSource`, `BillingMeter`).
  - `src/adapters/`: `ted-http-client.ts`, `apify-actor.ts`, `mcp-server.ts`.
  - `src/main.ts`: Thin entrypoint.

## TDD & Development Workflow

1. Define/agree on **test seams** and domain contracts before writing implementation code.
2. Follow **Red-Green** TDD using `vitest` (`tests/unit/` with real fixtures in `tests/fixtures/` and `msw` for HTTP mocking).
3. Never write tautological tests or couple tests to private implementation details.
4. Keep `GLOSSARY.md` and `docs/adr/` updated when domain rules or architectural decisions change.

## Verification Commands

Always run before finishing any change:

```bash
npm run typecheck && npm run lint && npm test && npm run build
```
