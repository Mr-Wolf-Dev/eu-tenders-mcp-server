# Piano di Sviluppo: EU Public Tenders & Grants Monitor (Apify Actor + MCP Server)

> **Obiettivo:** Costruire, testare in TDD e pubblicare su Apify Store un Actor TypeScript **HTTP-only** ad alto margine (pricing **Pay-Per-Event**) che estrae, normalizza e filtra bandi di gara europei (TED Europa e portali pubblici strutturati), esponendoli sia come dataset strutturato sia come **MCP Server** interrogabile da agenti AI.

---

## 1. Ambiente LLM, CLI e Installazione Skill

Il progetto è progettato per essere sviluppato tramite un coding agent da terminale (consigliato **Claude Code**, compatibile anche con **Codex CLI** e **Gemini CLI**).

### 1.1 CLI di Sistema Necessarie
* **Node.js 22+ / 24+** (`nvm` consigliato)
* **Apify CLI:** `npm install -g apify-cli` → autenticazione con `apify login`
* **GitHub CLI (`gh`)** (opzionale, se usi GitHub Issues come tracker per le skill di Pocock)

### 1.2 Skill di Matt Pocock (`mattpocock/skills`)
Le skill di Matt Pocock governano l'intero ciclo ingegneristico (domain modeling, spec, ticket tracer-bullet, TDD Red-Green e code review).

* **Claude Code:**
  ```bash
  claude plugin install mattpocock-skills@claude-plugins-official
  ```
* **Codex CLI:**
  ```bash
  codex plugin marketplace add mattpocock/skills
  codex plugin add mattpocock-skills@mattpocock
  ```
* **Gemini CLI:**
  ```bash
  gemini skills install https://github.com/mattpocock/skills.git --path skills/engineering
  ```
* **Configurazione iniziale nel repository (obbligatoria una tantum):**
  Avvia l'agente nella root del repo ed esegui:
  ```text
  /setup-matt-pocock-skills
  ```
  Scegli il tracker (GitHub Issues o Local Markdown in `.scratch/`) e la struttura dei documenti di dominio (`GLOSSARY.md` + `docs/adr/`).

### 1.3 Skill Ufficiali Apify (`apify/agent-skills` + CLI Skill)
Forniscono all'agente conoscenza procedurale validata su schemi Apify, Actor lifecycle, deploy e integrazioni.

* **Installazione via Skills CLI / Claude Code:**
  ```bash
  npx skills add apify/agent-skills
  ```
* **Skill integrata nella Apify CLI (sempre allineata alla versione installata):**
  ```bash
  mkdir -p ~/.claude/skills/apify-cli
  apify help --skill > ~/.claude/skills/apify-cli/SKILL.md
  ```
* **Skill Apify da utilizzare in questo progetto:**
  * `apify-actor-development`: creazione, schema (`input_schema.json`, `dataset_schema.json`, `output_schema.json`), test locali e deploy con `apify push`.
  * `apify-integration-development`: definizione delle integrazioni verso n8n, Make e client AI.
  * `apify-ultimate-scraper`: analisi rapida dei competitor sullo Store e benchmarking.

---

## 2. Server MCP da Configurare

Configura i seguenti server MCP nel file di configurazione del tuo agente (es. `.mcp.json` nella root del progetto o config globale della CLI):

```json
{
  "mcpServers": {
    "apify": {
      "url": "https://mcp.apify.com/"
    },
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp"]
    }
  }
}
```

### Ruolo dei Server MCP nello Sviluppo
1. **Apify MCP Server (`https://mcp.apify.com/` — OAuth o Bearer Token):**
   * *Documentation tools:* ricerca live nella documentazione ufficiale Apify, SDK e specifiche PPE.
   * *Actor builds & runs:* verifica dei build log, avvio di run di test sul cloud e ispezione dei dataset prodotti.
   * *Actor discovery:* analisi degli Actor concorrenti nella nicchia bandi/tender.
   * *Alternativa locale (stdio):* `npx @apify/actors-mcp-server` con `APIFY_TOKEN`.
2. **Context7 MCP:**
   * Recupero della documentazione aggiornata di `crawlee`, `got-scraping`, `zod`, `vitest` e `@modelcontextprotocol/sdk` per evitare API deprecate.

