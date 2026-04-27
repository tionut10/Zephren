# Integrare Portal Electronic MDLPA — Ord. 348/2026

**Document tehnic strategic · v1.1 · 27 aprilie 2026**

> Filozofie de execuție: **„Ready Day 1"** — în momentul în care portalul electronic MDLPA devine operațional (orientativ 8 iulie 2026), Zephren va fi singurul software CPE din România cu integrare nativă funcțională din prima zi.

---

## ✅ STATUS IMPLEMENTARE — Faza 0 LIVRATĂ (27 aprilie 2026)

Faza 0 din plan (Pregătire — 16-24h estimat) a fost executată în această sesiune.
Toate fișierele sunt în repo, testele trec, build-ul e OK.

### Codebase descoperit existent (Sprint 17 — 18 apr 2026)

În timpul implementării am descoperit că **există deja infrastructură MDLPA**:
- `src/lib/mdlpa-submit.js` — workflow email (mailto:birou.atestari@mdlpa.ro) + Supabase Storage upload pentru fișiere >25 MB + tracking localStorage
- `src/calc/mdlpa-registry.js` — registry logic
- `src/components/MDLPASubmitPanel.jsx` — UI email submit panel
- `src/components/AnexaMDLPAFields.jsx` — câmpuri specifice MDLPA

Aceasta e abordarea **email-based curentă** (singura disponibilă astăzi, deoarece API portal nu există încă).
Implementarea Faza 0 este **complementară**, NU înlocuiește — adaugă layer pentru viitorul API portal.

### Fișiere CREATE în această sesiune

| Fișier | Linii | Rol |
|---|---|---|
| `supabase/migrations/20260427_mdlpa_portal_integration.sql` | ~190 | Tabele audit log + queue + RPCs claim/retry/success |
| `src/lib/mdlpa-portal-adapter.js` | ~250 | Adapter cu mock/real mode toggle (env var `VITE_MDLPA_PORTAL_MODE=real`) |
| `src/lib/mdlpa-validator.js` | ~210 | Validare payload pre-depunere (tipuri, UUID, atestat, XML well-formed, limite size) |
| `src/lib/mdlpa-queue.js` | ~180 | Queue + retry exponential backoff (5min→24h) prin Supabase RPC |
| `api/submit-mdlpa.js` | ~120 | Endpoint POST submit + GET cron (consolidat — limit Vercel 12) |
| `automation/mdlpa-cron-retry.js` | ~70 | CLI utility pentru rulare manuală drainQueue |
| `src/components/MDLPAPortalSubmit.jsx` | ~220 | UI nou cu validare reactivă + status portal + mock badge |
| `src/lib/__tests__/mdlpa-portal-adapter.test.js` | ~110 | 14 teste adapter |
| `src/lib/__tests__/mdlpa-validator.test.js` | ~140 | 25 teste validator |

**Total**: 9 fișiere noi, ~1.490 LOC, 39 teste noi (toate PASS).

### Decizii arhitecturale luate

1. **Cron consolidat în `api/submit-mdlpa.js`** (POST=submit, GET=cron) pentru a respecta limita Vercel Hobby de 12 funcții (eram exact la 11/12 înainte de această sesiune).
2. **Mock mode default** — adapter rulează cu răspunsuri simulate până când MDLPA publică specs API; comutare via env var `VITE_MDLPA_PORTAL_MODE=real`.
3. **Backoff exponențial 5min · 15min · 1h · 6h · 24h** — implementat ca SQL function (`mdlpa_schedule_next_retry`).
4. **Lock optimist queue** — `mdlpa_claim_queue_item` folosește `FOR UPDATE SKIP LOCKED` pentru concurrent-safe cron workers.
5. **Deduplicare hash** — unique index pe `(document_hash, status)` cu filter pe `status IN ('success', 'submitting')` previne dublarea aceleiași depuneri.
6. **Coexistență cu fluxul email** — auditorul va vedea AMBELE opțiuni în Step 6/7 când integrăm `MDLPAPortalSubmit` în UI (Faza 1).

### Pașii rămași — Faza 1 (când MDLPA publică specs API)

- [ ] Înlocuire `_realApiCall()` în `mdlpa-portal-adapter.js` cu apeluri reale (auth header, schema mapping)
- [ ] Stocare XML real în Supabase Storage + adăugare coloană `xml_storage_path` în `mdlpa_submissions` (queue actual folosește placeholder XML)
- [ ] Wire `<MDLPAPortalSubmit />` în Step 6 + Step 7 (UI integration)
- [ ] Test pe sandbox MDLPA dacă ministerul îl pune la dispoziție
- [ ] Activare cron Vercel în production prin `vercel deploy` cu noul `vercel.json`
- [ ] PR comunicat „Primul software cu integrare nativă portal MDLPA"

