# Miniguida Operativa: Lancio, Monetizzazione & Crescita su Apify Store

Guida pratica passo-passo per pubblicare, testare, promuovere e mantenere **EU Public Tenders & Grants Monitor (`mr.wolf/eu-tenders-mcp-server`)**.

---

## 1. Configurazione `Publication` su Apify Console

Apri il tuo Actor: `https://console.apify.com/actors/9zmNfCdRuQ1erkqjb` → tab **Publication**.

- **Title (SEO):**
  ```text
  EU Public Tenders & Grants Monitor (TED Europa + MCP Server)
  ```
- **Short description:**
  ```text
  Extract, filter & normalize active EU public procurement tenders from TED Europa by country, CPV code, budget & deadline. Ready for batch runs, n8n/Make, and Standby MCP Server for AI agents.
  ```
- **Categories:** `AI / Agents / MCP` (se presente), `Business`, `Lead generation`.
- **Icona:** carica un'immagine ad alto contrasto leggibile in 48×48 px (senza testo piccolo).
- **Visibility:** imposta **`Public`** e clicca **Save / Publish**.

---

## 2. Default Run Options (Massimo Margine PPE)

Nella tab **Settings / Source → Default run options**:
- **Memory:** `256 MB` (o `512 MB`) — l'Actor è HTTP-only senza browser headless.
- **Timeout:** `120` secondi.
- **Build tag:** `latest`.

---

## 3. Monetizzazione Pay-Per-Event (PPE)

Nella tab **Publication → Monetization → Set up monetization**:

1. **Mantieni `apify-actor-start`** (`$0.00005`): azzera i costi compute dei primi 5 secondi di ogni run.
2. **Rimuovi `apify-default-dataset-item` (`Result`)**: evita il doppio addebito per ogni bando.
3. **Configura gli eventi custom:**
   - `tender-extracted` — *Title:* `Tender extracted` — *Description:* `Single normalized EU public tender extracted from TED Europa.` — *Price:* `$0.005` – `$0.01`
   - `mcp-query` — *Title:* `MCP tool query` — *Description:* `Single MCP tool call (search_eu_tenders or get_tender_details) in Standby mode.` — *Price:* `$0.02` – `$0.05`
4. **Apify Store pricing discounts:** attiva gli sconti automatici per i piani Starter/Scale/Business.
5. **Pay per event + usage:** lascia **disattivato**.
6. **Primary event:** seleziona `tender-extracted` → completa **Review**.

---

## 4. Verifiche Live da CLI

### Test Batch (256 MB RAM + dataset output)
```bash
apify call mr.wolf/eu-tenders-mcp-server -m 256 -o -i '{"countries":["IT"],"publishedFrom":"2026-11-01","minDeadline":"2026-12-01","maxItems":5}'
```

### Test Standby MCP Server
```bash
# Healthcheck Standby
apify server request mr.wolf/eu-tenders-mcp-server /

# Lista tool MCP
apify server request POST mr.wolf/eu-tenders-mcp-server /mcp \
  -H '{"Content-Type":"application/json","Accept":"application/json, text/event-stream"}' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'

# Ricerca bandi via MCP
apify server request POST mr.wolf/eu-tenders-mcp-server /mcp \
  -H '{"Content-Type":"application/json","Accept":"application/json, text/event-stream"}' \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"search_eu_tenders","arguments":{"country":"IT","publishedFrom":"2026-11-01","minDeadline":"2026-12-01","maxItems":3}}}'
```

---

## 5. Integrazioni Pronte per gli Utenti

Condividi direttamente i template già inclusi nel repository:
- **AI Agents (Cursor / Claude Desktop):** [`docs/integrations/mcp-clients.md`](./integrations/mcp-clients.md)
- **n8n:** [`docs/integrations/n8n-workflow.json`](./integrations/n8n-workflow.json)
- **Make.com:** [`docs/integrations/make-scenario.json`](./integrations/make-scenario.json)

---

## 6. Promozione & Primi Utenti (MAU)

Lo Store di Apify premia gli Actor con **utenti attivi mensili (MAU)** reali e alto **Actor Quality Score**:

1. **Apify Discord (`#showcase`):** pubblica il link all'Actor evidenziando che è **HTTP-only (256 MB)** + **Standby MCP Server** nativo per agenti AI.
2. **Community n8n / Make / LinkedIn:** condividi il JSON di [`docs/integrations/n8n-workflow.json`](./integrations/n8n-workflow.json) con un caso d'uso concreto:
   > *"Come monitorare automaticamente ogni mattina i nuovi bandi pubblici europei (TED Europa) filtrati per Paese, codice CPV e budget, o interrogarli direttamente da Claude/Cursor via MCP."*

---

## 7. Manutenzione & Aggiornamenti

Prima di ogni nuovo deploy su Apify Cloud, esegui sempre:

```bash
npm run typecheck && npm run lint && npm test && npm run build && apify push
```

Controlla settimanalmente le tab **Issues** e **Monitoring** in Console per mantenere il **success rate > 98%** e rispondere rapidamente alle segnalazioni degli utenti.
