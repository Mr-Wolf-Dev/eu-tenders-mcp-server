# EU Public Tenders & Grants Monitor (TED Europa API + MCP Server)

Extract, filter, and normalize **active European public procurement notices**, **EU public tenders**, and **European grants** directly from **TED Europa** (Tenders Electronic Daily) — available both as a fast **HTTP-only Apify Actor** and as a **Standby MCP Server** for AI agents.

Designed for **Pay-Per-Event (PPE)** cost efficiency with **zero headless browsers** (runs smoothly on **256 MB RAM**).

---

## Why Use This TED Europa Scraper & MCP Server?

- **HTTP-Only Speed & Low Cost:** Queries TED Europa API v3 directly with automatic retries (`429`/`5xx`) and pagination — no Playwright or Puppeteer overhead.
- **Lot-Level Budget Aggregation:** Automatically falls back to summing `estimated-value-lot` and reading `estimated-value-cur-lot` when global `estimated-value-glo` is omitted, recovering budgets that naive scrapers miss.
- **Clean Canonical Normalization:**
  - Prefers English titles/buyer names when available, falling back cleanly to local EU languages.
  - Normalizes ISO 3166-1 alpha-2 and alpha-3 country codes (`IT` / `ITA`, `DE` / `DEU`, `FR` / `FRA`, etc.).
  - Deduplicates CPV codes and `tenderId`s, and selects the latest valid submission deadline across all lots.
- **Active-First Sorting & Period Windows:** Automatically sorts newest-first (`publication-date DESC`) and filters by both publication window (`publishedFrom` / `publishedTo`) and submission deadline window (`minDeadline` / `maxDeadline`).
- **Dual Mode (Batch + Standby MCP):** Export structured JSON/CSV datasets for **n8n** and **Make**, or connect **Claude Desktop** and **Cursor** directly to the live Streamable HTTP MCP endpoint.

---

## Popular Use Cases

- **B2G Lead Generation:** Daily automated alerts for new IT, construction, healthcare, or energy tenders above a target budget.
- **Consulting & Grant Agencies:** Track regional and national EU procurement opportunities across 30+ European countries.
- **AI Procurement Assistants:** Let Claude or Cursor search live EU tenders and inspect notice details on demand via MCP.

---

## Input Examples (Copy-Paste)

### 1. Active Italian IT & Software Tenders
```json
{
  "countries": ["IT"],
  "cpvCodes": ["72000000"],
  "minBudget": 50000,
  "maxItems": 25
}
```

### 2. Recent EU Tenders by Publication & Deadline Window
```json
{
  "countries": ["IT", "DE", "FR"],
  "publishedFrom": "2026-11-01",
  "minDeadline": "2026-12-01",
  "maxItems": 50
}
```

### 3. DACH & Benelux Construction / Engineering Tenders
```json
{
  "countries": ["DE", "AT", "CH", "NL", "BE"],
  "cpvCodes": ["45", "71"],
  "minBudget": 250000,
  "maxItems": 50
}
```

---

## Common CPV Codes Reference

| CPV Prefix | Sector |
| --- | --- |
| `72000000` | IT services: consulting, software development, Internet & support |
| `45000000` | Construction work |
| `71000000` | Architectural, construction, engineering & inspection services |
| `33000000` | Medical equipments, pharmaceuticals & personal care products |
| `79000000` | Business services: law, marketing, consulting, recruitment, printing |
| `09000000` | Petroleum products, fuel, electricity & other sources of energy |

---

## Input Parameters

| Field | Type | Description | Default |
| --- | --- | --- | --- |
| `countries` | `string[]` | ISO 3166-1 alpha-2 or alpha-3 country codes (e.g. `["IT", "DE", "FRA"]`). | `[]` |
| `cpvCodes` | `string[]` | CPV codes or prefixes (2–8 digits, e.g. `["72000000"]`). | `[]` |
| `minBudget` | `integer` | Minimum estimated contract value in EUR. | — |
| `maxBudget` | `integer` | Maximum estimated contract value in EUR. | — |
| `publishedFrom` | `string` | Minimum publication date (`YYYY-MM-DD`). | — |
| `publishedTo` | `string` | Maximum publication date (`YYYY-MM-DD`). | — |
| `minDeadline` | `string` | Minimum submission deadline (`YYYY-MM-DD`). | — |
| `maxDeadline` | `string` | Maximum submission deadline (`YYYY-MM-DD`). | — |
| `maxItems` | `integer` | Maximum number of normalized tenders to return (`1`–`1000`). | `50` |