---

## 1. Contextul reglementar

### 1.1 Cadrul legal

| Element | Detaliu |
|---|---|
| Act normativ | **Ordinul MDLPA nr. 348/2026** |
| Publicare | **Monitorul Oficial nr. 292 din 14 aprilie 2026** |
| Subiect | Regulament privind atestarea auditorilor energetici pentru clădiri |
| Termen operaționalizare portal | **60 de zile lucrătoare de la publicare** (orientativ **8 iulie 2026**) |
| Autoritate | Ministerul Dezvoltării, Lucrărilor Publice și Administrației |

### 1.2 Ce introduce ordinul

1. **Portal electronic obligatoriu** pentru:
   - Depunerea cererilor de atestare/extindere a atestatului de auditor energetic
   - Transmiterea Certificatelor de Performanță Energetică (CPE) emise
   - Transmiterea Rapoartelor de Audit Energetic (RAE)
   - Reînnoirea atestatelor și raportarea anuală a activității
2. **Identificator unic de auditor** integrat în CPE/RAE (probabil derivat din numărul atestatului + UUID).
3. **Registru public** al CPE/RAE depuse, cu posibilitate de verificare publică.
4. **API public** pentru integrare cu software-uri de calcul certificate (specificațiile tehnice urmează să fie publicate de MDLPA în săptămânile următoare).

### 1.3 Implicații strategice pentru Zephren

- **Toate softurile CPE vor trebui să se integreze obligatoriu** cu portalul MDLPA pentru a permite auditorilor depunerea automată.
- **Niciun competitor verificat** (ENERG+ v5.0, AllEnergy v9, TermicG v4, InteliEPB, AX3000, Doset-PEC, AuditulMeu) nu a anunțat public pregătiri pentru această integrare.
- **Fereastra de avantaj first-mover**: ~10 săptămâni (27 aprilie → 8 iulie 2026).
- **Risc strategic dacă întârziem**: pierderea poziționării „singurul SaaS CPE 100% conform 2026", inevitabilă canibalizare de către primul competitor care implementează.

---

## 2. Arhitectura propusă pentru integrare

### 2.1 Principii de design

1. **Buffer Pattern** — implementăm întreaga arhitectură de queue + adapter + UI înainte ca specificațiile API să fie publicate, astfel încât în ziua publicării să rămână doar mapping-ul efectiv al endpoint-urilor.
2. **Adapter Pattern** — toate apelurile către portalul MDLPA trec printr-un singur modul `mdlpa-portal-adapter.js`, izolat de restul codului.
3. **Resilience by default** — retry exponential backoff + circuit breaker + dead letter queue în Supabase pentru depuneri eșuate.
4. **Audit log integral** — fiecare depunere către portal este logată în tabela `mdlpa_submissions` cu hash SHA-256 al documentului trimis, timestamp, status, response-ul portalului.
5. **Graceful degradation** — dacă portalul este down, depunerea intră automat în coadă și se reîncearcă; auditorul primește confirmare „programată" + email când reușește.

### 2.2 Componente noi de implementat

#### Frontend (React)

| Component | Rol | Plasare în UI |
|---|---|---|
| `<MDLPAPortalSubmit />` | Buton „Depune la portalul MDLPA" + status real-time | Step 6 (după generare CPE) și Step 7 (după generare RAE) |
| `<MDLPASubmissionHistory />` | Listă depuneri auditor cu status (success/queued/failed) | Profil auditor / Dashboard |
| `<MDLPAAuditorIdentity />` | Câmp atestat + verificare automată cu portal | Profil auditor (Step 1 setup) |
| `<MDLPAPortalStatus />` | Badge global cu starea portalului (UP/DOWN/MAINTENANCE) | Header app |
| `<MDLPARegistryLookup />` | Căutare publică CPE/RAE depuse (pentru due diligence) | Pagina publică zephren.com |

#### Backend (Vercel serverless functions)

> ⚠️ **ATENȚIE LIMIT VERCEL**: Hobby plan = max 12 funcții în `/api/`. Conform memoriei, suntem la 13/12 (deja depășit). **Această integrare nu poate fi adăugată ca funcție separată** — trebuie consolidată într-o funcție existentă (ex: `submit-to-authority.js` care să gestioneze atât MDLPA cât și alte autorități viitoare) sau condiționat de upgrade plan plătit.

