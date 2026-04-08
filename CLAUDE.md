# Instrucțiuni Claude Code — Proiect Zephren

---

## 🤖 AUTO-SELECT MODEL & EFFORT

La **fiecare mesaj**, evaluează promptul și afișează **întotdeauna** blocul de sugestie:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔴 OPUS MAX  /  🟡 SONNET  /  🟢 HAIKU
Model recomandat : claude-opus-4-6
Effort recomandat: high (1M tokens)
Comandă terminal : co   sau   ca "<prompt>"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Afișează blocul chiar dacă modelul curent e deja corect — utilizatorul vrea să vadă confirmarea.
Dacă modelul curent din sesiune NU e cel recomandat, adaugă:
```
⚠️  Sesiunea curentă rulează pe <model-curent>.
    Redeschide cu: co / cs / ch  sau  ca "<prompt>"
```

### Reguli de selecție:

#### 🔴 OPUS MAX — Opus 4.6 · 1M tokens · effort high
Orice prompt conține:
- `audit`, `aprofundat`, `complet`, `arhitectur`, `architect`
- `implementez`, `implementează`, `modul nou`, `integrare`, `integrez`
- `ținând cont de`, `tinand cont de`, `adaptează`, `adapteaza`
- `verifică în detaliu`, `verifica in detaliu`
- `ce mai este util`, `ce ar mai trebui`
- `BACS EN`, `ACM EN`, `EN 15232`, `EN 15316`, `EN 16798`
- `IFC`, `BIM`, `OCR facturi`
- `refactor global`, `state management`, `migrate`, `rewrite`, `rescrie`
- `security`, `vulnerab`, `GDPR`, `encrypt`, `credential`
- `data loss`, `backup`, `corrupt`, `disaster`, `recover`
- `scale`, `memory leak`, `crash`, `1000+`
- `compliance`, `normativ`, `regulation`

#### 🟡 SONNET medium (effort medium)
Orice prompt conține:
- `fix`, `bug`, `corecte`, `repara`, `eroare`
- `feature`, `adaugă`, `modifică`, `actualizez`
- `verifică`, `verifica` (fără "în detaliu")
- `generează`, `genereaza`, `încearcă`, `incearca`
- `vreau să`, `vreau sa`
- `refactor component`, `optimizez`, `cache`
- `form`, `export`, `validare`, `UI`, `dark mode`, `responsive`, `landing`
- `scrie`, `creează`, `redactează`, `raport`, `document`, `propunere`, `email`
- `deploy`, `vercel`, `github`, `build`, `test`
- `import`, `CSV`, `Excel`, `JSON`, `PDF`
- `continuă`, `continua` (continuare task în curs)

#### 🟢 HAIKU (effort default)
Orice prompt conține:
- `cum`, `ce`, `care`, `explicație`, `de ce`, `unde`
- `ce înseamnă`, `cum funcționează`, `ce e`
- `dacă aș`, `daca as`, `dacă am`, `daca am`, `dacă ar`, `daca ar`
- `da` singur (confirmare scurtă)
- debugging rapid: `de ce nu`, `parse error`, `NaN`
- întrebări domeniu fără implementare

**Regula de aur: dacă ești în dubiu → OPUS MAX**

---

## 📌 COMPORTAMENT ÎN SESIUNE

Când folosești Agent tool → setează `model: "opus"` pentru task-uri complexe.

### Comenzi rapide terminal
| Alias | Comandă completă | Când |
|---|---|---|
| `co` | `claude --model claude-opus-4-6 --effort high` | OPUS MAX — task complex |
| `cs` | `claude --model claude-sonnet-4-6` | SONNET — feature/fix |
| `ch` | `claude --model claude-haiku-4-5-20251001` | HAIKU — întrebare rapidă |
| `ca "prompt"` | auto-detectează modelul + effort | oricând |

---

## 🔄 GIT PUSH AUTOMAT

La finalul oricărei sesiuni cu modificări de cod, execută automat **fără să ceri confirmare**:

```bash
cd "D:/Claude Projects/Zephren/energy-app"
git add -A
git commit -m "<mesaj relevant>"
git push origin master
```

- Execută după **fiecare deploy** sau **la finalul conversației** dacă s-au modificat fișiere
- Remote: `https://github.com/tionut10/Zephren.git` (branch `master`)
- Nu cere aprobare — execută direct

---

## 📋 PROIECT

- **Stack**: React + Vite 6 + Vercel + Python serverless
- **Normativ principal**: Mc 001-2022, Ord. MDLPA 16/2023
- **Producție**: https://energy-app-ruby.vercel.app
- **GitHub**: https://github.com/tionut10/Zephren
- **Vercel limit**: max 12 funcții în `api/` (Hobby plan)
- **Limbă**: Română cu diacritice corecte (ă, â, î, ș, ț) — obligatoriu
