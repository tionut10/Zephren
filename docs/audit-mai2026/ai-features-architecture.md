# Arhitectură AI completă — Audit mai 2026 (Phase 4 raport)

**Data**: 11 mai 2026
**Auditor**: Claude Opus 4.7 (1M, Max effort)

---

## Status actual AI Pack Zephren

### Endpoint-uri Vercel serverless active (`api/`)

| Endpoint | Funcție | Model | Stare |
|---|---|---|---|
| `api/ai-assistant.js` | Q&A normativ Mc 001/EPBD/ISO 52000 + **chat reabilitare F5** + **narrative documente F6** | Haiku 4.5 / Sonnet 4.6 per intent | ✅ ACTIV |
| `api/chat-import.js` | AI document import (extracție automată Excel/PDF date clădire) | Haiku 4.5 | ✅ ACTIV |
| `api/ocr-cpe.js` | OCR CPE existent (din PDF scan → date structurate) | (extern Mistral/Google Vision) | ✅ ACTIV |

### Routing intent în `api/ai-assistant.js` (post F5+F6)

```js
intent === "rehab-chat"  → Sonnet 4.6 + 1500 tokens + history (10 msg)
                          + SYSTEM_PROMPT_REHAB_CHAT (Mc 001 Cap.9 + prețuri 2026 + Casa Verde)
intent === "narrative"   → Sonnet 4.6 + 2000 tokens (fără history)
                          + SYSTEM_PROMPT_NARRATIVE (6 secțiuni documente)
default (q&a normativ)   → Haiku 4.5 + 1024 tokens
                          + SYSTEM_PROMPT (Mc 001 + EPBD + ISO 52000)
```

**Beneficiu multiplexare**: zero slot Vercel Hobby nou ocupat (12/12 limită). Cu upgrade Pro, migrare 30min la endpoint-uri dedicate.

### Componente React AI

| Componentă | Funcție | Stare |
|---|---|---|
| `ChatImport.jsx` | AI document import flow | ✅ ACTIV |
| `AppDiagnostic.jsx` | (alt scop, nu AI) | — |
| `RehabAIChat.jsx` **NEW F5** | Panel flotant chat reabilitare Pas 7 | ✅ ACTIV |

---

## Roadmap AI complet — endpoint-uri propuse

### Tabel general (priorizare P0/P1/P2)

