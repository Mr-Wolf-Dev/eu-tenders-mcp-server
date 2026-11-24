# Anonymous Launch Posts & SEO Article (`mrWolf`)

Contenuti pronti per la pubblicazione sotto profilo pseudonimo **`mrWolf`** (zero dati personali).

---

## 1. Apify Discord — `#showcase`

```markdown
🚀 **New Actor + Standby MCP Server: EU Public Tenders & Grants Monitor (TED Europa)**

Built a lightweight **HTTP-only** Actor (runs on **256 MB RAM**, zero headless browser) to extract, filter, and normalize European public procurement notices from **TED Europa API v3**.

**What it solves:**
- Normalizes multilingual titles/buyers & ISO-2/3 country codes
- Aggregates lot-level budgets (`estimated-value-lot`) when global `estimated-value-glo` is missing
- Filters by CPV prefix, budget, publication window (`publishedFrom`/`publishedTo`), and deadline (`minDeadline`/`maxDeadline`)
- Works both as a **Batch Dataset Actor** (n8n/Make) and as a **Standby Streamable HTTP MCP Server** (`search_eu_tenders`, `get_tender_details`)

🔗 **Store:** https://apify.com/mr.wolf/eu-tenders-mcp-server
🔌 **MCP Endpoint:** `https://mr-wolf-1--eu-tenders-mcp-server.apify.actor/mcp`

Feedback and feature requests welcome!
```

---

## 2. n8n Community — *Built with n8n / Show & Tell*

**Title:** `Automated Daily EU Public Tenders Alert (TED Europa + Apify + n8n)`

**Body:**
```markdown
If you track European public procurement notices on TED Europa, I put together a lightweight n8n workflow that fetches active tenders filtered by country, CPV code, budget, and submission deadline.

It calls `mr.wolf/eu-tenders-mcp-server` via Apify's synchronous dataset endpoint (`run-sync-get-dataset-items`), handles lot-level budget aggregation automatically, and outputs clean normalized JSON (`tenderId`, `title`, `buyerName`, `country`, `cpvCodes`, `estimatedValue`, `currency`, `submissionDeadline`, `documentUrl`).

Importable workflow JSON is included in the repo (`docs/integrations/n8n-workflow.json`), and you can swap the final node for Slack, Email, or Google Sheets.
```

---

## 3. Dev.to / Hashnode SEO Article Draft

**Title:** `How to Monitor EU Public Tenders (TED Europa) with AI Agents via MCP`
**Tags:** `mcp`, `ai`, `automation`, `typescript`

```markdown
Finding relevant public procurement tenders across 27+ EU countries on TED Europa usually means wrestling with complex expert-search syntax, multilingual fields, and split lot-level budgets.

In this quick guide, you'll connect **Cursor** or **Claude Desktop** to a hosted **Streamable HTTP MCP Server** (`eu-tenders-mcp-server`) so your AI assistant can search and filter live EU tenders on demand.

### Step 1: Connect the MCP Server in Cursor

Add this to `.cursor/mcp.json`:

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

### Step 2: Query Live Tenders in Natural Language

Ask your agent:
> *"Find active IT software tenders (`cpv: 72000000`) in Italy and Germany published since 2026-11-01 with a deadline after 2026-12-01."*

Behind the scenes, the agent calls `search_eu_tenders`, which:
1. Queries TED Europa v3 sorted newest-first (`publication-date DESC`).
2. Aggregates lot-level budgets (`estimated-value-lot`) when global estimates are omitted.
3. Returns clean normalized JSON ready for analysis or B2G outreach.

### Prefer No-Code Automation?

You can also run the same Actor on a daily schedule in **n8n** or **Make** using the Store page: https://apify.com/mr.wolf/eu-tenders-mcp-server
```
