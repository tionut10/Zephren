# Funcții serverless DEFERRED — Zephren

**Sprint P2 (6 mai 2026)** — folder rezervat pentru funcții API gata implementate
dar dezactivate până la upgrade Vercel pe plan plătit (Pro/Enterprise).

## De ce sunt aici

Vercel **Hobby plan** are limită hard de **12 funcții serverless** în `api/`.
Zephren a atins limita (12/12) cu funcțiile esențiale (calc, OCR, generare DOCX,
Stripe, MDLPA, ANCPI, etc.). Funcțiile din acest folder sunt **gata de cod** și
**testate**, dar puse în standby — folderul `_deferred/` cu prefix underscore
NU este pickup-it de scanner-ul Vercel (convenția identică cu `_middleware`,
`_tests`, `__pycache__`).

## Activare la upgrade plan

Când utilizatorul migrează la Vercel **Pro plan** (limită extinsă serverless):

```bash
cd "D:/Claude Projects/Zephren/energy-app/api"
mv _deferred/energy-prices-live.js .
mv _deferred/anre-tariff-scrape.js .
# Verifică că nu depășești noua limită cu `vercel env ls` + dashboard
git add api/
git commit -m "feat(api): activate deferred functions after Vercel Pro upgrade"
git push origin master
```

Toate funcțiile au:
- CORS headers configurate (`Access-Control-Allow-Origin: *` pentru dev / restrictiv prod)
- Cache headers (`Cache-Control: public, max-age=3600` pentru OPCOM zilnic)
- Fallback graceful — dacă endpoint-ul cade, client-side cade pe valori statice
- Error handling consistent (status 500 cu JSON `{error, source}`)

## Funcții disponibile (Sprint P2)

| Funcție | Sursă date | Refresh | Folosit de |
|---|---|---|---|
| `energy-prices-live.js` | OPCOM PZU spot RO | 1h cache | Step 7 toggle „🌐 Spot live" |
| `anre-tariff-scrape.js` | ANRE tariff comparator HTML | 24h cache | (viitor) Pas 6 preset auto-update |

## Test local fără upgrade

Pentru dezvoltare locală, funcțiile pot fi testate prin `vercel dev` din
folderul `_deferred/` direct. Vercel CLI le va executa local (limita 12 nu se
aplică în development).

```bash
cd energy-app
npx vercel dev --listen 3001
# Apel test:
curl http://localhost:3001/api/_deferred/energy-prices-live
```

**Notă:** Pentru deploy production, mută în `api/` (drop prefix `_deferred/`).