| # | Endpoint | Pas | Funcție | Ore | Prioritate | Vercel slot |
|---:|---|:---:|---|---:|:---:|---|
| 1 | `api/ai-assistant.js` (intent="rehab-chat") | 7 | Chat reabilitare F5 | 6 | **P0 ✅ DONE** | refold |
| 2 | `api/ai-assistant.js` (intent="narrative") | Doc | Text narativ 6 secțiuni F6 | 4 | **P0 ✅ DONE** | refold |
| 3 | `api/ai-zone-climatica.js` | 1 | Geocoding OSM → zonă I-V cu confidence | 3 | P1 | nou (post Pro) |
| 4 | `api/ai-wizard-categorie.js` | 1 | Limbaj natural → categorie + subcategorie | 5 | P1 | refold pe ai-assistant |
| 5 | `api/ai-straturi-constructive.js` | 2 | Vârstă + tip → straturi default sugerate | 4 | P1 | refold |
| 6 | `api/ai-ocr-plan.js` | 2 | PDF plan → straturi automat (Vision) | 8 | P2 | nou (post Pro) |
| 7 | `api/ai-thermal-bridge.js` | 2 | Foto racord → tip punte + ψ catalog (Vision) | 6 | P2 | nou (post Pro) |
| 8 | `api/ai-foto-fatada.js` | 2 | Foto față clădire → estimare tip+perioadă (Vision) | 5 | P2 | nou (post Pro) |
| 9 | `api/ai-hvac-suggest.js` | 3 | Vârstă+tipologie → preset HVAC + RES | 4 | P1 | refold |
| 10 | `api/ai-bacs-recommend.js` | 3 | Date Pas 1+2 + țintă clasă → BACS optim | 3 | P2 | refold |
| 11 | `api/ai-ocr-factura-energie.js` | 3 | Factură PDF → preset energie + consum istoric | 6 | P1 | nou (Vision) |
| 12 | `api/ai-pv-sizing.js` | 4 | Acoperiș + orientare → capacitate optimă PV | 3 | P1 | refold |
| 13 | `api/ai-res-recommend.js` | 4 | Tipologie + buget → combinație RES optimă | 5 | P1 | refold |
| 14 | `api/ai-casa-verde.js` | 4 | Eligibilitate Casa Verde Plus + estimare subvenție | 3 | P2 | refold |
| 15 | `api/ai-anomaly-detect.js` | 5 | EP aberant (>500 casă / <30 RI) → alertă | 3 | P1 | refold |
| 16 | `api/ai-ep-explain.js` | 5 | Text narativ 200-300 cuvinte explicând EP | 5 | **P0 ✅ via narrative cap1_descriere** | refold |
| 17 | `api/ai-class-roadmap.js` | 5 | Drum clasă curentă → nZEB cu măsuri prioritizate | 5 | P2 | refold |
| 18 | `api/ai-cpe-quality-check.js` | 6 | Pre-export verificare AJV + corectare automată | 4 | P2 | refold |
| 19 | `api/ai-rehab-explain.js` (intent="rehab-explain") | 7 | Explicație per măsură (de ce A1 prioritate) | 3 | P1 | refold |
| 20 | `api/_deferred/rehab-prices-update.js` | 7 | Vercel cron lunar INCD prețuri | 4 | P2 | nou (cron, post Pro) |
| 21 | `api/_deferred/anre-tariff-scrape.js` | 5 | Vercel cron lunar ANRE actualizare tarife | 4 | P2 | nou (cron) |
| 22 | `api/_deferred/energy-prices-live.js` | 4 | OPCOM PZU + ENTSO-E PV spot | 4 | P2 | nou |

**Total**: **22 endpoint-uri** AI. **2 ✅ DONE în acest sprint (F5+F6)**. **14 P1** (~63h estimate). **6 P2** (~30h estimate).

### Endpoint-uri implementate F5+F6
- ✅ Intent `rehab-chat` (F5, commit `9cc1847`): Pas 7 chat reabilitare
- ✅ Intent `narrative` (F6, commit `9a54c2f`): Documente cap1/cap8/intro/recomandari/exec

### Endpoint-uri prioritate P1 (sprint AI dedicat, ~63h)

**Group A — Pas 1 onboarding rapid (8h)**:
- `ai-zone-climatica`: geocoding OSM + lookup Mc 001 Anexa A
- `ai-wizard-categorie`: NLP → 16 categorii enum

**Group B — Pas 2 anvelopă smart (12h)**:
- `ai-straturi-constructive`: vârstă+tip → preset (extinde LAYER_PRESETS)
- (P2 deferred: ai-ocr-plan, ai-thermal-bridge, ai-foto-fatada — necesită Claude Vision)

**Group C — Pas 3+4 sisteme (11h)**:
- `ai-hvac-suggest`: 4h refold
- `ai-pv-sizing`: 3h refold
- `ai-res-recommend`: 5h refold
- `ai-ocr-factura-energie`: 6h Claude Vision

**Group D — Pas 5+7 analiză (8h)**:
- `ai-anomaly-detect`: 3h
- `ai-rehab-explain` (intent extension): 3h
- (`ai-ep-explain` ✅ deja prin narrative `cap8_concluzii`)

**Group P2 (deferred, ~30h)** — necesită upgrade Vercel Pro pentru `_deferred/*` cron + slot-uri dedicate Claude Vision:
- ai-ocr-plan (Vision)
- ai-thermal-bridge (Vision)
- ai-foto-fatada (Vision)
- ai-class-roadmap
- ai-bacs-recommend
- ai-casa-verde
- ai-cpe-quality-check
- rehab-prices-update (cron)
- anre-tariff-scrape (cron)
- energy-prices-live (OPCOM/ENTSO-E)

---

## Componente React AI propuse

### Implementate F5
- ✅ `RehabAIChat.jsx` — panel flotant Pas 7 (250 linii)

### Propuneri sprint AI