---

## 3. Stack Tecnologico e Architettura TDD-Ready

### 3.1 Stack Tecnologico
* **Linguaggio:** TypeScript (strict mode)
* **Runtime:** Node.js 22+
* **Scraping HTTP-only (massimo margine PPE):** `apify`, `crawlee` (`CheerioCrawler` / `HttpCrawler`), `got-scraping`, `cheerio` (nessun browser headless salvo necessità estrema).
* **Validazione contratti & schemi:** `zod`
* **Esposizione MCP Runtime (Server Actor / Standby):** `@modelcontextprotocol/sdk` (Streamable HTTP transport)
* **Test Framework (TDD):** `vitest` + `msw` (Mock Service Worker) o `nock` per intercettare le chiamate HTTP ai portali pubblici con fixture reali salvate in locale.
* **Qualità codice:** `eslint` / `oxlint`, `prettier` / `oxfmt`, `tsc --noEmit`.

### 3.2 Architettura a Moduli Profondi e "Test Seams"
Seguendo le skill `/codebase-design` e `/tdd` di Matt Pocock, l'architettura separa nettamente la **logica di dominio testabile in isolamento** dall'adattatore di piattaforma (Apify SDK):

```text
src/
├── domain/                  # Logica pura, zero dipendenze da Apify SDK
│   ├── tender-schema.ts     # Contratti Zod (Input, NormalizedTender, FilterCriteria)
│   ├── ted-parser.ts        # Trasformazione payload XML/JSON TED -> NormalizedTender
│   └── tender-filter.ts     # Filtri per CPV, Paese, budget, scadenza
├── ports/                   # Interfacce / Test Seams pre-concordati
│   ├── tender-source.ts     # Interfaccia Fetcher HTTP
│   └── billing-meter.ts     # Interfaccia per il conteggio eventi PPE
├── adapters/
│   ├── ted-http-client.ts   # Implementazione reale con got-scraping + retry
│   ├── apify-actor.ts       # Wiring con Actor.main(), Dataset.pushData(), Actor.charge()
│   └── mcp-server.ts        # Esposizione tool MCP (Standby / Server Actor)
└── main.ts                  # Entrypoint leggero
tests/
├── fixtures/                # Snapshot reali di risposte TED API / XML
├── unit/                    # Test comportamentali sui Test Seams (Red-Green)
└── integration/             # Test end-to-end del Server MCP e Actor input/output
```

---

## 4. Workflow TDD con le Skill di Matt Pocock

