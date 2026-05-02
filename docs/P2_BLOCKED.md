# Task-uri P2 BLOCKED — dependențe externe

> Audit Zephren — 2 mai 2026 / Sprint 5
> Finalizat de Sprint 5: P2.1, P2.4, P2.7, P2.8 (4/8)
> Blocked de dependențe externe: P2.2, P2.3, P2.5, P2.6 (4/8)

---

## P2.2 — Numerotare câmpuri Step 6 vs formular MDLPA

**Status**: ⛔ BLOCKED — necesită PDF formular oficial Ord. MDLPA 16/2023

**Ce trebuie făcut**:
Numerotarea câmpurilor în Step6 (etichete A/B/C/D/E în AnexaMDLPAFields și
ordinea câmpurilor) este invenția dezvoltatorului. Auditul cere alinierea cu
litere/cifre EXACT din formularul oficial Ord. MDLPA 16/2023 (Anexa 1, Anexa 2).

**De ce e blocked**:
Nu avem PDF-ul oficial al formularului MDLPA descărcabil în repository. Citarea
existentă „Ord. MDLPA 16/2023" e doar legală — nu avem layout-ul tipografic.

**Cum se deblochează**:
1. Auditorul/PM-ul descarcă PDF-ul de pe portalul MDLPA: https://mdlpa.gov.ro
2. Salvăm PDF în `Normative/Ord_MDLPA_16-2023_Anexa1+2.pdf`
3. Comparăm vizual (sau via OCR) numerotarea actuală vs PDF
4. Refactorizăm AnexaMDLPAFields cu ordine + etichete exacte

**Impact dacă rămâne blocked**:
Mediu — auditorii pot completa toate câmpurile, dar mapparea cu formularul
oficial e doar funcțională, nu vizuală 1:1.

---

## P2.3 — Schemă XSD oficială XML MDLPA

**Status**: ⛔ BLOCKED — schemă XSD nepublicată de MDLPA

**Ce trebuie făcut**:
XML-ul exportat de Zephren folosește URN provizoriu
`urn:ro:mdlpa:certificat-performanta-energetica:2023` cu structură derivată din
Ord. 16/2023. Dacă MDLPA publică o XSD oficială pentru registrul electronic,
trebuie validate XML-urile generate vs schemă.

**De ce e blocked**:
La data 2 mai 2026, MDLPA nu a publicat încă XSD/JSON Schema pentru registrul
electronic CPE. URN-ul actual e provizoriu, conform interpretării noastre.

**Cum se deblochează**:
1. Monitorizare portal MDLPA / publicații Monitor Oficial pentru schemă XSD
2. Update generator XML cu schemaLocation + namespace oficial
3. Adăugare validare runtime cu librărie XSD (ex: `libxmljs2` server-side)
4. Test e2e XML → validator MDLPA

**Impact dacă rămâne blocked**:
Scăzut — registrul electronic nu e operațional la 2 mai 2026; auditorii
folosesc DOCX. XML-ul Zephren e pregătit pentru orice schemă viitoare.

---

## P2.5 — Endpoint `/api/verify/[code].js`

**Status**: ⛔ BLOCKED — Vercel Hobby plan la limită funcții (13/12)

**Ce trebuie făcut**:
Implementare endpoint serverless care primește un cod CPE și returnează
metadate (auditor, data emiterii, valabilitate). Înlocuiește landing-ul static
`public/cpe/verifica.html` (P0.3) cu validare reală pe server.

**De ce e blocked**:
Vercel Hobby plan limitează la 12 funcții serverless. La data 2 mai 2026,
proiectul are 13 funcții (depășește limitul cu 1; Vercel oprește deploy-uri
noi pentru funcții suplimentare). Adăugarea unui endpoint nou necesită:
- Upgrade la Vercel Pro ($20/lună), SAU
- Split unei funcții existente (ex. `analyze-drawing` din `import-document`),
  conform memoriei `[Funcții API amânate](deferred_api_functions.md)`

**Cum se deblochează**:
**Opțiunea A** — Upgrade Vercel Pro:
1. Plătire abonament Vercel Pro
2. `vercel ls` confirm 100+ funcții permise
3. Creare `api/verify/[code].js` cu lookup în Supabase

**Opțiunea B** — Split funcții existente:
1. Audit functions/ — identific funcții care pot fi împărțite
2. Migrarea unor sub-funcții la edge runtime (gratis)
3. Folosirea slot-ului eliberat pentru `/api/verify/[code]`

**Impact dacă rămâne blocked**:
Mediu — landing-ul static (`/cpe/verifica.html`) acceptă input manual și
afișează cod-ul; lipsa lookup-ului real e un constraint cunoscut și
documentat în UI ("registru MDLPA în pregătire").

---

## P2.6 — Pașaport renovare reactivat după transpunere EPBD

**Status**: ⏳ PENDING — așteaptă transpunere EPBD în drept român

**Ce trebuie făcut**:
P0.2 a marcat pașaportul renovare ca PREVIEW (fără valoare juridică în RO).
Când EPBD 2024/1275 Art. 12 este transpus în drept român (estimat 29.05.2026),
pașaportul trebuie reactivat:
- Eliminare label-uri PREVIEW + culori amber
- Restaurare integrare automată în CPE oficial (payload + UI Card)
- Update referințe legale: „L.X/2026 Art. Y — pașaport renovare obligatoriu"

**De ce e pending**:
EPBD nu este transpus în drept român la data 2 mai 2026. Termenul de
transpunere (29.05.2026) este pentru toate statele membre, dar România poate
publica legea cu întârziere (situație frecventă pentru directive UE).

**Cum se deblochează**:
1. Monitorizare Monitor Oficial pentru lege transpunere EPBD 2024/1275
2. Verificare conținut: este Art. 12 transpus? cu ce condiții?
3. Re-implementare pașaport conform legii naționale
4. Update P0.2 — readjustare etichete + integrare CPE

**Impact dacă rămâne blocked**:
Scăzut — codul există și funcționează; doar etichetarea e PREVIEW. Auditorii
pot folosi pașaportul intern pentru clienții care îl cer (fără valoare
juridică, dar util pentru raportare).

---

## Recomandare priorități post-Sprint 5

| Task | Prioritate | Acțiune |
|------|-----------|---------|
| P2.5 | **HIGH** | Decide upgrade Vercel Pro vs split funcție (cost $20/lună vs efort dev) |
| P2.6 | MEDIUM | Setup CronCreate / agent autonom pentru monitorizare Monitor Oficial → notifică la transpunere |
| P2.2 | MEDIUM | PM descarcă PDF MDLPA și fac mapare în Sprint 7 |
| P2.3 | LOW | Pasiv — verificăm trimestrial publicațiile MDLPA pentru XSD oficială |

---

**Audit Zephren — 2 mai 2026 / Sprint 5 / docs/P2_BLOCKED.md**
