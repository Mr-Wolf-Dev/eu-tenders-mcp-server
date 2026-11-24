# ADR 001: HTTP-Only Scraping & Hexagonal Architecture

- **Status:** Accepted
- **Date:** 2026-11-23

## Context

The **EU Public Tenders & Grants Monitor** is an Apify Actor monetized via **Pay-Per-Event (PPE)** and also exposed as a **Standby MCP Server**. In a PPE model, profit margin depends directly on keeping compute/memory consumption minimal per extracted tender and per MCP query. Headless browsers (Playwright/Puppeteer) require 1–4 GB of RAM and slow startup times, eroding PPE margins and increasing Standby cold-start latency.

Additionally, the project follows strict **TDD** on pre-agreed test seams, requiring domain logic to be fast, deterministic, and testable in isolation without an Apify runtime.

## Decision

1. **HTTP-Only Data Acquisition:** Use lightweight HTTP clients (`got-scraping`, `crawlee` `HttpCrawler`/`CheerioCrawler`, `cheerio`) and structured public endpoints (TED Europa API / XML / JSON) with zero headless browser dependencies. Target runtime memory is `< 512 MB`.
2. **Hexagonal (Ports & Adapters) Module Separation:**
   - `src/domain/`: Pure TypeScript domain schemas (`zod`), parsers, filters, and normalization logic. **Zero** imports from `apify`, `crawlee`, `got-scraping`, or `@modelcontextprotocol/sdk` (enforced by ESLint `no-restricted-imports`).
   - `src/ports/`: Explicit TypeScript interfaces (`TenderSource`, `BillingMeter`) acting as pre-agreed test seams.
   - `src/adapters/`: Platform and transport implementations (`ted-http-client.ts`, `apify-actor.ts`, `mcp-server.ts`).
   - `src/main.ts`: Thin entrypoint wiring adapters and domain logic.

## Consequences

- **Positive:** High PPE margin, sub-512MB memory footprint, fast Vitest unit tests using local fixtures (`tests/fixtures/`) and `msw`, clean separation between domain rules and Apify/MCP plumbing.
- **Negative / Trade-offs:** Cannot execute client-side JavaScript on portals that lack structured HTTP/API endpoints; if a future source strictly requires a browser, it must be isolated behind a separate adapter or Actor.
