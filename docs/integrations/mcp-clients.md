# MCP Client Integration Guide

This Actor runs in **Apify Standby Mode** as a stateless **Streamable HTTP MCP Server** exposing European public procurement tools directly to AI agents.

## Standby Endpoint

```text
https://mr-wolf-1--eu-tenders-mcp-server.apify.actor/mcp
```

Authenticate using your Apify API token via the `Authorization: Bearer <APIFY_TOKEN>` header.

---

## 1. Cursor (`.cursor/mcp.json`)

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

## 2. Claude Desktop (`claude_desktop_config.json`)

Using `mcp-remote` for Streamable HTTP:

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

## 3. Available MCP Tools

### `search_eu_tenders`
Search and filter EU public tenders from TED Europa.
- `cpv` *(string, optional)*: CPV code or prefix (e.g. `"72000000"`).
- `country` *(string, optional)*: ISO-2 or ISO-3 country code (e.g. `"IT"`, `"DE"`, `"FRA"`).
- `minBudget` *(number, optional)*: Minimum estimated value in EUR.
- `maxDeadline` *(string, optional)*: Maximum submission deadline (`YYYY-MM-DD`).
- `maxItems` *(integer, optional)*: Maximum tenders to return (`1`–`100`).

### `get_tender_details`
Fetch normalized details for a specific TED Europa notice.
- `tenderId` *(string, required)*: TED publication number (e.g. `"48025-2024"`).

## 4. Example Agent Prompts

- *"Find active IT software procurement tenders (`cpv: 72000000`) in Italy and Germany with a minimum budget of €100,000."*
- *"Get full normalized details for TED tender `48025-2024`."*
