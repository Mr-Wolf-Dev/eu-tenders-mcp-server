# MCP Directory Submission Kit (`mrWolf`)

Pacchetto pronto per elencare **EU Public Tenders & Grants Monitor** sulle principali directory MCP e repository GitHub in modo completamente anonimo sotto il brand **`mrWolf`**.

---

## 1. GitHub `awesome-mcp-servers` (Pull Request)

Repository target comuni (es. `punkpeye/awesome-mcp-servers`, `appcypher/awesome-mcp-servers`, `wong2/awesome-mcp-servers`):

- **Riga Markdown da aggiungere** (nella sezione *Finance / Business / Government / Search*):
  ```markdown
  - [eu-tenders-mcp-server](https://apify.com/mr.wolf/eu-tenders-mcp-server) ☁️ 📇 - Streamable HTTP MCP server for searching, filtering, and normalizing active European public procurement notices (TED Europa) by country, CPV code, budget, and deadline.
  ```
- **Titolo PR:**
  ```text
  Add eu-tenders-mcp-server (TED Europa public procurement MCP)
  ```
- **Descrizione PR:**
  ```markdown
  Adds **EU Public Tenders & Grants Monitor** (`mr.wolf/eu-tenders-mcp-server`), a hosted Streamable HTTP MCP Server exposing TED Europa public procurement data.

  - **Endpoint:** `https://mr-wolf-1--eu-tenders-mcp-server.apify.actor/mcp`
  - **Tools:** `search_eu_tenders`, `get_tender_details`
  - **Features:** ISO-2/3 country normalization, CPV prefix filtering, lot-level budget aggregation, publication & deadline windows.
  ```

---

## 2. Directory Web MCP (`glama.ai`, `mcp.so`, `pulsemcp.com`, `smithery.ai`)

Usa questi campi standard nei form di submission:

- **Name:** `EU Public Tenders & Grants Monitor`
- **Author / Brand:** `mrWolf`
- **Homepage / Store URL:** `https://apify.com/mr.wolf/eu-tenders-mcp-server`
- **MCP Server URL (Streamable HTTP):** `https://mr-wolf-1--eu-tenders-mcp-server.apify.actor/mcp`
- **Short Description:**
  ```text
  Hosted Streamable HTTP MCP server for searching and normalizing EU public procurement tenders from TED Europa by country, CPV code, budget, and deadline.
  ```
- **Tags:** `eu-tenders`, `ted-europa`, `public-procurement`, `b2g`, `cpv`, `mcp-server`, `apify`, `european-grants`
- **Manifest JSON:** usa [`docs/marketing/server.json`](./server.json).
