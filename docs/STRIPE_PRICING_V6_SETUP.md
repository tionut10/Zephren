# Stripe Dashboard Setup — Sprint Pricing v6.0

**Data**: 25 apr 2026
**Sprint**: Pricing v6.0
**Pre-requisit**: Stripe Live mode activat (vezi memorie `infrastructure_payments_fiscal.md`)

---

## 📋 Pași manuali în Stripe Dashboard

Stripe products + prices se creează manual în Stripe Dashboard, NU prin cod. Fișierul `api/create-checkout.js` citește Price IDs din variabile de mediu Vercel.

### 1. Creare Products + Prices abonament (5 plans × 2 cicluri = 10 prețuri)

Pentru fiecare din cele 5 plans v6.0, creează **1 product cu 2 prețuri** (lunar + anual):

| Product Name | Product ID propus | Description |
|---|---|---|
| **Zephren Audit** | `prod_zephren_audit` | Auditor ocazional 1-3 CPE/lună · Step 1-6 complet |
| **Zephren Pro** | `prod_zephren_pro` | Auditor activ MDLPA · Step 1-7 complet + AI Pack |
| **Zephren Expert** | `prod_zephren_expert` | Auditor senior · Step 1-8 complet + BIM Pack |
| **Zephren Birou** | `prod_zephren_birou` | Birou audit 2-5 useri · CPE NELIMITAT + white-label |
| **Zephren Enterprise** | `prod_zephren_enterprise` | Organizații 6+ useri · SLA 99.9% + INCERC |

Pentru fiecare product, adaugă **2 recurring prices**:

| Plan | Lunar (RON) | Anual (RON, 10 luni) |
|---|---|---|
| Audit | 199 RON/lună (= **19900** bani) | 1.999 RON/an (= **199900** bani) |
| Pro | 499 RON/lună (= **49900** bani) | 4.990 RON/an (= **499000** bani) |
| Expert | 899 RON/lună (= **89900** bani) | 8.990 RON/an (= **899000** bani) |
| Birou | 1.890 RON/lună flat (= **189000** bani) | 18.900 RON/an (= **1890000** bani) |
| Enterprise | de la 4.990 RON/lună (= **499000** bani) | Negociat (= **4990000** bani) |

**ATENȚIE**: Stripe folosește bani (subdiviziuni RON × 100), nu RON. 1 RON = 100 bani.

---

### 2. Creare Prices one-time (pay-per-use, 5 produse)

Acestea sunt **one-time payments** (nu recurring):

| Product | Preț (RON) | Preț (bani) | Cod intern |
|---|---|---|---|
| **CPE single (Step 1-7)** | 99 RON | **9900** | `cpe-single` |
| **Pachet 10 CPE (Step 1-7)** | 790 RON | **79000** | `cpe-pack-10` |
| **CPE + Step 8 (1 modul)** | 199 RON | **19900** | `cpe-step8` |
| **Pașaport Renovare basic** | 79 RON | **7900** | `pasaport-basic` |
| **Pașaport Renovare detaliat (LCC)** | 199 RON | **19900** | `pasaport-detailed` |

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

# ─── One-time pay-per-use (5 produse) ───
STRIPE_PRICE_CPE_SINGLE=price_1XXXXX_cpe_single
STRIPE_PRICE_CPE_PACK_10=price_1XXXXX_cpe_pack_10
STRIPE_PRICE_CPE_STEP8=price_1XXXXX_cpe_step8
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
3. Checkout one-time `cpe-pack-10` → verifică în profiles că `cpe_credits_remaining += 10`
4. Pașaport basic 79 RON → verifică factură SmartBill cu cod `ZEP-PSP-B`
5. Cancel subscription via Billing Portal → verifică `tier = 'free'` în Supabase

---

### 6. Migrare utilizatori existenți (v5.x → v6.0)

**Decizie utilizator (25 apr 2026)**: utilizatorii existenți rămân pe planurile vechi cu **price-lock grandfathered** (prețul vechi rămâne blocat cât abonamentul e activ).

Aliasing-ul automat în `planGating.js` mapează:
- `starter` → comportament `audit` (199 RON, dar utilizator plătește prețul vechi 299 RON locked)
- `standard` → comportament `pro` (vechi 499 RON locked, primește acum AI Pack inclus = bonus!)
- `professional` → comportament `expert` (vechi 799 RON locked, primește Step 8 complet)
- `business` → comportament `birou` (vechi 749/u locked)
- `asociatie` → comportament `birou` (vechi 5.990 RON locked)

**NU forța migrare** — utilizatorii existenți primesc upgrade la features (AI/Step 8/BIM) automat dar la prețul lor vechi locked.

**Email notificare** template:

> Subiect: **Pachetul tău Zephren tocmai a primit funcții noi — fără cost suplimentar**
>
> Bună [Nume],
>
> Am restructurat pachetele Zephren la versiunea 6.0. Vești bune pentru tine:
>
> ✅ **Prețul tău rămâne blocat** la valoarea actuală cât abonamentul e activ.
> ✅ Primești **automat funcții noi** la pachetul tău:
>    - AI Pack (OCR facturi/CPE + chat import + AI assistant)
>    - Pașaport Renovare EPBD basic
>    - GWP CO₂ lifecycle (EN 15978)
>    - BACS A-D selector + SRI auto + MEPS check
> ✅ **Niciun act necesar** din partea ta.
>
> Vezi noile pachete: [zephren.ro/#pricing](https://zephren.ro/#pricing)
>
> Mulțumim că ești cu noi de la început!
> Echipa Zephren

---

## ✅ Checklist final pre-lansare v6.0

- [ ] Toate cele 15 prețuri create în Stripe (10 abonament + 5 one-time)
- [ ] Toate cele 15 env vars STRIPE_PRICE_* configurate în Vercel + redeploy
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
