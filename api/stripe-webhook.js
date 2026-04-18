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
//   B2B România    → TVA 19% + eFactura ANAF automat
//   B2C PF         → TVA 19% (fără eFactura — ANAF cere CUI)
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
  const priceNoVat = isEU ? amountTotal : amountTotal / 1.19;
  const vatPercent = isEU ? 0 : 19;

  const body = {
    companyVatCode: sbCui,
    client,
    issueDate: new Date().toISOString().split("T")[0],
    seriesName: process.env.SMARTBILL_SERIES || "ZEP",
    currency: session.currency?.toUpperCase() || "RON",
    products: [{
      name: `Abonament Zephren ${meta.plan || "—"} — ${getMonthYear()}`,
      code: `ZEP-${(meta.plan || "PLAN").toUpperCase()}-M`,
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

// Sprint 20 (18 apr 2026) — mapare Stripe Price ID → plan intern.
// Configurați ID-urile exacte în env vars: STRIPE_PRICE_STARTER, STRIPE_PRICE_STANDARD etc.
function derivePlanFromPriceId(priceId) {
  if (!priceId) return null;
  if (priceId === process.env.STRIPE_PRICE_STARTER)    return "starter";
  if (priceId === process.env.STRIPE_PRICE_STANDARD)   return "standard";
  if (priceId === process.env.STRIPE_PRICE_PRO)        return "pro";
  if (priceId === process.env.STRIPE_PRICE_ASOCIATIE)  return "asociatie";
  if (priceId === process.env.STRIPE_PRICE_BUSINESS)   return "business";
  return null;
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
        const plan = session?.metadata?.plan;
        const ok = await patchProfilePlan(supabaseUrl, supabaseServiceKey, userId, plan);
        if (ok) console.log(`[Webhook] User ${userId} upgraded to ${plan}`);
        // P0-1 (18 apr 2026) — emitere factură SmartBill + eFactura ANAF
        // Rulează în paralel cu răspunsul Stripe; erorile sunt logate, nu aruncate.
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
