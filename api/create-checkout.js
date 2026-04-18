/**
 * POST /api/create-checkout
 * Creates a Stripe Checkout session for Pro or Business plan,
 * SAU o sesiune Stripe Billing Portal (action: "portal") — P1-1, 18 apr 2026.
 *
 * Body (checkout — default):
 *   { plan: "pro" | "business",
 *     clientType: "company" | "individual" | "eu",
 *     cui?:      string   // B2B RO (format "RO12345678" sau doar cifre)
 *     company?:  string   // B2B RO & UE — denumire firmă
 *     fullName?: string   // B2C PF — nume complet
 *     address?:  string
 *     city?:     string
 *     vatEU?:    string   // B2B UE — VAT number (ex: DE123456789)
 *     country?:  string   // default "RO"
 *   }
 *
 * Body (billing portal):
 *   { action: "portal", customerId?: string, returnUrl?: string }
 *   Dacă customerId lipsește, endpoint-ul încearcă să-l găsească după email-ul
 *   utilizatorului autentificat (fallback: STRIPE_CUSTOMER_ID_BY_USER în Supabase).
 *
 * Returns: { url: string } — redirect the user to this URL
 *
 * Metadata pusă în sesiunea Stripe Checkout → citită de stripe-webhook.js → SmartBill
 * pentru emitere automată factură fiscală (P0-1+P0-2, 18 apr 2026).
 *
 * P1-1: fișier nou `api/billing-portal.js` evitat — suntem la 12/12 funcții pe Hobby plan.
 * Portalul e expus aici sub forma action="portal" pe același endpoint.
 */

import { requireAuth } from "./_middleware/auth.js";

// P1-1 — creează o sesiune Stripe Billing Portal pentru gestionarea abonamentului
// (schimbare plan, actualizare card, descărcare facturi, anulare).
async function handleBillingPortal(req, res, stripeKey, auth) {
  const { customerId, returnUrl } = req.body || {};
  const email = auth.user.email;
  const origin = req.headers.origin || req.headers.referer?.replace(/\/$/, "") || "https://zephren.ro";

  // 1. Determină customerId Stripe — fie furnizat, fie caută după email.
  let stripeCustomerId = customerId;
  if (!stripeCustomerId && email) {
    try {
      const lookup = await fetch(
        `https://api.stripe.com/v1/customers/search?query=${encodeURIComponent(`email:"${email}"`)}`,
        { headers: { Authorization: `Bearer ${stripeKey}` } }
      );
      const lookupJson = await lookup.json();
      if (lookupJson?.data?.length > 0) {
        stripeCustomerId = lookupJson.data[0].id;
      }
    } catch (err) {
      console.error("[Stripe] Customer lookup failed:", err.message);
    }
  }

  if (!stripeCustomerId) {
    return res.status(404).json({
      error: "Niciun abonament activ găsit pentru contul curent. Achiziționați întâi un plan.",
    });
  }

  try {
    const response = await fetch("https://api.stripe.com/v1/billing_portal/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        customer: stripeCustomerId,
        return_url: returnUrl || `${origin}/#app?billing=portal_return`,
      }),
    });

    const portal = await response.json();
    if (!response.ok) {
      console.error("[Stripe] Portal error:", portal.error?.message);
      return res.status(400).json({
        error: portal.error?.message || "Nu am putut genera sesiunea Billing Portal.",
      });
    }
    return res.status(200).json({ url: portal.url });
  } catch (err) {
    console.error("[Stripe] Portal request error:", err.message);
    return res.status(500).json({ error: "Eroare internă la crearea sesiunii Billing Portal." });
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Auth: require authenticated user for checkout
  const auth = await requireAuth(req, res);
  if (!auth) return;

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return res.status(503).json({
      error: "Stripe is not configured. Set STRIPE_SECRET_KEY in environment variables.",
    });
  }

  // P1-1 (18 apr 2026) — ruta Billing Portal (gestionare abonament)
  if (req.body?.action === "portal") {
    return handleBillingPortal(req, res, stripeKey, auth);
  }

  const { plan, clientType, cui, company, fullName, address, city, vatEU, country } = req.body || {};
  // Use authenticated user's ID and email (prevents impersonation)
  const userId = auth.user.id;
  const email = auth.user.email;

  if (!plan || !["pro", "business"].includes(plan)) {
    return res.status(400).json({ error: "Invalid plan. Must be 'pro' or 'business'." });
  }

  // P0-2 (18 apr 2026) — validare minimă metadata fiscală pentru factură SmartBill.
  //   B2B RO: cui + company obligatorii
  //   B2C:    fullName obligatoriu
  //   B2B UE: vatEU + company + country obligatorii
  const ct = (clientType || "individual").toLowerCase();
  if (!["company", "individual", "eu"].includes(ct)) {
    return res.status(400).json({ error: "clientType invalid. Acceptat: company | individual | eu" });
  }
  if (ct === "company" && (!cui || !company)) {
    return res.status(400).json({ error: "Pentru persoană juridică RO este obligatoriu CUI + denumire firmă." });
  }
  if (ct === "eu" && (!vatEU || !company || !country)) {
    return res.status(400).json({ error: "Pentru client UE este obligatoriu VAT number + denumire + țară." });
  }
  if (ct === "individual" && !fullName) {
    return res.status(400).json({ error: "Pentru persoană fizică este obligatoriu numele complet." });
  }

  // Price configuration — replace with real Stripe Price IDs in production
  const PRICES = {
    pro: {
      priceId: process.env.STRIPE_PRICE_PRO || "price_placeholder_pro",
      name: "Zephren Pro",
      amount: 9900, // 99 RON in bani
    },
    business: {
      priceId: process.env.STRIPE_PRICE_BUSINESS || "price_placeholder_business",
      name: "Zephren Business",
      amount: 24900, // 249 RON in bani
    },
  };

  const selected = PRICES[plan];
  const origin = req.headers.origin || req.headers.referer?.replace(/\/$/, "") || "https://zephren.ro";

  try {
    // Use Stripe API directly via fetch (no SDK needed for simple checkout)
    const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        "mode": "subscription",
        "line_items[0][price]": selected.priceId,
        "line_items[0][quantity]": "1",
        "success_url": `${origin}/#app?checkout=success&plan=${plan}`,
        "cancel_url": `${origin}/#app?checkout=cancel`,
        ...(email ? { "customer_email": email } : {}),
        ...(userId ? { "metadata[userId]": userId } : {}),
        "metadata[plan]": plan,
        // P0-2 — metadata fiscală pentru SmartBill (stripe-webhook citește meta)
        "metadata[clientType]": ct,
        ...(cui      ? { "metadata[cui]": String(cui).trim() }           : {}),
        ...(company  ? { "metadata[company]": String(company).trim() }   : {}),
        ...(fullName ? { "metadata[fullName]": String(fullName).trim() } : {}),
        ...(address  ? { "metadata[address]": String(address).trim() }   : {}),
        ...(city     ? { "metadata[city]": String(city).trim() }         : {}),
        ...(vatEU    ? { "metadata[vatEU]": String(vatEU).trim() }       : {}),
        ...(country  ? { "metadata[country]": String(country).trim() }   : { "metadata[country]": "RO" }),
      }),
    });

    const session = await response.json();

    if (!response.ok) {
      console.error("[Stripe] Checkout error:", session.error?.message);
      return res.status(400).json({
        error: session.error?.message || "Failed to create checkout session",
      });
    }

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error("[Stripe] Error:", err.message);
    return res.status(500).json({ error: "Internal server error" });
  }
}
