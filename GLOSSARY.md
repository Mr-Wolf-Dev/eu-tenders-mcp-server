# Domain Glossary

> Pure domain vocabulary for **EU Public Tenders & Grants Monitor**.

- **TED Europa (Tenders Electronic Daily):** The official online supplement to the Official Journal of the European Union for public procurement notices.
- **Notice:** A published procurement announcement identified by a unique publication number (e.g. `48025-2024`).
- **CPV (Common Procurement Vocabulary):** Standardized 2-to-8 digit classification code used across EU public procurement to categorize goods, works, and services (e.g. `72000000` for IT services).
- **Contracting Authority / Buyer:** The public-sector body or entity publishing a tender notice or grant call.
- **NormalizedTender:** The canonical representation of a tender notice containing identifier, title, buyer name, ISO-2 country code, deduplicated CPV codes, optional estimated value and currency, publication date, optional submission deadline, and canonical document URL.
- **Filter Criteria:** The normalized search parameters specifying target ISO-2 countries, CPV prefixes, optional minimum and maximum budget, optional maximum submission deadline, and maximum item count.
- **Submission Deadline:** The latest calendar date (`YYYY-MM-DD`) among all lots of a notice by which economic operators may submit bids.
- **Pay-Per-Event (PPE):** Monetization model charging per discrete business outcome (such as extracting a tender or executing an MCP query) rather than raw compute duration.
- **Standby Mode:** Always-ready HTTP server mode serving Model Context Protocol (MCP) tool calls on demand.
- **Test Seam:** A pre-agreed public boundary where behavioral tests observe module outputs without coupling to internal implementation details.
