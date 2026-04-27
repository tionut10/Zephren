# Stripe Dashboard Setup — Sprint Pricing v6.0

**Data**: 25 apr 2026
**Sprint**: Pricing v6.0
**Pre-requisit**: Stripe Live mode activat (vezi memorie `infrastructure_payments_fiscal.md`)

---

## 📋 Pași manuali în Stripe Dashboard

Stripe products + prices se creează manual în Stripe Dashboard, NU prin cod. Fișierul `api/create-checkout.js` citește Price IDs din variabile de mediu Vercel.

**Total v6.0**: 12 prețuri Stripe (10 abonament × M/Y + 2 one-time Pașaport).

### 1. Creare Products + Prices abonament (5 plans × 2 cicluri = 10 prețuri)

Pentru fiecare din cele 5 plans v6.0, creează **1 product cu 2 prețuri** (lunar + anual):

| Product Name | Product ID propus | Description |
|---|---|---|
| **Zephren AE IIci** | `prod_zephren_audit` | Auditor energetic AE IIci · grad II civile · CPE locuințe (Art. 6 alin. 2) · Step 1-6 |
| **Zephren AE Ici** | `prod_zephren_pro` | Auditor energetic AE Ici · grad I civile · CPE + audit + nZEB toate clădirile (Art. 6 alin. 1) · Step 1-7 |
| **Zephren Expert** | `prod_zephren_expert` | Auditor senior · Step 1-8 complet + BIM Pack |
| **Zephren Birou** | `prod_zephren_birou` | Birou audit 2-5 useri · CPE NELIMITAT + white-label |
| **Zephren Enterprise** | `prod_zephren_enterprise` | Organizații 6+ useri · SLA 99.9% + INCERC |

Pentru fiecare product, adaugă **2 recurring prices**:

| Plan | Lunar fără TVA | Cu TVA 21% | Bani (Stripe) |
|---|---|---|---|
| AE IIci | 199 RON/lună | 240,79 RON | **19900** bani |
| AE Ici ⭐ | 499 RON/lună | 603,79 RON | **49900** bani |
| Expert | 899 RON/lună | 1.087,79 RON | **89900** bani |
| Birou | 1.890 RON/lună flat | 2.286,90 RON | **189000** bani |
| Enterprise | de la 4.990 RON/lună | 6.037,90 RON | **499000** bani |

| Plan | Anual fără TVA (10 luni) | Cu TVA 21% | Bani (Stripe) |
|---|---|---|---|
| AE IIci | 1.999 RON/an | 2.418,79 RON | **199900** bani |
| AE Ici | 4.990 RON/an | 6.037,90 RON | **499000** bani |
| Expert | 8.990 RON/an | 10.877,90 RON | **899000** bani |
| Birou | 18.900 RON/an | 22.869,00 RON | **1890000** bani |
| Enterprise | Negociat | — | **4990000** bani placeholder |

**ATENȚIE 1**: Stripe folosește bani (subdiviziuni RON × 100), nu RON. 1 RON = 100 bani.

**ATENȚIE 2**: Prețurile în Stripe se introduc **fără TVA** (Stripe nu calculează TVA — îl adaugă SmartBill la facturare). Coloana „cu TVA" e doar pentru afișare în UI și înțelegerea utilizatorului.

**ATENȚIE 3**: TVA RO 2026 = **21%** (NU 19% cum era anterior). Verificat în `api/stripe-webhook.js` calcul `priceNoVat = amountTotal / 1.21` și `vatPercent = 21`.

---

### 2. Creare Prices one-time (pay-per-use, 2 produse — DOAR Pașaport Renovare)

Sprint v6.0 a redus pay-per-use la doar Pașaport Renovare. CPE-urile single
(99 RON), pachet 10 (790 RON) și CPE+Step 8 (199 RON) au fost ELIMINATE
fiindcă abonamentul AE IIci 199 RON oferă break-even la 2 CPE/lună (canibalizat).
Pașaportul rămâne pentru proprietari & non-auditori care au nevoie de
Pașaport Renovare EPBD obligatoriu (29 mai 2026) fără să fie auditori atestați.