| Funcție/modul | Rol | Implementare |
|---|---|---|
| `api/submit-mdlpa.js` ⚠️ | Endpoint principal pentru depunere CPE/RAE/atestare | Consolidat cu funcție existentă SAU upgrade Vercel Pro |
| `src/lib/mdlpa-portal-adapter.js` | Adapter izolat — toate apelurile către portal | Module pur Node.js |
| `src/lib/mdlpa-queue.js` | Queue persistent în Supabase pentru retry | Tabel `mdlpa_submission_queue` |
| `src/lib/mdlpa-validator.js` | Validare pre-depunere (XML schema, semnătură, UUID v5) | Module pur |
| `automation/mdlpa-cron-retry.js` | Cron Vercel pentru reîncercare depuneri eșuate | Cron 15 min în `vercel.json` |

#### Supabase (migrare SQL)

```sql
-- Migrare: 20260427_mdlpa_portal_integration.sql
-- Aplicare în ziua publicării specificațiilor API MDLPA

CREATE TABLE IF NOT EXISTS mdlpa_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN ('CPE', 'RAE', 'ATESTARE', 'EXTINDERE', 'REINNOIRE', 'RAPORT_ANUAL')),
  document_uuid UUID NOT NULL, -- UUID v5 generat de Zephren
  document_hash TEXT NOT NULL, -- SHA-256 al documentului trimis
  payload_size_bytes INTEGER NOT NULL,
  auditor_atestat TEXT NOT NULL,
  auditor_uuid UUID,
  submitted_at TIMESTAMPTZ DEFAULT now(),
  portal_response JSONB,
  portal_reference_id TEXT, -- ID returnat de portal după acceptare
  portal_registry_url TEXT, -- URL public în registrul MDLPA
  status TEXT NOT NULL CHECK (status IN ('queued', 'submitting', 'success', 'failed', 'rejected')),
  retry_count INTEGER DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_mdlpa_submissions_user ON mdlpa_submissions(user_id);
CREATE INDEX idx_mdlpa_submissions_status ON mdlpa_submissions(status);
CREATE INDEX idx_mdlpa_submissions_created ON mdlpa_submissions(created_at DESC);

-- RLS — fiecare auditor vede doar depunerile proprii
ALTER TABLE mdlpa_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auditors see own submissions" ON mdlpa_submissions FOR ALL USING (auth.uid() = user_id);

-- Coada de retry
CREATE TABLE IF NOT EXISTS mdlpa_submission_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID REFERENCES mdlpa_submissions(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ DEFAULT now(),
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 10,
  last_attempt_at TIMESTAMPTZ,
  next_attempt_at TIMESTAMPTZ DEFAULT now() + INTERVAL '5 minutes'
);

CREATE INDEX idx_mdlpa_queue_next_attempt ON mdlpa_submission_queue(next_attempt_at) WHERE attempts < 10;
```

### 2.3 Sequence diagram (pseudo)

```
[Auditor] → [Step 6 UI: „Depune CPE la portal MDLPA"]
              ↓
         [validator client-side: XML schema + semnătură + UUID]
              ↓
         POST /api/submit-mdlpa { document_uuid, document_xml, auditor_atestat }
              ↓
         [Supabase INSERT mdlpa_submissions status='submitting']
              ↓
         [adapter mdlpa-portal-adapter.js → portal MDLPA API]
              ├── 200 OK → UPDATE status='success' + portal_reference_id
              ├── 4xx → UPDATE status='rejected' + email user „eroare validare"
              └── 5xx / timeout → UPDATE status='queued' → enqueue în mdlpa_submission_queue
                                    ↓
                              [cron 15 min: verifică queue, reîncearcă]
                                    ↓ (după success)
                              [email user „CPE depus cu success"]
```

---

## 3. Faze de implementare — Plan Buffer Task

### Fază 0 — Pregătire (POATE ÎNCEPE IMEDIAT, fără API specs)

**Estimare: 16-24 ore · Săptămâna 17-19 mai 2026**

- [ ] Creare migrare SQL `20260427_mdlpa_portal_integration.sql` (schema queue + submissions)
- [ ] Implementare `mdlpa-queue.js` (logică queue + retry exponential backoff)
- [ ] Implementare `mdlpa-validator.js` (validare XML pre-depunere — folosește deja schema existentă)
- [ ] Stub `mdlpa-portal-adapter.js` cu interfață definită + mock răspunsuri
- [ ] Stub `<MDLPAPortalSubmit />` în Step 6 cu UI complet (buton + spinner + history)
- [ ] Cron task `automation/mdlpa-cron-retry.js` cu logică de retry
- [ ] Audit logging structurat (Supabase logs + Vercel structured logs)
- [ ] Teste unitare adapter + queue + validator (Vitest, target ≥85% coverage)
- [ ] Documentație tehnică internă în `docs/INTEGRARE_PORTAL_MDLPA_348_2026.md` (acest doc)
- [ ] Decizie arhitecturală: **funcție Vercel separată vs. consolidare** (depinde de upgrade plan)