| Componentă | Funcție | Ore | Prioritate |
|---|---|---:|:---:|
| `AIAssistantWidget.jsx` | Widget flotant context-aware disponibil în toți pașii (shortcut zone climatică / categorie / straturi) | 5 | P1 |
| `AIInputSuggestion.jsx` | Sugestie inline sub câmpuri (ex: sub „Zonă climatică" → „Detectat automat: II") | 3 | P1 |
| `AIExplainCard.jsx` | Buton „?" lângă valori calculate (tooltip/modal explicație) | 4 | P2 |
| `AINarrativeButton.jsx` | Buton „🤖 Generează text" în report-generators + passport-docx + OfertaReabilitare | 4 | P1 |

---

## Buget Claude API estimat

### Pricing actual (2026 Q1):
- **Claude Haiku 4.5**: ~$0.80/M input + $4.00/M output
- **Claude Sonnet 4.6**: ~$3.00/M input + $15.00/M output
- **Claude Opus 4.7 1M**: ~$15.00/M input + $75.00/M output (NU folosit în production AI features)

### Estimare consum pe utilizator activ

**Pilot (~10 utilizatori activi)**:
- Rehab-chat: ~20 mesaje/user/lună × 500 tokens = 10k tokens/user × 10 users = 100k tokens/lună Sonnet = ~$2/lună
- Narrative: ~5 generări/user/lună × 1500 tokens = 7.5k × 10 = 75k tokens/lună Sonnet = ~$1.50/lună
- Q&A normativ: ~10 întrebări/user/lună × 600 tokens = 6k × 10 = 60k tokens/lună Haiku = ~$0.30/lună
- **Total pilot**: ~**$5/lună**

**Producție (~100 utilizatori activi)**:
- Scale 10× → **~$50/lună**

**Scale 1000+ utilizatori**:
- ~$500/lună la nivel actual de features
- Cu features P1 complete (10 endpoints noi): ~$1.500/lună

### Optimizări cost-reducere

1. **Prompt caching Anthropic** (system prompts mari): ~30% reducere cost după primul apel
2. **Haiku pentru intent simple** (anomaly-detect, hvac-suggest): 5× mai ieftin decât Sonnet
3. **Local fallback** pentru intent-uri fără cunoaștere nouă (ex: ai-pv-sizing → calcul determinist din formula `A × yield × PR`, AI doar pentru explicație opțională)

---

## Securitate + GDPR

### Date trimise la Claude API

**Pre-pseudonimizare** (existent):
- ✅ Nu se trimite nume + adresă completă în system prompt (doar categorie + zonă)
- ✅ Nu se trimit fotografii cu chip persoane vizibile (verifică manual pentru Vision)
- ✅ ANTHROPIC_API_KEY în env Vercel server-side (nu expus client)

**Recomandare F4-bis (post Pro upgrade)**:
- Adăugare `data_classification` per request: `public` / `confidential` / `restricted`
- Pentru `restricted` (date GDPR personale): refuz request + log audit
- Logging in-house (Vercel KV) pentru audit trail GDPR

### Rate limiting
- ✅ `requireAuth + requirePlan("business")` + `checkRateLimit(userId, 20/hour)` activ pe ai-assistant
- ✅ Pe error 429 → mesaj clar user „Limita rate atinsă, reîncercați"

---

## Concluzie Arhitectură AI

**Status actual**:
- ✅ Infrastructure complete (Anthropic SDK 0.95.1 + auth + rate limit + multiplexare intent)
- ✅ 2 din 22 endpoint-uri AI implementate în audit-mai2026 (rehab-chat F5 + narrative F6)
- ✅ Zero slot Vercel Hobby ocupat în plus (multiplexare strategy approbată plan)

**Backlog**: **14 endpoint-uri P1** (~63h sprint AI dedicat) + 6 P2 (~30h post Pro upgrade) = **~93h cumulative pentru AI Pack complet**.

**Buget API estimat la production**: $50-150/lună pentru 100 utilizatori activi (Sonnet majoritar + Haiku light).

**Niciun fix de cod aplicat în F7 — acest document e foaie de parcurs pentru sprint AI dedicat post-audit**.