Acestea sunt **one-time payments** (nu recurring):

| Product | Fără TVA | Cu TVA 21% | Bani (Stripe) | Cod intern |
|---|---|---|---|---|
| **Pașaport Renovare basic** | 79 RON/doc | 95,59 RON | **7900** | `pasaport-basic` |
| **Pașaport Renovare detaliat (LCC)** | 199 RON/doc | 240,79 RON | **19900** | `pasaport-detailed` |

Tip: în Stripe Dashboard → Products → New product → setează `Pricing` = **One time**.

---

### 3. Configurare environment variables în Vercel

După creare în Stripe Dashboard, copiază Price IDs și adaugă în **Vercel → Settings → Environment Variables**:

```bash
# ─── Abonamente (5 × 2 cicluri = 10 prețuri) ───
STRIPE_PRICE_AUDIT_M=price_1XXXXX_audit_monthly
STRIPE_PRICE_AUDIT_Y=price_1XXXXX_audit_yearly
STRIPE_PRICE_PRO_M=price_1XXXXX_pro_monthly
STRIPE_PRICE_PRO_Y=price_1XXXXX_pro_yearly
STRIPE_PRICE_EXPERT_M=price_1XXXXX_expert_monthly
STRIPE_PRICE_EXPERT_Y=price_1XXXXX_expert_yearly
STRIPE_PRICE_BIROU_M=price_1XXXXX_birou_monthly
STRIPE_PRICE_BIROU_Y=price_1XXXXX_birou_yearly
STRIPE_PRICE_ENTERPRISE_M=price_1XXXXX_enterprise_monthly
STRIPE_PRICE_ENTERPRISE_Y=price_1XXXXX_enterprise_yearly

# ─── One-time pay-per-use (2 produse — doar Pașaport Renovare) ───
STRIPE_PRICE_PASAPORT_BASIC=price_1XXXXX_pasaport_basic
STRIPE_PRICE_PASAPORT_DETAILED=price_1XXXXX_pasaport_detailed

# ─── Backward-compat (utilizatori existenți v5.x) ───
# NU le șterge — vechii utilizatori încă au abonamente active pe acestea
STRIPE_PRICE_STARTER=price_1OLD_starter        # → mapat la "audit" în webhook
STRIPE_PRICE_STANDARD=price_1OLD_standard      # → mapat la "pro" în webhook
STRIPE_PRICE_PRO=price_1OLD_pro                # → mapat la "pro" în webhook
STRIPE_PRICE_BUSINESS=price_1OLD_business      # → mapat la "birou" în webhook
STRIPE_PRICE_ASOCIATIE=price_1OLD_asociatie    # → mapat la "birou" în webhook
```

După adăugare, **redeploy** Vercel pentru ca variabilele să fie active.

---

### 4. Configurare Stripe Webhook

Endpoint: `https://zephren.ro/api/stripe-webhook` (sau URL Vercel curent)

**Events de subscris** (Settings → Webhooks → Add endpoint):

| Event | Acțiune Zephren |
|---|---|
| `checkout.session.completed` | Activare plan + factură SmartBill + (one-time) credite CPE |
| `customer.subscription.updated` | Upgrade/downgrade mid-cycle prin Billing Portal |
| `customer.subscription.deleted` | Revert to Free |

Copiază **Signing secret** și pune-l în Vercel ca `STRIPE_WEBHOOK_SECRET`.

---

### 5. Test în Stripe Test mode (înainte de Live)

```bash
# Test card succes
4242 4242 4242 4242   exp orice viitor   CVC orice 3 cifre

# Test card eșec (pentru testare cancel flow)
4000 0000 0000 9995
```

