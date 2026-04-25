# 🚀 Checklist Activare — Mentenanță Automată Claude

> **Citește acest document ÎNAINTE de a activa orice agent.**
> Activare graduală = risc minim. NU activa toți agenții simultan.

---

## ⏱ Pre-condiții (toate obligatorii)

- [ ] **Zephren v4.0 lansat oficial pe piață** (data țintă: 1 iunie 2026)
- [ ] Soft-launch trecut cu min. 10 utilizatori plătitori activi 14+ zile
- [ ] Suite teste: minim **1500/1500 PASS** consecutiv 7 zile
- [ ] Zero incidente P0 ultimele 14 zile
- [ ] CLAUDE.md actualizat cu politica automatizare
- [ ] Backup complet GitHub repo + Supabase + Vercel state

---

## 🔐 Pasul 1 — Secrets GitHub (obligatoriu pre-activare)

Adaugă în **Settings → Secrets and variables → Actions → New repository secret**:

| Secret name | Sursă | Permisiuni |
|-------------|-------|------------|
| `ANTHROPIC_API_KEY` | console.anthropic.com → API keys → Create | Workspace dedicat "Zephren-Automation" |
| `VERCEL_TOKEN` | vercel.com/account/tokens → Create | Scope: `energy-app-ruby` only |
| `GITHUB_TOKEN` | (auto-generat) | Implicit |

**⚠️ Recomandare critică:** creează un **API key separat** dedicat exclusiv automation (NU folosi cheia ta personală). Setează limită bugetară $50/lună la nivel de workspace în Anthropic Console.

---

## 🛠 Pasul 2 — Bootstrap local

```bash
cd "D:/Claude Projects/Zephren/energy-app/automation"
npm install
node tools/dry-run.js
```

Verifică output: toți agenții afișați ca `🔒 DEZACTIVAT`. Asta confirmă structura validă.

---

## 🐣 Pasul 3 — Activare agent #1 (cel mai puțin riscant)

**Recomandat primul: `bug-triage`** — doar comentează pe issue-uri, zero impact asupra cod.

### 3.1 Editează `automation/config.json`:
```json
{
  "enabled": true,
  "agents": {
    "bug-triage": { "enabled": true, ... }
  }
}
```

### 3.2 Editează `.github/workflows/claude-bug-triage.yml`:
```yaml
jobs:
  triage:
    if: true   # era: if: false
    ...
```

### 3.3 Test:
```bash
git checkout -b activation/bug-triage
git add automation/config.json .github/workflows/claude-bug-triage.yml
git commit -m "chore(automation): activate bug-triage agent"
git push origin activation/bug-triage
```

Deschide un issue de test cu titlu `[TEST] Bug triage activation` și descriere realistă. Așteaptă ≤ 2 min comentariul automat.

### 3.4 Validare 7 zile:
- [ ] Toate triajele relevante? (manual review primele 5)
- [ ] Zero false positives critice?
- [ ] Cost sub $1 prima săptămână?

Dacă DA → merge în master + treci la următorul agent.
Dacă NU → setează `enabled: false` și debugează.

---

## 📈 Ordine activare recomandată (graduală)

1. **bug-triage** (1 săpt) — risc minim, doar comentarii
2. **deploy-monitor** (1 săpt) — doar citește Vercel API, nu modifică
3. **regression-detector** (2 săpt) — rulează teste local, doar raportează
4. **test-analyzer** (1 săpt) — comentează pe PR, nu modifică cod
5. **normative-watcher** (la final, după 1+ lună) — cel mai sensibil, poate genera multe issue-uri

**Total ramp-up: ~6 săptămâni** până la full activation.

---

## 🛑 Procedură dezactivare urgentă

Dacă orice agent face ceva nedorit:

### Opțiunea A — dezactivare imediată (1 minut)
```bash
# Editează config.json local
sed -i 's/"enabled": true/"enabled": false/g' automation/config.json
git add automation/config.json
git commit -m "EMERGENCY: disable automation"
git push origin master
```

### Opțiunea B — kill switch GitHub
Settings → Actions → General → **Disable Actions** (oprește TOT, inclusiv deploy).

### Opțiunea C — revoke API key
console.anthropic.com → API keys → Delete `Zephren-Automation` key.

---

## 📊 Monitorizare săptămânală post-activare

Verifică fiecare luni:

- [ ] `automation/logs/rate-limit.json` — sub buget?
- [ ] Anthropic Console → Usage → sub $30/lună
- [ ] GitHub Actions → ultimele 50 runs → toate verde?
- [ ] Issue-uri create de `claude-bot` → cele mai recente 10 — relevante?
- [ ] PR-uri create de `claude-bot` → niciunul cu modificări `src/calc/**` fără human review?

---

## 🎯 KPI succes după 3 luni

- ⏱ Timp mediu de la PR opened → diagnostic teste: **< 5 min**
- 🐛 Timp mediu triaj issue: **< 2 min**
- 🚨 Incidente production prinse < 1h: **> 80%**
- 💰 Cost: **< $20/lună**
- 🤖 Acuratețe diagnostice (validată manual): **> 75%**
- ❌ False positives critice: **0**

Dacă atingi aceste KPI → poți considera extindere: agent pentru actualizare dependencies, agent pentru documentație auto, agent pentru release notes.

---

## 📚 Referințe interne

- Decizia activare post-lansare: vezi memoria `automation_post_launch_decision.md` (creată 25 apr 2026)
- Master plan audit: `D:/Claude Projects/Zephren/AUDIT_00_MASTER_PLAN.md`
- Strategia prețuri (NU modifica autonom): memoria `pricing_strategy.md`
- CLAUDE.md global: `D:/Claude Projects/Zephren/CLAUDE.md`

---

_Versiunea 1.0 — generat 25 apr 2026 cu Opus 4.7 1M Max_