---

## Output Example (`NormalizedTender`)

```json
{
  "tenderId": "812690-2026",
  "title": "Italy – Enteral feeds – APPALTO FORNITURA DI DIETETICI E NUTRIENTI...",
  "buyerName": "Azienda Sanitaria Territoriale di Ancona",
  "country": "IT",
  "cpvCodes": ["33692300"],
  "estimatedValue": 9149003.12,
  "currency": "EUR",
  "publicationDate": "2026-11-23",
  "submissionDeadline": "2026-12-28",
  "documentUrl": "https://ted.europa.eu/en/notice/-/detail/812690-2026"
}
```

---

## Standby MCP Server for AI Agents

Connect **Cursor**, **Claude Desktop**, or any Streamable HTTP MCP client to:

```text
https://mr-wolf-1--eu-tenders-mcp-server.apify.actor/mcp
```

### Cursor (`.cursor/mcp.json`)
```json
{
  "mcpServers": {
    "eu-tenders": {
      "url": "https://mr-wolf-1--eu-tenders-mcp-server.apify.actor/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_APIFY_TOKEN"
      }
    }
  }
}
```

### Claude Desktop (`claude_desktop_config.json`)
```json
{
  "mcpServers": {
    "eu-tenders": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://mr-wolf-1--eu-tenders-mcp-server.apify.actor/mcp",
        "--header",
        "Authorization:Bearer YOUR_APIFY_TOKEN"
      ]
    }
  }
}
```

### Exposed MCP Tools
- `search_eu_tenders(cpv, country, minBudget, publishedFrom, publishedTo, minDeadline, maxDeadline, maxItems)`
- `get_tender_details(tenderId)`

See [`docs/integrations/mcp-clients.md`](./docs/integrations/mcp-clients.md) for full details.

---

## Automation Integrations (n8n & Make)

- **n8n workflow template:** [`docs/integrations/n8n-workflow.json`](./docs/integrations/n8n-workflow.json)
- **Make.com scenario blueprint:** [`docs/integrations/make-scenario.json`](./docs/integrations/make-scenario.json)

---

## Pay-Per-Event (PPE) Pricing

- `apify-actor-start`: Standard Actor startup event (covers initial compute).
- `tender-extracted`: Charged once per normalized tender pushed to the dataset in batch mode.
- `mcp-query`: Charged once per MCP tool invocation (`search_eu_tenders` or `get_tender_details`) in Standby mode.

---

## Frequently Asked Questions (FAQ)

**How is `estimatedValue` calculated when a tender has multiple lots?**
If TED provides a global `estimated-value-glo`, it is used directly. Otherwise, the Actor automatically sums all lot-level `estimated-value-lot` values and resolves the currency from `estimated-value-cur-lot`.

**Does this Actor require proxies or a headless browser?**
No. It queries TED Europa's official v3 HTTP API directly, keeping memory usage around 256 MB and execution times to a few seconds.

**Can I search historical (closed) tenders as well as active ones?**
Yes. By default, searches target `ACTIVE` notices sorted newest-first. When you pass `publishedFrom` or `publishedTo`, the Actor automatically queries `ALL` notices within your publication window, and `get_tender_details` always searches `ALL` notices by `tenderId`.

**How do I filter by broad sector instead of an exact 8-digit CPV code?**
Pass a 2-to-4 digit CPV prefix such as `["72"]` (IT services) or `["45"]` (construction). The filter matches any tender whose CPV codes start with that prefix.

---

## Local Development

```bash
npm run typecheck && npm run lint && npm test && npm run build
apify run --purge
```