Pentru fiecare plan, testează:
1. Checkout subscription **lunar** → verifică în Supabase profiles că `tier` se actualizează
2. Checkout subscription **anual** → idem
3. Pașaport basic 79 RON → verifică factură SmartBill cu cod `ZEP-PSP-B`
4. Pașaport detaliat 199 RON → verifică factură SmartBill cu cod `ZEP-PSP-D`
5. Cancel subscription via Billing Portal → verifică `tier = 'free'` în Supabase

---

### 6. Migrare utilizatori existenți (v5.x → v6.0)

**Decizie utilizator (27 apr 2026 — v6.2)**: mecanismul `price-lock` a fost ELIMINAT complet din ofertă.

Politica nouă: **„Anunț cu 90 zile pentru orice modificare de preț"** — utilizatorii existenți rămân pe prețurile actuale (grandfathering tăcut, fără promisiune contractuală pe viață); orice viitoare creștere/reducere este comunicată prin email cu minimum 90 de zile în avans și publicată pe `zephren.com/preturi`.

Aliasing-ul automat în `planGating.js` mapează planurile vechi la cele noi:
- `starter` → comportament `audit` (199 RON)
- `standard` → comportament `pro` (499 RON, primește acum AI Pack inclus = bonus!)
- `professional` → comportament `expert` (899 RON, primește Step 8 complet)
- `business` → comportament `birou` (1.890 RON flat)
- `asociatie` → comportament `birou`

**NU forța migrare** — utilizatorii existenți primesc upgrade la features (AI/Step 8/BIM) automat. Pentru modificări de preț pe planurile lor curente, regula generală a celor 90 zile se aplică ca pentru toți utilizatorii.

**Email notificare** template:

> Subiect: **Pachetul tău Zephren tocmai a primit funcții noi — fără cost suplimentar**
>
> Bună [Nume],
>
> Am restructurat pachetele Zephren la versiunea 6.0. Vești bune pentru tine:
>
> ✅ **Prețul tău rămâne neschimbat** la valoarea actuală.
> ✅ Primești **automat funcții noi** la pachetul tău, fără cost suplimentar:
>    - AI Pack (OCR facturi/CPE + chat import + AI assistant)
>    - Pașaport Renovare EPBD basic
>    - GWP CO₂ lifecycle (EN 15978)
>    - BACS A-D selector + SRI auto + MEPS check
> ✅ **Niciun act necesar** din partea ta.
> 📅 **Politică de transparență prețuri**: orice viitoare modificare de preț este anunțată cu minimum 90 de zile în avans prin email și pe pagina noastră de prețuri. Fără surprize la facturare. Anulare oricând, fără angajament.
>
> Vezi noile pachete: [zephren.ro/#pricing](https://zephren.ro/#pricing)
>
> Mulțumim că ești cu noi de la început!
> Echipa Zephren

---

## ✅ Checklist final pre-lansare v6.0

- [ ] Toate cele 12 prețuri create în Stripe (10 abonament + 2 Pașaport one-time)
- [ ] Toate cele 12 env vars STRIPE_PRICE_* configurate în Vercel + redeploy
- [ ] Webhook endpoint configurat în Stripe Dashboard cu signing secret în Vercel
- [ ] Migration SQL `20260425_pricing_v6.sql` rulat în Supabase Dashboard
- [ ] Verificat în Supabase Table Editor: profiles are coloanele noi
- [ ] Test 5 abonamente × Test mode cu card 4242 4242 4242 4242
- [ ] Test 5 one-time products × Test mode
- [ ] Test SmartBill emite factură cu codurile noi (`ZEP-AUDIT-M`, `ZEP-CPE-10` etc.)
- [ ] Email notificare utilizatori existenți trimis (Resend / Gmail)
- [ ] Switch la Live mode → re-verificare 1 plan + 1 one-time în producție

---

**Sprint Pricing v6.0 implementare**: commit-uri `03a70fe` (Sub-sprint 1) + `6c9962b` (Sub-sprint 2) + acest sprint 3.
