/**
 * POST /api/create-checkout
 * Creates a Stripe Checkout session for Pro or Business plan.
 * Requires STRIPE_SECRET_KEY env var (server-side only).
 *
 * Body: { plan: "pro" | "business", userId?: string, email?: string }
 * Returns: { url: string } — redirect the user to this URL
 */

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return res.status(503).json({
      error: "Stripe is not configured. Set STRIPE_SECRET_KEY in environment variables.",
    });
  }

  const { plan, userId, email } = req.body || {};

  if (!plan || !["pro", "business"].includes(plan)) {
    return res.status(400).json({ error: "Invalid plan. Must be 'pro' or 'business'." });
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
