# Gotenberg — Serviciu DOCX→PDF pentru preview Zephren

Restaurează preview-ul fidel CPE + Anexa 1+2 (renderă PDF prin LibreOffice headless).

## De ce e necesar

Pipeline-ul preview-ului are 3 căi în ordine de prioritate:

1. **Gotenberg → PDF** — preview 100% fidel cu Word, GDPR-safe (date rămân în UE)
2. **Vercel Blob → Office Online iframe** — fidel dar date pleacă la Microsoft US
3. **docx-preview HTML** (fallback) — aproximativ, NU recomandat

`GOTENBERG_URL` (Path 1) era setat dar serviciul a returnat 404 — instanța veche
a expirat sau a fost ștearsă. Acest folder conține tot ce-ți trebuie să redeplei
Gotenberg pe Fly.io (free tier, ~0 EUR/lună la trafic mic).

## Setup rapid — 5 minute

### 1. Instalează flyctl (dacă nu ai)
```bash
# Windows (PowerShell)
iwr https://fly.io/install.ps1 -useb | iex

# Sau prin scoop / winget
winget install Fly.io.flyctl
```

### 2. Login
```bash
flyctl auth login
```

### 3. Deploy
```bash
cd "D:/Claude Projects/Zephren/energy-app/gotenberg"
flyctl launch --copy-config --no-deploy --name zephren-gotenberg
flyctl deploy
```

Aprox 2-3 minute. La final primești URL: `https://zephren-gotenberg.fly.dev`

### 4. Verifică
```bash
curl https://zephren-gotenberg.fly.dev/health
# răspuns: {"status":"up"}
```

### 5. Setează în Vercel
```bash
cd ..
npx vercel env rm GOTENBERG_URL production -y    # șterge cea veche
npx vercel env add GOTENBERG_URL production
# Paste: https://zephren-gotenberg.fly.dev (fără trailing slash)
npx vercel --prod --yes                            # redeploy
```

## Cost & resurse

- **Fly.io free tier**: 3 instanțe shared-cpu-1x × 256MB gratuit
- Config-ul folosește 512MB (over-allocate pentru LibreOffice headless)
- `auto_stop_machines = "stop"` → instanța hibernează după inactivitate
- Cost real la trafic mic: **~$0/lună** (apeluri sub free tier)
- Trafic agresiv (~1000 conversii/lună): ~$2-5/lună

## GDPR

- Region `fra` (Frankfurt) → date rămân în UE, conform GDPR
- Nu se logează conținut DOCX
- Nu se persistă fișierele uploadate (Gotenberg le procesează in-memory)

## Diagnostic

Dacă preview-ul cade pe fallback HTML (vezi banner roșu „Preview aproximativ"),
rulează în consolă browser:

```js
fetch('https://energy-app-ruby.vercel.app/api/preview-document', {
  method: 'POST',
  body: new Blob([new Uint8Array([0x50,0x4B,0x03,0x04])])
}).then(r => r.text()).then(console.log)
```

Vezi câmpul `gotenbergDiag` din response. Status:
- `Gotenberg HTTP 404 ...` → URL invalid în Vercel env, repară
- `GOTENBERG_URL not configured` → setează env var
- `fetch error` → instanța e oprită; flyctl status

## Alternativă rapidă (fără Gotenberg)

Dacă nu vrei să administrezi Fly.io, alternativă: activează Vercel Blob:

1. Vercel dashboard → **Storage** → **Create Blob Store**
2. Click **Connect** la proiect → `BLOB_READ_WRITE_TOKEN` setat automat
3. Path 2 (Office Online iframe) începe să funcționeze fidel
4. ⚠️ GDPR: DOCX uploadate la Vercel Blob → public URL → Microsoft fetch
   → date personale (nume client, adresă, cadastru) ajung la Microsoft US.
   Necesită menționare în Politica de confidențialitate.