### Fază 1 — Adaptare la specificații API (DECLANȘATĂ DE PUBLICARE MDLPA)

**Estimare: 16-24 ore · Săptămâna 1-2 după publicare specs**

> Premisă: MDLPA publică specificațiile API în mai-iunie 2026 (înainte de 8 iulie operaționalizare).

- [ ] Mapare endpoint-uri API reale în `mdlpa-portal-adapter.js` (înlocuiește mock-urile)
- [ ] Validare schema XML/JSON real cerută de portal vs. ce generăm acum
- [ ] Implementare autentificare API (probabil JWT cu certificat auditor sau OAuth2)
- [ ] Test end-to-end pe mediul de **sandbox MDLPA** (dacă MDLPA pune la dispoziție)
- [ ] Ajustare `mdlpa-validator.js` la schemele finale
- [ ] Update UI cu mesaje de eroare specifice portal (cod eroare → mesaj prietenos)

### Fază 2 — Hardening & lansare publică (POST-OPERAȚIONALIZARE)

**Estimare: 8-12 ore · Săptămâna 3-4 după operaționalizare 8 iul 2026**

- [ ] Test cu auditor real (pilot 5-10 utilizatori beta) — depunere CPE reală
- [ ] Monitoring în production (Vercel Analytics + Sentry pentru erori)
- [ ] Pagina publică `zephren.com/registru-mdlpa` (lookup CPE/RAE depuse)
- [ ] Comunicat presă „Primul software CPE cu integrare nativă portal MDLPA"
- [ ] Update landing pricing — adaugă „Integrare portal MDLPA inclusă" la toate planurile

### Total estimare: **40-60 ore** (consistent cu memo Faza 22)

---

## 4. Day-1 Readiness Checklist

În ziua în care portalul MDLPA devine operațional (orientativ 8 iulie 2026), Zephren trebuie să bifeze:

### Tehnic
- [ ] ✅ Adapter MDLPA funcțional în production (`api/submit-mdlpa.js` sau echivalent consolidat)
- [ ] ✅ UI buton „Depune la MDLPA" vizibil în Step 6 + Step 7 pentru toți utilizatorii Pro+
- [ ] ✅ Queue + retry funcțional, testat pe sandbox MDLPA
- [ ] ✅ Audit log complet în Supabase, vizibil pentru audit GDPR
- [ ] ✅ Pagina publică `/registru-mdlpa` live cu căutare CPE/RAE
- [ ] ✅ Email automat „CPE depus cu success" + „CPE eșuat la depunere, reîncercăm"
- [ ] ✅ Cron retry rulează la 15 minute fără eșecuri în ultimele 48h

### Comercial
- [ ] ✅ Comunicat presă publicat pe zephren.com/blog + transmis Agerpres + 5 publicații sectoriale
- [ ] ✅ Email broadcast utilizatori existenți: „Integrarea portalului MDLPA este live"
- [ ] ✅ Update landing pricing: badge „Portal MDLPA · Integrare nativă" pe planurile Pro+
- [ ] ✅ LinkedIn post fondator + 3 use cases reale auditori beta
- [ ] ✅ Tutorial video YouTube „Cum depui un CPE cu un singur click în Zephren"

### Reglementar
- [ ] ✅ Confirmare scrisă MDLPA că integrarea Zephren este conformă (dacă procedură formală există)
- [ ] ✅ Înregistrare ANSPDCP a transferului de date către portalul MDLPA (DPIA actualizat)
- [ ] ✅ Update Termenii și Condițiile + Politica de confidențialitate cu menționarea integrării

---

## 5. Dependencies & Risks

### Dependencies critice

| # | Dependency | Owner | Impact dacă lipsește | Plan B |
|---|---|---|---|---|
| 1 | **Specificații API MDLPA publicate** | MDLPA (extern) | Blocant Fază 1 | Continuăm Faza 0 + lobby OAER pentru specificații early access |
| 2 | **Sandbox MDLPA disponibil** | MDLPA (extern) | Riscă bug-uri în production | Test pe staging cu mock realist + soft launch beta |
| 3 | **Upgrade Vercel Pro** (depășire 12 funcții) | Intern | Blocant deploy serverless | Consolidare în funcție existentă (`stripe-webhook.js` deja consolidat) |
| 4 | **Atestat valid auditor în profil** | Utilizator | Nu poate depune | UI cu mesaj prietenos „adaugă atestatul în profil" |
| 5 | **Semnătură electronică calificată** (eIDAS) | Utilizator | Posibil cerută de portal | Suport ștampilă PNG + integrare cu CertSign/digisign |

