/**
 * POST /api/stripe-webhook
 * Handles Stripe webhook events to update user plan in Supabase + emite factură SmartBill.
 * Requires STRIPE_WEBHOOK_SECRET and Supabase admin credentials.
 *
 * Events handled:
 * - checkout.session.completed → activate plan + emite factură SmartBill (B2B RO/B2C/B2B UE)
 * - customer.subscription.updated → update plan (upgrade/downgrade mid-cycle) — Sprint 20
 * - customer.subscription.deleted → revert to free
 *
 * Env vars suplimentare necesare pentru SmartBill (Sprint P0-1, 18 apr 2026):
 *   SMARTBILL_EMAIL  — email cont SmartBill (ex: contact@zephren.com)
 *   SMARTBILL_TOKEN  — token API generat din Settings → API SmartBill
 *   SMARTBILL_CUI    — CUI firmă emitentă ZEPHREN SRL (format "RO12345678")
 */

export const config = { api: { bodyParser: false } };

// ══════════════════════════════════════════════════════════════════════════
// SmartBill — emitere automată factură fiscală (P0-1, 18 apr 2026)
//   B2B România    → TVA 21% + eFactura ANAF automat
//   B2C PF         → TVA 21% (fără eFactura — ANAF cere CUI)
//   B2B UE         → TVA 0% reverse charge + D390 VIES
// ══════════════════════════════════════════════════════════════════════════
function getMonthYear(date = new Date()) {
  const months = ["Ianuarie","Februarie","Martie","Aprilie","Mai","Iunie",
                  "Iulie","August","Septembrie","Octombrie","Noiembrie","Decembrie"];
  return `${months[date.getMonth()]} ${date.getFullYear()}`;
}

async function createSmartBillInvoice(session) {
  const sbEmail = process.env.SMARTBILL_EMAIL;
  const sbToken = process.env.SMARTBILL_TOKEN;
  const sbCui   = process.env.SMARTBILL_CUI;

  if (!sbEmail || !sbToken || !sbCui) {
    console.warn("[SmartBill] Credentials missing — skip invoice generation");
    return;
  }

  const meta = session.metadata || {};
  const isCompany = !!meta.cui;
  const isEU = !!meta.vatEU;

  const client = isCompany
    ? { name: meta.company || "—", vatCode: meta.cui, address: meta.address || "—",
        city: meta.city || "—", country: "Romania" }
    : isEU
    ? { name: meta.company || meta.fullName || "—", vatCode: meta.vatEU,
        country: meta.country || "—", address: meta.address || "—" }
    : { name: meta.fullName || session.customer_details?.name || "Persoană fizică",
        address: meta.address || "—", city: meta.city || "—",
        country: "Romania", isTaxPayer: false };

  const amountTotal = (session.amount_total || 0) / 100;
  const priceNoVat = isEU ? amountTotal : amountTotal / 1.21;
  const vatPercent = isEU ? 0 : 21;

  // v6.0 — denumire produs + cod SmartBill diferențiat pentru abonament vs one-time
  const productType  = meta.productType || "subscription";
  const billingCycle = meta.billingCycle || "monthly";
  const cycleSuffix  = billingCycle === "yearly" ? "Y" : "M";
  const oneTimeProd  = meta.oneTimeProduct;
  const cpeUnits     = meta.cpeUnits ? parseInt(meta.cpeUnits, 10) : null;

  let productName, productCode;
  if (productType === "one_time" && oneTimeProd) {
    // Sprint Pricing v6.0 (25 apr 2026) — pay-per-use redus la doar Pașaport
    // Renovare. CPE-uri eliminate (canibalizate de abonament Audit 199 RON).
    const ONE_TIME_LABELS = {
      "pasaport-basic":    { name: "Pașaport Renovare EPBD (basic)",        code: "ZEP-PSP-B" },
      "pasaport-detailed": { name: "Pașaport Renovare EPBD (detaliat LCC)", code: "ZEP-PSP-D" },
    };
    const lbl = ONE_TIME_LABELS[oneTimeProd] || { name: oneTimeProd, code: "ZEP-OT" };
    productName = lbl.name + (cpeUnits && cpeUnits > 1 ? ` (${cpeUnits} credite)` : "");
    productCode = lbl.code;
  } else {
    const planUpper = (meta.plan || "PLAN").toUpperCase();
    productName = `Abonament Zephren ${meta.plan || "—"} ${billingCycle === "yearly" ? "(anual)" : "(lunar)"} — ${getMonthYear()}`;
    productCode = `ZEP-${planUpper}-${cycleSuffix}`;
  }

  const body = {
    companyVatCode: sbCui,
    client,
    issueDate: new Date().toISOString().split("T")[0],
    seriesName: process.env.SMARTBILL_SERIES || "ZEP",
    currency: session.currency?.toUpperCase() || "RON",
    products: [{
      name: productName,
      code: productCode,
      isService: true,
      quantity: 1,
      price: Number(priceNoVat.toFixed(2)),
      currency: session.currency?.toUpperCase() || "RON",
      vatName: vatPercent === 0 ? "Scutit" : "Normala",
      vatPercentage: vatPercent,
      ...(isEU && { vatExemptReason: "Taxare inversă art.196 Directiva TVA" }),
    }],
    sendEmail: true,
    isDraft: false,
  };

  const auth = Buffer.from(`${sbEmail}:${sbToken}`).toString("base64");

  try {
    const res = await fetch("https://ws.smartbill.ro/SBORO/api/invoice", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error(`[SmartBill] HTTP ${res.status} — ${errText.slice(0, 300)}`);
      // Plata e confirmată — nu arunci excepție, doar loghezi.
      return;
    }

    const data = await res.json().catch(() => ({}));
    console.log(`[SmartBill] Factură emisă: ${data.number || data.series || "OK"} pentru ${client.name}`);
  } catch (err) {
    console.error("[SmartBill] Request error:", err.message);
  }
}

