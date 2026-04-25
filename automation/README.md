# Zephren — Mentenanță Automată cu Claude

> **Status: 🔒 DEZACTIVAT — se activează după lansarea oficială Zephren v4.0 (target 1 iunie 2026).**

Infrastructură pregătită pentru a delega mentenanța curentă post-lansare către agenți Claude rulați prin GitHub Actions. Tot codul e scris și testat, dar **toate workflow-urile au `if: false`** și `config.json.enabled = false` — nimic nu rulează până nu activezi explicit.

---

## 🤖 Cei 5 agenți

| # | Agent | Trigger | Model | Frecvență | Cost/lună est. |
|---|-------|---------|-------|-----------|----------------|
| 1 | **test-analyzer** | PR opened/sync | Sonnet 4.6 | per PR | ~$3 |
| 2 | **bug-triage** | Issue opened | Sonnet 4.6 | per issue | ~$2 |
| 3 | **normative-watcher** | Cron luni 08:00 | Opus 4.7 | săptămânal | ~$4 |
| 4 | **deploy-monitor** | Post-deploy + orar 24h | Haiku 4.5 | până la 24/zi | ~$2 |
| 5 | **regression-detector** | Cron zilnic 06:00 | Sonnet 4.6 | zilnic | ~$3 |
| | | | | **TOTAL** | **~$14/lună** |

Sub bugetul lunar setat: $30/lună (vezi `config.json → limits.monthlyBudgetUSD`).

---

## 📂 Structură

```
automation/
├── config.json              # ⚙️ Configurare globală + per agent
├── package.json             # @anthropic-ai/sdk
├── README.md                # Acest fișier
├── ACTIVATION.md            # 🚀 Checklist activare post-lansare
├── agents/
│   ├── _shared.js           # Client SDK + safety guards + rate limit
│   ├── test-analyzer.js     # Diagnostic eșecuri Vitest/Playwright pe PR
│   ├── bug-triage.js        # Clasificare issue-uri noi
│   ├── normative-watcher.js # Monitor MDLPA/ASRO/EPBD săptămânal
│   ├── deploy-monitor.js    # Erori Vercel post-deploy
│   └── regression-detector.js # Compară teste PASS cu baseline zilnic
├── tools/
│   └── dry-run.js           # Verificare structură fără apel API
├── state/                   # 📦 Snapshot-uri (gitignored)
│   ├── normative-snapshot.json
│   └── test-baseline.json
└── logs/                    # 📝 JSONL per agent/zi (gitignored)
```

GitHub Actions workflow-uri:
```
.github/workflows/
├── claude-test-analyzer.yml
├── claude-bug-triage.yml
├── claude-normative-watcher.yml
├── claude-deploy-monitor.yml
└── claude-regression-detector.yml
```

---

## 🛡️ Safety guards

Toate hard-codate în `_shared.js` — nu pot fi by-pasate de prompt injection:

1. **Dublu-flag activare**: necesită `config.enabled=true` ȘI env `AUTOMATION_ENABLED=1`.
2. **Rate limit zilnic**: max 50 apeluri / 500k tokens / zi.
3. **Buget lunar**: $30 max (configurabil).
4. **Niciodată direct pe master**: doar branch-uri `claude-automation/*` + PR.
5. **Niciodată deploy production**: zero acces `vercel --prod`.
6. **Zone protejate** (PR cu human review obligatoriu):
   - `src/calc/**` — motoare calcul energetic
   - `api/**` — funcții serverless
   - `src/i18n/**` — traduceri
   - `package.json`
   - `src/data/pricing.js` — niciodată modificat autonom
7. **Prompt cache 5 min** pentru economisire tokens (system prompt repetat).

---

## 🧪 Test local (fără API key)

```bash
cd automation
node tools/dry-run.js
```

Output așteptat:
```
ZEPHREN AUTOMATION — DRY RUN
Status global         : 🔒 DEZACTIVAT
Activare prevăzută    : 2026-06-01
Agenți configurați:
  🔒  test-analyzer        ...
```

---

## 🚀 Activare

Vezi **[`ACTIVATION.md`](./ACTIVATION.md)** — checklist 12 pași.

**TL;DR:**
1. Lansare Zephren v4.0 efectivă pe piață
2. Setează GitHub secrets: `ANTHROPIC_API_KEY`, `VERCEL_TOKEN`
3. Setează `config.json → enabled: true` + agentul vizat `enabled: true`
4. Schimbă `if: false` → `if: true` în workflow-ul vizat (recomand activare graduală)
5. Monitorizează 1 săpt în `automation/logs/`
6. Activează agentul următor

---

## 💰 Cost estimat

- **Pre-activare (acum)**: $0 (nimic nu rulează)
- **Post-activare conservativ**: ~$10–15/lună
- **Post-activare full**: ~$25–30/lună
- **Buget hard-cap**: $30/lună (în config)

La scară 100 utilizatori plătitori (Plan Standard 199 RON/lună), costul automatizării ≈ **0.6%** din MRR.

---

_Document generat 25 apr 2026, model Opus 4.7 1M, sesiune Zephren._
