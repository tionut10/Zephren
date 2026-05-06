# Integrare certSIGN PARAPHE — Ghid onboarding (Sprint Conformitate P0-02)

**Status la 6 mai 2026**: Skeleton implementat în `src/lib/qtsp-providers/certsign.js`. Activarea integrării reale necesită cont la certSIGN + setare credențiale.

---

## 1. De ce certSIGN

**certSIGN** este principalul Qualified Trust Service Provider (QTSP) din România, cu acoperire estimată ~60% din auditorii MDLPA cu atestat valid 2025-2026. Operează sub licență ANRSC + recunoaștere eIDAS 2 (Reg. UE 910/2014 modif. 2024/1183 + Legea 214/2024 RO).

Serviciul folosit de Zephren: **PARAPHE** (cloud-based remote signing via REST API + OAuth 2.0). Alternativa hardware token (eToken / smart card) nu necesită integrare API — ștampila/semnătura se aplică cu plugin browser certSIGN local și NU implică endpoint Zephren.

**Concurenți QTSP RO**: DigiSign, TransSped, AlfaSign — fiecare cu API propriu. Zephren va adăuga progresiv adaptoare la `src/lib/qtsp-providers/{digisign,transsped,alfasign}.js`.

---

## 2. Onboarding certSIGN PARAPHE

### Pasul 1 — Cont juridic verificat

certSIGN cere documente PJ pentru API access:
- Certificat înmatriculare ONRC (extras 30 zile)
- CUI verificat ANAF
- Adresă sediu social
- Persoană contact (administrator/împuternicit)

Pentru Zephren SRL (entitatea comercială): formularul „Înrolare API B2B" trimis la `commercial@certsign.ro` cu menționare „integrare audit energetic — semnături PADES B-LT pentru CPE/RAE".

### Pasul 2 — Cumpărare pachet API

Tarife orientative 2026 (verifică pe certsign.ro):
- **PARAPHE API Starter**: ~150 EUR / lună (1.000 semnături)
- **PARAPHE API Professional**: ~400 EUR / lună (5.000 semnături)
- **PARAPHE API Enterprise**: tarif personalizat (>15.000 semnături/lună)

**Estimate Zephren**: la 100 auditori activi × 30 CPE/lună = 3.000 semnături → pachet Professional.

### Pasul 3 — Primire credențiale

certSIGN trimite prin email securizat:
- `CERTSIGN_CLIENT_ID` (string, ~32 chars)
- `CERTSIGN_CLIENT_SECRET` (string, ~64 chars; rotire la 90 zile)
- URL endpoint API (de obicei `https://api.certsign.ro/api`)
- Documentație detaliată endpoint-uri PARAPHE API v3.0
- Cont test sandbox: `https://sandbox-api.certsign.ro/api` (recomandat pentru integrare inițială)

---

## 3. Configurare în Zephren

### 3.1. Vercel production

Setează variabilele de mediu în Vercel project settings:

```
CERTSIGN_CLIENT_ID=<your-client-id>
CERTSIGN_CLIENT_SECRET=<your-client-secret>
CERTSIGN_API_BASE=https://api.certsign.ro/api
```

**IMPORTANT**: NU comita aceste valori în git. Ele trebuie setate exclusiv în Vercel UI (Project → Settings → Environment Variables → Production).

### 3.2. Development local

În `.env.local` (gitignored):

```
CERTSIGN_CLIENT_ID=<sandbox-client-id>
CERTSIGN_CLIENT_SECRET=<sandbox-client-secret>
CERTSIGN_API_BASE=https://sandbox-api.certsign.ro/api
```

### 3.3. Browser bootstrap

Provider-ul `certsign.js` citește din `process.env` (server-side) și `globalThis.__ZEPHREN_CONFIG__` (browser). Pentru a expune env vars Vite la runtime browser, adaugă în `src/main.jsx` la inițializare:

```js
// La top of main.jsx, înainte de createRoot
if (typeof globalThis !== "undefined") {
  globalThis.__ZEPHREN_CONFIG__ = {
    CERTSIGN_CLIENT_ID: import.meta.env.VITE_CERTSIGN_CLIENT_ID || null,
    CERTSIGN_CLIENT_SECRET: import.meta.env.VITE_CERTSIGN_CLIENT_SECRET || null,
    CERTSIGN_API_BASE: import.meta.env.VITE_CERTSIGN_API_BASE || null,
  };
}
```

Și în `.env.local` adaugă `VITE_*` aliases:
```
VITE_CERTSIGN_CLIENT_ID=<sandbox-client-id>
VITE_CERTSIGN_CLIENT_SECRET=<sandbox-client-secret>
```

⚠️ **Securitate**: expunerea CLIENT_SECRET în browser e risc moderat. Pentru production strict, recomandare arhitectură:
- **A**: Endpoint serverless Zephren proxy `api/qtsp-proxy.js` care relay-uiește requests OAuth + sign (token cache server-side, secrets NU expuse în browser). NECESITĂ upgrade Vercel Pro (limit 12/12 funcții atins).
- **B**: Browser apelează direct certSIGN cu CLIENT_ID public (CORS necesită whitelist Zephren domain de către certSIGN). CLIENT_SECRET rămâne server-side pentru OAuth.

