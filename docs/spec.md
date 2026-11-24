# Specification & Pre-Agreed Test Seams

## 1. Canonical Domain Model (`NormalizedTender`)

Every tender notice extracted from TED Europa is normalized into the following shape:

- `tenderId`: `string` — Unique TED publication number (e.g. `"48025-2024"`).
- `title`: `string` — Notice title, preferring English (`eng`) when present, else first available language.
- `buyerName`: `string` — Contracting authority name, preferring English (`eng`) when present, else first available language.
- `country`: `string` — ISO 3166-1 alpha-2 country code (e.g. `"IT"`, `"DE"`, `"FR"`, `"HR"`), or `"EU"` fallback.
- `cpvCodes`: `string[]` — Deduplicated list of CPV codes in original order.
- `estimatedValue`: `number | null` — Estimated contract value as a finite number, or `null` if omitted.
- `currency`: `string | null` — Uppercase ISO 4217 currency code (e.g. `"EUR"`), or `null` if omitted.
- `publicationDate`: `string` — ISO date (`YYYY-MM-DD`) with timezone suffix stripped.
- `submissionDeadline`: `string | null` — Latest valid lot submission deadline (`YYYY-MM-DD`), or `null` if omitted.
- `documentUrl`: `string` — Canonical TED notice URL.

## 2. Pre-Agreed Test Seams

| Seam | Module / Interface | What It Catches | What It Misses |
| --- | --- | --- | --- |
| 1 | `src/domain/tender-schema.ts` (`parseActorInput`, `NormalizedTenderSchema`, `toIso2Country`, `toIso3Country`) | Invalid country codes, malformed CPV codes, inverted budget ranges (`minBudget > maxBudget`), invalid ISO dates, `maxItems` out of bounds. | Live TED API syntax errors (covered by HTTP client seam). |
| 2 | `src/domain/ted-parser.ts` (`parseTedNotice`, `parseTedSearchResponse`) | TED v3 multilingual maps, duplicate CPV codes, array/string `estimated-value-glo`, timezone-suffixed dates, multi-lot deadlines, missing optional fields, malformed notices. | HTTP transport & pagination (covered by `TedHttpClient`). |
| 3 | `src/domain/tender-filter.ts` (`filterAndDeduplicateTenders`) | Country filtering, CPV prefix/exact matching, budget bounds with missing values, deadline cutoffs, duplicate `tenderId` removal, `maxItems` cap. | Upstream TED query filtering. |
| 4 | `src/adapters/ted-http-client.ts` (`TedHttpClient` implementing `TenderSource`) | TED expert query construction, multi-page pagination, 429/5xx retries, `getTenderById` not-found handling (tested with `msw`). | Live TED API availability. |
| 5 | `src/adapters/apify-actor.ts` (`runTenderExtraction` orchestrator) | Input validation -> fetch -> filter/deduplicate -> `pushData` -> `BillingMeter.charge('tender-extracted', count)` wiring. | Apify Cloud platform billing UI configuration. |
| 6 | `src/adapters/mcp-server.ts` (`createMcpHttpServer`) | Streamable HTTP MCP protocol handshake, `search_eu_tenders` and `get_tender_details` tool schemas & outputs, `BillingMeter.charge('mcp-query')`, Apify Standby readiness probe (`GET /` -> `200`). | External client (Claude Desktop / Cursor) config syntax. |

## 3. Vertical Slices (Tracer Bullets)

1. **Slice 1:** Domain schemas & country normalization (`tender-schema.ts`).
2. **Slice 2:** TED Europa notice & search response parser (`ted-parser.ts`).
3. **Slice 3:** Tender filter & deduplicator (`tender-filter.ts`).
4. **Slice 4:** Ports (`TenderSource`, `BillingMeter`) & `TedHttpClient` with `msw`.
5. **Slice 5:** Apify Actor extraction orchestrator & PPE billing (`apify-actor.ts`).
6. **Slice 6:** Standby MCP Server & `main.ts` entrypoint (`mcp-server.ts`, `main.ts`).