// Sprint Pricing v6.0 (25 apr 2026) — mapare Stripe Price ID → plan intern.
// Acoperă atât prețurile lunare (M) cât și anuale (Y) pentru toate cele 5 plans noi.
// Plus backward-compat pentru env vars vechi (STRIPE_PRICE_STARTER etc.).
function derivePlanFromPriceId(priceId) {
  if (!priceId) return null;
  // v6.0 — abonamente noi (Audit / Pro / Expert / Birou / Enterprise × M/Y)
  if (priceId === process.env.STRIPE_PRICE_AUDIT_M      || priceId === process.env.STRIPE_PRICE_AUDIT_Y)      return "audit";
  if (priceId === process.env.STRIPE_PRICE_PRO_M        || priceId === process.env.STRIPE_PRICE_PRO_Y)        return "pro";
  if (priceId === process.env.STRIPE_PRICE_EXPERT_M     || priceId === process.env.STRIPE_PRICE_EXPERT_Y)     return "expert";
  if (priceId === process.env.STRIPE_PRICE_BIROU_M      || priceId === process.env.STRIPE_PRICE_BIROU_Y)      return "birou";
  if (priceId === process.env.STRIPE_PRICE_ENTERPRISE_M || priceId === process.env.STRIPE_PRICE_ENTERPRISE_Y) return "enterprise";
  // Backward-compat v5.x (utilizatori existenți pe planurile vechi)
  if (priceId === process.env.STRIPE_PRICE_STARTER)     return "audit";       // 199 (Starter→Audit)
  if (priceId === process.env.STRIPE_PRICE_STANDARD)    return "pro";         // 499 (Standard→Pro)
  if (priceId === process.env.STRIPE_PRICE_PRO)         return "pro";         // legacy unic
  if (priceId === process.env.STRIPE_PRICE_ASOCIATIE)   return "birou";       // (Asociație→Birou)
  if (priceId === process.env.STRIPE_PRICE_BUSINESS)    return "birou";       // (Business→Birou)
  return null;
}

// v6.0 — handler pentru produse one-time (pay-per-CPE / pay-per-pașaport).
// Adaugă credite în profiles.cpe_credits_remaining pentru utilizatori fără abonament.
async function applyOneTimePurchase(supabaseUrl, supabaseServiceKey, userId, cpeUnits) {
  if (!userId || !cpeUnits || !supabaseUrl || !supabaseServiceKey) return false;
  const units = parseInt(cpeUnits, 10) || 0;
  if (units <= 0) return false;

  // Citește credite curente, adaugă noile, scrie atomic.
  // (Pentru o implementare 100% safe, folosește RPC SQL în Supabase — vezi migration v6.)
  const getResp = await fetch(
    `${supabaseUrl}/rest/v1/profiles?id=eq.${userId}&select=cpe_credits_remaining`,
    { headers: { apikey: supabaseServiceKey, Authorization: `Bearer ${supabaseServiceKey}` } }
  );
  const rows = await getResp.json().catch(() => []);
  const current = Array.isArray(rows) && rows[0]?.cpe_credits_remaining || 0;
  const next = current + units;

  const patchResp = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${userId}`, {
    method: "PATCH",
    headers: {
      apikey: supabaseServiceKey,
      Authorization: `Bearer ${supabaseServiceKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({ cpe_credits_remaining: next }),
  });
  if (!patchResp.ok) {
    console.error(`[Webhook] One-time credit add failed: user ${userId} units ${units}`);
    return false;
  }
  console.log(`[Webhook] User ${userId} +${units} CPE credits (now: ${next})`);
  return true;
}