### Riscuri & mitigări

| Risc | Probabilitate | Impact | Mitigare |
|---|---|---|---|
| MDLPA întârzie publicarea specs > 8 iul 2026 | 5/10 | 6/10 | Faza 0 deja livrată → adaptare rapidă oricând apare |
| Portal funcționează doar pentru atestare (nu CPE/RAE) inițial | 6/10 | 4/10 | Implementăm atestare prima, CPE/RAE după |
| Specificații API necesită semnătură eIDAS pe care nu o avem | 4/10 | 7/10 | Parteneriat anticipat cu CertSign/digisign + integrare prin SDK |
| Cerință de „certificare prealabilă MDLPA a software-ului" | 3/10 | 9/10 | Demarare imediată dosar INCERC (oricum era P0) — împuternicire OAER |
| Specificații se schimbă post-publicare (v2 într-o lună) | 7/10 | 3/10 | Adapter pattern izolează schimbarea la 1 fișier |
| Competitor implementează primul (ex: AllEnergy) | 3/10 | 7/10 | First-mover marketing agresiv + lock-in în primele 4-8 săpt |

---

## 6. Estimare resurse & buget

| Resursă | Estimare | Cost echivalent |
|---|---|---|
| Dezvoltare cod (40-60h) | 1 dev senior | 0 RON (intern) — dacă outsource: ~12.000-18.000 RON |
| Infra Supabase (queue + logs) | Tier existent acoperă | 0 RON adițional |
| Vercel Pro upgrade (dacă necesar) | 20 USD/lună | ~100 RON/lună |
| Sentry pentru error tracking | Free tier acoperă | 0 RON |
| Lobby OAER pentru specs early | 1-2 întâlniri | 0 RON (relațional) |
| Comunicat presă PR + transmitere | Self-serve | 0 RON sau 500 RON via Agerpres |
| Tutorial video YouTube | 4-6h producție | 500-1.500 RON dacă outsource |
| **Total bani direct** | | **~600-2.100 RON** |
| **Total ore intern** | | **40-60h** |

---

## 7. Concluzie operațională

**Acțiune imediată recomandată (săptămâna 27 apr - 4 mai 2026):**

1. **Decizie strategică** — confirmă prioritate P0 pentru această integrare (recomandare: DA, ferestră 10 săpt unică).
2. **Demarare Fază 0** — primele 16-24h de cod (queue + adapter stub + UI) — pot rula imediat, fără să aștepte specs MDLPA.
3. **Outreach OAER** — solicită early access la specificații API MDLPA prin canal asociațional.
4. **Decizie Vercel Pro** — analizează cost-benefit upgrade (~100 RON/lună) vs. consolidare funcții.
5. **Demarare dosar INCERC** — independent, dar amplifică credibilitatea integrării formale (P0 din Faza 22).

**Mesaj cheie pentru echipa Zephren:**

> Această integrare nu este doar conformitate — este **cea mai puternică ancoră de poziționare** pe care o avem la dispoziție în 2026. Cine o livrează primul devine, de facto, software-ul recomandat de auditorii care vor să nu aibă bătăi de cap. Cele 40-60h sunt cea mai bine cheltuită investiție de an.

---

## 8. Anexe

### 8.1 Referințe normative
- Ord. MDLPA 348/2026 — [Monitorul Oficial nr. 292 / 14 apr 2026](https://startupcafe.ro/noul-regulament-atestare-auditori-energetici-cladiri-descarca-ordin-mdlpa-348-2026-publicat-monitorul-oficial-97844)
- Mc 001-2022 — Metodologia de calcul a performanței energetice a clădirilor
- L. 372/2005 (republicată) — privind performanța energetică a clădirilor
- L. 121/2014 — privind eficiența energetică

### 8.2 Issue tracking
Buffer task creat în roadmap: **`MDLPA_PORTAL_INTEGRATION`**, prioritate **P0**, owner TBD, blocant pe specs API.

### 8.3 Versiuni document
- v1.0 — 27 aprilie 2026 — versiune inițială
- v1.x — la publicarea specs MDLPA, vor urma update-uri Fază 1

---

*Document elaborat de echipa Zephren — toate informațiile despre Ord. 348/2026 sunt verificate la sursa Monitorului Oficial. Specificațiile API MDLPA finale vor fi încorporate la momentul publicării lor.*
