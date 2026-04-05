/**
 * POST /api/stripe-webhook
 * Handles Stripe webhook events to update user plan in Supabase.
 * Requires STRIPE_WEBHOOK_SECRET and Supabase admin credentials.
 *
 * Events handled:
 * - checkout.session.completed → activate plan
 * - customer.subscription.deleted → revert to free
 * - customer.subscription.updated → update plan
 */

export const config = { api: { bodyParser: false } };

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

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data?.object;
        const userId = session?.metadata?.userId;
        const plan = session?.metadata?.plan;

        if (userId && plan && supabaseUrl && supabaseServiceKey) {
          await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${userId}`, {
            method: "PATCH",
            headers: {
              apikey: supabaseServiceKey,
              Authorization: `Bearer ${supabaseServiceKey}`,
              "Content-Type": "application/json",
              Prefer: "return=minimal",
            },
            body: JSON.stringify({ plan }),
          });
          console.log(`[Webhook] User ${userId} upgraded to ${plan}`);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data?.object;
        const userId = sub?.metadata?.userId;

        if (userId && supabaseUrl && supabaseServiceKey) {
          await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${userId}`, {
            method: "PATCH",
            headers: {
              apikey: supabaseServiceKey,
              Authorization: `Bearer ${supabaseServiceKey}`,
              "Content-Type": "application/json",
              Prefer: "return=minimal",
            },
            body: JSON.stringify({ plan: "free" }),
          });
          console.log(`[Webhook] User ${userId} reverted to free`);
        }
        break;
      }

      default:
        // Ignore other events
        break;
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error("[Webhook] Error:", err.message);
    return res.status(500).json({ error: "Webhook processing failed" });
  }
}