async function patchProfilePlan(supabaseUrl, supabaseServiceKey, userId, plan) {
  if (!userId || !plan || !supabaseUrl || !supabaseServiceKey) return false;
  const resp = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${userId}`, {
    method: "PATCH",
    headers: {
      apikey: supabaseServiceKey,
      Authorization: `Bearer ${supabaseServiceKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({ plan }),
  });
  if (!resp.ok) {
    console.error(`[Webhook] PATCH plan failed: ${resp.status} — user ${userId} plan ${plan}`);
    return false;
  }
  return true;
}

// In-memory idempotency guard: track recently processed event IDs.
// Prevents duplicate processing from Stripe webhook retries.
const processedEvents = new Set();
const MAX_PROCESSED = 1000;

function markEventProcessed(eventId) {
  processedEvents.add(eventId);
  // Evict oldest entries if set grows too large
  if (processedEvents.size > MAX_PROCESSED) {
    const iter = processedEvents.values();
    for (let i = 0; i < 200; i++) {
      processedEvents.delete(iter.next().value);
    }
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!stripeKey || !webhookSecret) {
    return res.status(503).json({ error: "Stripe webhook not configured" });
  }

  // Read raw body for signature verification
  const chunks = [];
  for await (const chunk of req) { chunks.push(chunk); }
  const rawBody = Buffer.concat(chunks).toString("utf-8");

  // Verify Stripe webhook signature
  const sig = req.headers["stripe-signature"];
  let event;
  try {
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(stripeKey);
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error("[Webhook] Signature verification failed:", err.message);
    return res.status(400).json({ error: "Invalid signature" });
  }

  if (!event || !event.type) {
    return res.status(400).json({ error: "Invalid event" });
  }

  // Idempotency: skip already-processed events (Stripe retries)
  if (processedEvents.has(event.id)) {
    console.log(`[Webhook] Duplicate event ${event.id} — skipped`);
    return res.status(200).json({ received: true, duplicate: true });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data?.object;
        const userId = session?.metadata?.userId;
        const productType = session?.metadata?.productType || "subscription";

        if (productType === "one_time") {
          // v6.0 — Pay-per-CPE / Pașaport (one-time, nu modifică planul abonament)
          const cpeUnits = session?.metadata?.cpeUnits;
          const oneTimeProduct = session?.metadata?.oneTimeProduct;
          if (cpeUnits) {
            await applyOneTimePurchase(supabaseUrl, supabaseServiceKey, userId, cpeUnits);
          }
          console.log(`[Webhook] One-time purchase: user ${userId} product ${oneTimeProduct} units ${cpeUnits || 0}`);
        } else {
          // Abonament — actualizează planul utilizatorului
          const plan = session?.metadata?.plan;
          const ok = await patchProfilePlan(supabaseUrl, supabaseServiceKey, userId, plan);
          if (ok) console.log(`[Webhook] User ${userId} upgraded to ${plan}`);
        }
        // P0-1 (18 apr 2026) — emitere factură SmartBill + eFactura ANAF
        // (rulează pentru ambele tipuri: abonament + one-time)
        await createSmartBillInvoice(session);
        break;
      }

      // Sprint 20 — upgrade/downgrade mid-cycle (Stripe billing portal, plan change).
      case "customer.subscription.updated": {
        const sub = event.data?.object;
        const userId = sub?.metadata?.userId;
        const priceId = sub?.items?.data?.[0]?.price?.id;
        const newPlan = derivePlanFromPriceId(priceId);
        if (!userId || !newPlan) {
          console.warn("[Webhook] subscription.updated — cannot derive plan", { userId, priceId });
          break;
        }
        // Revert to free if the subscription is canceled or past_due
        const status = sub?.status;
        const effectivePlan = (status === "canceled" || status === "unpaid" || status === "incomplete_expired")
          ? "free"
          : newPlan;
        const ok = await patchProfilePlan(supabaseUrl, supabaseServiceKey, userId, effectivePlan);
        if (ok) console.log(`[Webhook] User ${userId} plan updated to ${effectivePlan} (status=${status})`);
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data?.object;
        const userId = sub?.metadata?.userId;
        const ok = await patchProfilePlan(supabaseUrl, supabaseServiceKey, userId, "free");
        if (ok) console.log(`[Webhook] User ${userId} reverted to free`);
        break;
      }

      default:
        // Ignore other events
        break;
    }

    markEventProcessed(event.id);
    return res.status(200).json({ received: true });
  } catch (err) {
    console.error("[Webhook] Error:", err.message);
    return res.status(500).json({ error: "Webhook processing failed" });
  }
}