Decizie strategică: **Opțiunea A post-upgrade Vercel Pro** (recomandată); **Opțiunea B doar pentru pilot** cu monitor activ pe rate limiting.

---

## 4. Folosire în cod Zephren

```js
import { signPdfPades, PADES_LEVELS } from "./lib/pades-sign.js";

// În handler-ul export PDF/A-3 + semnătură PAdES:
const signResult = await signPdfPades(
  pdfBytes,
  { provider: "certsign" }, // citește credențiale din env / globalThis
  {
    reason: "Certificat de performanță energetică Mc 001-2022",
    location: "București, RO",
    signerName: auditor.name,
    signingTime: new Date(),
    level: PADES_LEVELS.B_LT, // sau B_T pentru semnătură fără LTV
  },
);

// signResult.bytes — PDF semnat (descarcă cu Blob + anchor)
// signResult.signerInfo.isMock — false pentru certSIGN real, true pentru fallback mock
// signResult.signerInfo.warnings — listă warnings (gol pentru certSIGN B-T; banner UI pentru B-LT incomplet)
```

---

## 5. Verificare semnătură

certSIGN oferă endpoint `/api/verify` pentru validare. În UI Zephren, după export semnat:
1. Banner UI: „🟢 Semnat cu certSIGN PARAPHE — Subject: <CN>, Issuer: <CN>"
2. Buton „Verifică validitate online" → apelează `/api/verify` cu PDF + bytes
3. Răspuns: SignatureValid / RevocationStatus / TimestampStatus / OCSPstatus

---

## 6. PAdES B-LT (Long-Term Validation)

Pentru documente arhivabile (CPE 5/10 ani, RAE 30 ani), level B-LT cere:
- **Cert chain**: certificate auditor + intermediate CA + root CA în DSS dictionary
- **CRL** (Certificate Revocation List) la momentul semnării
- **OCSP** (Online Certificate Status Protocol) response la momentul semnării

certSIGN PARAPHE returnează automat în răspunsul `/sign` (cu `signatureLevel=BASELINE-LT`):
- Cert chain (3 certs uzual: signer → intermediate → root)
- OCSP response timestamped
- (Opțional) CRL embed dacă activează `includeCRL=true`

Provider-ul certsign.js extrage acestea din răspuns și populează `/DSS` în PDF post-signing. Implementare detaliată în Sprint P0-02-bis (post upgrade Vercel Pro).

---

## 7. Troubleshooting

### "certSIGN provider necesită CERTSIGN_CLIENT_ID..."
- Verifică env vars setate corect în Vercel
- Pentru browser, asigură-te că `globalThis.__ZEPHREN_CONFIG__` e populat la bootstrap

### "certSIGN OAuth failed (HTTP 401)"
- CLIENT_ID/CLIENT_SECRET incorect
- Cont test expirat (re-genereazăcredențiale)
- IP whitelist activ pe certSIGN — solicită whitelist pentru IP-uri Vercel (range public)

### "certSIGN /sign failed (HTTP 429)"
- Rate limit depășit. Verifică pachet (Starter 1.000/lună / Professional 5.000)
- Implementează retry cu exponential backoff în provider

### "Identity Unknown" în Adobe Reader pe document semnat
- Cert chain incomplet — necesită level=B_LT cu DSS populat
- Sau Adobe Reader nu are root CA certSIGN în trust store — user adaugă manual

---

## 8. Roadmap

### Sprint P0-02-bis (post upgrade Vercel Pro, TBD)
- Endpoint serverless `api/qtsp-proxy.js` (token cache + secret protection)
- DSS dictionary populat cu cert chain + OCSP din certSIGN response
- B-LTA (Archive timestamp) pentru orizont 30 ani
- UI Verify online cu badge GREEN / AMBER / RED

### Sprint Pluralitate QTSP (TBD)
- DigiSign provider (`src/lib/qtsp-providers/digisign.js`)
- TransSped provider
- AlfaSign provider
- UI selector în `QTSPAuthPanel.jsx` (P0-02 menționează componenta — TBD în P0-02-bis)

---

## 9. Referințe

- [certSIGN PARAPHE API documentation](https://www.certsign.ro/business) (acces după login B2B)
- [eIDAS 2 (Reg. UE 910/2014 modif. 2024/1183)](https://eur-lex.europa.eu/eli/reg/2024/1183/oj)
- [Legea 214/2024 RO transpunere eIDAS 2](https://legislatie.just.ro/Public/DetaliiDocumentAfis/295348)
- [ETSI EN 319 142-1 PAdES baseline](https://www.etsi.org/deliver/etsi_en/319100_319199/31914201/)
- [ETSI EN 319 122-1 CAdES baseline](https://www.etsi.org/deliver/etsi_en/319100_319199/31912201/)
- [Ord. MDLPA 348/2026 Art. 4 alin. 6 — portal electronic](https://legislatie.just.ro/Public/DetaliiDocumentAfis/<TBD>)

---

**Persoană contact Zephren pentru integrare**: `support@zephren.ro` (TBD).

**Ultima actualizare**: 6 mai 2026 — Sprint Conformitate P0-02 (skeleton).
