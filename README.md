# CertEn — Calculator Performanță Energetică Clădiri

Calculator performanță energetică conform **Mc 001-2022**, **SR EN ISO 52000-1/NA:2023**, **EPBD 2024/1275**.

## Stack

- **React 18** — single-file component (~8800 linii)
- **Vite 6** — bundler + dev server
- **Tailwind CSS v4** — styling
- **Vercel** — deployment

## Instalare locală

```bash
# 1. Clonează sau extrage arhiva
cd energy-app

# 2. Instalează dependențele
npm install

# 3. Pornește dev server
npm run dev

# Deschide http://localhost:5173
```

## Deploy pe Vercel

### Varianta A — Vercel CLI (cel mai rapid)

```bash
# 1. Instalează Vercel CLI (dacă nu ai)
npm i -g vercel

# 2. Din directorul proiectului:
cd energy-app
npm install
vercel

# Urmează prompturile:
#   - Set up and deploy? → Y
#   - Which scope? → (selectează contul tău)
#   - Link to existing project? → N
#   - Project name? → energy-calc (sau ce vrei)
#   - Directory? → ./
#   - Override settings? → N
#
# Vercel detectează automat Vite și configurează totul.

# 3. Pentru production deploy:
vercel --prod
```

### Varianta B — GitHub + Vercel Dashboard

```bash
# 1. Inițializează repo git
cd energy-app
git init
git add .
git commit -m "Initial commit — CertEn v2.0"

# 2. Creează repo pe GitHub
gh repo create energy-calc --public --push

# SAU manual:
git remote add origin https://github.com/USERUL_TAU/energy-calc.git
git push -u origin main
```

Apoi în [vercel.com/new](https://vercel.com/new):
1. **Import Git Repository** → selectează `energy-calc`
2. Vercel detectează automat **Vite** ca framework
3. Click **Deploy**
4. Gata — primești URL-ul live

### Varianta C — Drag & Drop

```bash
# Generează build-ul local
npm run build

# Mergi la https://vercel.com/new
# Drag & drop folderul `dist/` direct în browser
```

## Structura proiectului

```
energy-app/
├── index.html                 # HTML entry point
├── package.json               # Dependențe + scripturi
├── vite.config.js             # Vite + React + Tailwind
├── vercel.json                # Config Vercel
├── .gitignore
├── CLAUDE_CODE_MAP.md         # Hartă navigare cod
├── public/
│   └── favicon.svg
└── src/
    ├── main.jsx               # React mount + polyfill
    ├── index.css              # Tailwind import + global styles
    ├── storage-polyfill.js    # localStorage adapter (înlocuiește window.storage)
    └── energy-calc.jsx        # ★ Componenta principală (~8800 linii)
```

## Note tehnice

- **`storage-polyfill.js`** — Fișierul original folosea `window.storage` (API-ul Claude Artifacts). Polyfill-ul redirecționează transparent către `localStorage` cu prefix `certen_`. Proiectele se salvează/încarcă fără modificări în codul principal.

- **Tailwind v4** — Folosește noua sintaxă `@import "tailwindcss"` fără fișier de configurare separat. Clasele utilitare sunt detectate automat din `.jsx`.

- **Font** — DM Sans se încarcă din Google Fonts direct în `index.html` (preconnect + stylesheet link).

## Dezvoltare cu Claude Code

```bash
# Navighează rapid
grep -n "TODO-" src/energy-calc.jsx
grep -n "step === 5" src/energy-calc.jsx

# Verifică structura
cat CLAUDE_CODE_MAP.md
```

## Normative implementate

| Standard | Implementare | Status |
|----------|-------------|--------|
| Mc 001-2022 | Calcul complet | ✅ Activ |
| SR EN ISO 52000-1/NA:2023 | Tabel A.16 toggle | ✅ Activ |
| SR EN ISO 13790 | Bilanț lunar | ✅ Activ |
| SR EN ISO 13788 | Condens Glaser | ✅ Calcul (TODO: UI) |
| EN 15193-1 | LENI iluminat | ✅ Activ |
| EN 15459-1 | NPV/IRR/Payback | ✅ Calcul (TODO: UI) |
| C107/7-2002 | Confort vară | ✅ Calcul (TODO: UI) |
| EPBD 2024/1275 | ZEB/MEPS | ✅ Calcul (TODO: UI) |
| ISO 52016-1 | Metoda orară | ❌ TODO |
