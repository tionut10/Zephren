# P3 — Pregătire pentru Vercel Pro

**Data**: 11 mai 2026
**Status**: 12/12 funcții serverless ocupate pe Vercel Hobby (limită atinsă)
**Acțiune necesară**: upgrade la Vercel Pro ($20/lună/user) pentru ≥13 funcții + cron jobs

---

## Activări post upgrade Pro

### 1. Endpoint-uri `api/_deferred/*` → mută în `api/`

**3 fișiere skeleton existente** — gata pentru activare:

#### `_deferred/rehab-prices-update.js` → `api/rehab-prices-update.js`
- Vercel cron lunar (prima zi a lunii la ora 3:00)
- Scrape INCD URBAN INCERC + Daibau + ReConstruct prețuri reabilitare
- Update REHAB_PRICES via GitHub PR auto-create (necesită GH_TOKEN env var)
- **Trigger**: după upgrade Pro + setare GH_TOKEN în env Vercel project settings
- **Estimare activare**: 1h (mv + env vars + cron config în vercel.json)

#### `_deferred/anre-tariff-scrape.js` → `api/anre-tariff-scrape.js`
- Vercel cron lunar comparator ANRE (gaz casnic + electricitate plafonată)
- Update preset `casnic_2025` → `casnic_2026_qX` în energy-prices.js
- **Trigger**: după upgrade Pro
- **Estimare activare**: 1h

#### `_deferred/energy-prices-live.js` → `api/energy-prices-live.js`
- Scrape OPCOM PZU (preț spot electricitate) + ENTSO-E PV utility-scale
- Cache memorie 1h, cu fallback la `energy-prices-live.js` client-side
- **Trigger**: după upgrade Pro + ENTSOE_API_KEY env var
- **Estimare activare**: 2h (cont API ENTSO-E + env config)

### 2. PAdES B-T/B-LT real (post certSIGN onboarding)

**Skeleton-uri existente**:
- `src/lib/pades-sign.js` (~480 LOC) — orchestrator PAdES complet
- `src/lib/qtsp-providers/mock.js` (DEV) + `certsign.js` (skeleton REST API)
- `docs/CERTSIGN_SETUP.md` — ghid onboarding cont B2B certSIGN

**Activare reală**:
1. Cont B2B certSIGN (~150-400 EUR/lună pentru 1k-15k semnături/lună)
2. Setare env vars Vercel: `CERTSIGN_CLIENT_ID`, `CERTSIGN_CLIENT_SECRET`
3. Endpoint serverless nou `api/qtsp-proxy.js` (12+1 → necesită Pro)
4. UI swap `signerConfig.provider="certsign"` (în loc de "mock")
5. DSS dictionary populat cu cert chain + OCSP din certSIGN response
6. B-LTA archive timestamp pentru păstrare 50+ ani

**Estimare**: 4-6h dezvoltare + 1-2 zile onboarding certSIGN + ~3h testing pilot.

### 3. PDF/A-3 sRGB ICC profile real

**Status actual**: `src/data/icc-srgb-profile.js` cu placeholder gol (~3KB pikepdf real amânat).

**Activare**:
- Embed profil sRGB v2 real (~3KB ASCII-encoded ICC)
- Server-side via pikepdf Python (`api/generate-document.py` extension)
- **Estimare**: 1h (download profil sRGB ASRO/MDLPA + base64 encode)

### 4. AI Vision endpoint-uri P2 (~25h)

**4 endpoint-uri necesită Vercel Pro pentru slot dedicat**:
- `api/ai-ocr-plan.js` — PDF plan constructiv → straturi opace automat
- `api/ai-thermal-bridge.js` — Foto racord constructiv → tip punte + ψ catalog
- `api/ai-foto-fatada.js` — Foto față clădire → estimare tip + perioadă
- `api/ai-ocr-factura-energie.js` — Factură PDF → preset energie + consum istoric

Necesită Claude Vision (Sonnet 4.6 cu input image base64). Buget API: ~$10-30/lună la 100 utilizatori.

### 5. Endpoint dedicat `api/ai-rehab-chat.js`

**Status actual**: multiplexat pe `api/ai-assistant.js` cu intent="rehab-chat" (audit mai 2026 F5).

**Post Pro**:
- Migrare la endpoint dedicat (refactor 30min)
- Permite streaming SSE pentru UX mai bun (token-by-token vs await complete)
- Permite rate limit dedicat (50 mesaje/h pentru rehab-chat vs 20 pentru Q&A)

### 6. Endpoint dedicat `api/ai-narrative.js`

**Status actual**: multiplexat pe `api/ai-assistant.js` cu intent="narrative" (audit mai 2026 F6).

**Post Pro**: similar — migrare 30min + streaming + rate limit dedicat.

---

## Costuri estimate post Pro

### Vercel
- **Pro plan**: $20/user/lună (1 user = $20/lună)
- **Bandwidth**: 1TB inclus (suficient pentru <10k users activi)
- **Funcții serverless**: limită 1.000 deployment / 30s timeout / 3GB memory (vs Hobby 100/10s/1GB)
- **Cron jobs**: nelimitate (Hobby: 0)

### Claude API (post-activare features complete P1+P2)
- **Pilot** (10 utilizatori): $5/lună
- **Producție** (100 utilizatori): $50-150/lună
- **Scale** (1000 utilizatori): $500-1.500/lună

### certSIGN B2B (PAdES real)
- **Starter**: 150 EUR/lună (1.000 semnături)
- **Professional**: 250 EUR/lună (5.000 semnături)
- **Enterprise**: 400 EUR/lună (15.000 semnături)

### ENTSO-E API
- Gratuit (cu API key — registrare academică/business)

---

## Activări STAGED (ordine recomandată)

### Etapă 1 — imediat după upgrade Pro (1-2 zile):
1. ✅ Activare endpoint-uri `_deferred/*` (cron lunar INCD + ANRE) — minimal effort
2. ✅ Embed profil sRGB ICC real în pdfa-export.js
3. ✅ Migrare `ai-rehab-chat` + `ai-narrative` la endpoint-uri dedicate (cu streaming)

### Etapă 2 — săptămâna 1-2 post Pro:
4. Cont certSIGN B2B + setup PAdES real (post-onboarding)
5. Setup ENTSO-E API key + activare `energy-prices-live.js`

### Etapă 3 — sprint AI Vision (~25h dev, ~1 lună elapse):
6. `ai-ocr-plan.js` (Claude Vision — straturi opace din PDF)
7. `ai-ocr-factura-energie.js` (Claude Vision — preset energie din factură)
8. `ai-foto-fatada.js` (estimare tip+perioadă din foto)
9. `ai-thermal-bridge.js` (tip punte + ψ din foto)

### Etapă 4 — sprint AI features P1 complete (~63h dev, ~2 luni elapse):
10. 10 endpoint-uri AI P1 noi (vezi `ai-features-architecture.md` Group A-D)
11. 4 componente React AI noi (AIAssistantWidget, AIInputSuggestion, AIExplainCard, AINarrativeButton)

---

## Trigger upgrade Pro

**Recomandare**: upgrade când oricare din următoarele:
- Cerere reală pentru activare cron lunar (3+ feedback-uri auditori despre prețuri stale)
- Primul parteneriat real certSIGN B2B (PAdES juridic obligatoriu)
- Lansare AI Vision pilot (necesită ~$30-50/lună API + slot dedicat)

**Spune-mi „upgrade Vercel Pro activ"** și voi executa Etapa 1 (~3h dev cumulativ).