Ogni funzionalità deve seguire rigidamente la catena di skill di Pocock, evitando i tre anti-pattern principali (**test accoppiati all'implementazione**, **test tautologici** e **horizontal slicing**):

1. **Allineamento di Dominio (`/grill-with-docs`):**
   * Interroghi l'agente sui requisiti dei bandi UE (codici CPV, valute, date di scadenza, regole di deduplicazione). L'agente genera e aggiorna `GLOSSARY.md` e `docs/adr/`.
2. **Specifica e Accordo sui Seam (`/to-spec`):**
   * Sintetizza la conversazione in una specifica formale e definisce esplicitamente i **pre-agreed test seams** (es. contratto del parser TED, contratto del filtro CPV/budget, contratto del billing PPE) *prima* di scrivere qualsiasi riga di codice.
3. **Scomposizione Verticale (`/to-tickets`):**
   * Spezza la spec in ticket **tracer-bullet** (fette verticali funzionanti) con dipendenze bloccanti esplicite.
4. **Sviluppo Guidato da Test (`/implement` → `/tdd`):**
   * `/implement` prende in carico un ticket alla volta e guida `/tdd` lavorando **solo sui seam concordati**.
   * **Regola Red-Green:** `/tdd` scrive un singolo test fallimentare con valori attesi presi da fixture/spec reali (mai calcolati con la stessa logica del codice), poi scrive il minimo codice per farlo passare. *Nessuna fase di refactor dentro `/tdd`.*
5. **Revisione e Refactoring (`/code-review`):**
   * Eseguita come sessione/step separato al termine del ticket: verifica che siano stati usati solo i test seam concordati, elimina duplicazioni e rifinisce i moduli profondi (appoggiandosi a `/codebase-design`) prima del commit.
6. **Miglioramento Continuo (`/retro`):**
   * A fine sprint, aggiorna `CLAUDE.md` / `AGENTS.md` e gli script di verifica per eliminare attriti ricorrenti.

---

## 5. Fasi di Sviluppo e Integrazioni (14 Giorni / ~20-25 Ore)

### Fase 1: Bootstrap & Domain Modeling (Giorni 1–2)
* **Azioni CLI/Agent:**
  * Inizializza repo TypeScript + `vitest` + `zod`.
  * Esegui `/setup-matt-pocock-skills`.
  * Usa `apify-actor-development` per generare la struttura `.actor/` (`actor.json`, `input_schema.json`, `dataset_schema.json`).
  * Esegui `/grill-with-docs` per fissare lo schema canonico `NormalizedTender` e salvare 3–5 risposte reali di TED Europa in `tests/fixtures/`.
* **Output:** `GLOSSARY.md`, `docs/adr/001-http-only-architecture.md`, Specifica completa via `/to-spec` e backlog in ticket via `/to-tickets`.

### Fase 2: Core Parser, Filtri e Deduplicazione in TDD (Giorni 3–6)
* **Ticket Tracer-Bullet (eseguiti con `/implement` + `/tdd` + `/code-review`):**
  1. *Ticket 1:* Validazione `input_schema` (paesi ISO, codici CPV, range budget, date) con Zod.
  2. *Ticket 2:* Parser TED (estrazione titolo, ente appaltante, CPV, valore stimato, deadline, URL documento) testato su fixture reali.
  3. *Ticket 3:* Motore di filtro e normalizzazione valute/date.
  4. *Ticket 4:* Gestione paginazione, rate-limit e retry su `ted-http-client.ts` (testato con `msw`).
* **Verifica:** `vitest run` 100% verde, `tsc --noEmit` senza errori, zero dipendenze da Apify nel layer `domain/`.

### Fase 3: Integrazione Apify SDK, Billing PPE e Modalità MCP Server (Giorni 7–10)
* **Azioni:**
  * Collega il core ad `apify-actor.ts` implementando `Actor.charge({ eventName: 'tender-extracted' })` per il modello **Pay-Per-Event**.
  * Aggiungi l'adattatore `mcp-server.ts` (modalità Standby / Server Actor) che espone i tool MCP:
    * `search_eu_tenders(cpv, country, minBudget, maxDeadline)`
    * `get_tender_details(tenderId)`
  * Scrivi test di integrazione che simulano chiamate MCP client → Server Actor verificando output JSON e conteggio eventi PPE.
  * Test locale con `apify run --purge`.

### Fase 4: Integrazioni Esterne (n8n / Make) e Pubblicazione Store (Giorni 11–14)
* **Azioni:**
  * Usa la skill `apify-integration-development` per preparare esempi pronti d'uso (template JSON per **n8n** e **Make** + snippet di connessione per **Claude Desktop / Cursor** via MCP).
  * Deploy su Apify Cloud con `apify push` e verifica build/run tramite **Apify MCP Server**.
  * Configura il pricing **Pay-Per-Event** nella Apify Console (es. `$0.01` per bando estratto, `$0.05` per query MCP) sfruttando i crediti del piano Creator.
  * Ottimizza `README.md` per la SEO interna dello Store (keyword: *EU tenders*, *TED Europa*, *public procurement*, *MCP server*).
  * Esegui `/retro` per consolidare le regole del repo prima di replicare il template sul 2° Actor verticale.

---

## 6. Checklist Pre-Lancio (Definition of Done)
- [ ] Tutti i test unitari e di integrazione passano (`npm test` + `npm run typecheck`).
- [ ] Nessun browser headless nel bundle (verifica memoria < 512MB per massimizzare il margine PPE).
- [ ] `input_schema.json` e `dataset_schema.json` validati senza warning da `apify push`.
- [ ] Test live eseguito su Apify Console con verifica del costo compute vs evento PPE addebitato.
- [ ] Endpoint MCP testato end-to-end da un client MCP reale.