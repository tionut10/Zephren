/**
 * Auth middleware for Vercel serverless functions.
 * Validates Supabase JWT and returns user + plan info.
 *
 * Usage:
 *   const { user, plan } = await requireAuth(req, res);
 *   if (!user) return; // 401 already sent
 */

// Sprint 20 (18 apr 2026) — extindere de la 3 la 6 planuri conform planGating.js.
// `business` rămâne alias pentru `asociatie` (backward compat din `planGating.js`).
const PLAN_HIERARCHY = {
  free:       0,
  starter:    1,
  standard:   2,
  pro:        3,
  asociatie:  4,
  business:   4,
};

/**
 * Verify Bearer token via Supabase GoTrue /auth/v1/user endpoint.
 * @param {import('http').IncomingMessage} req
 * @returns {Promise<{ user: { id: string, email: string }, plan: string } | null>}
 */
export async function verifyAuth(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7);
  if (!token || token.length < 10) return null;

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl) return null;

  try {
    // Validate token via Supabase GoTrue
    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: supabaseServiceKey || process.env.VITE_SUPABASE_ANON_KEY || "",
      },
    });

    if (!userRes.ok) return null;
    const userData = await userRes.json();
    if (!userData?.id) return null;

    // Fetch plan from profiles table (using service key to bypass RLS)
    let plan = "free";
    if (supabaseServiceKey) {
      const profileRes = await fetch(
        `${supabaseUrl}/rest/v1/profiles?id=eq.${userData.id}&select=plan`,
        {
          headers: {
            apikey: supabaseServiceKey,
            Authorization: `Bearer ${supabaseServiceKey}`,
          },
        }
      );
      if (profileRes.ok) {
        const profiles = await profileRes.json();
        if (profiles?.[0]?.plan) plan = profiles[0].plan;
      }
    }

    return {
      user: { id: userData.id, email: userData.email },
      plan,
    };
  } catch {
    return null;
  }
}

/**
 * Require authenticated user. Sends 401 and returns null if not authenticated.
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @returns {Promise<{ user: { id: string, email: string }, plan: string } | null>}
 */
export async function requireAuth(req, res) {
  // PUBLIC_API_MODE=1 — bypass auth pentru testare pre-lansare (19 apr 2026).
  // Șterge env var din Vercel → auth strict revine automat, fără cod change.
  if (process.env.PUBLIC_API_MODE === "1") {
    return {
      user: { id: "anon-public", email: "anon@public.local" },
      plan: "business",
    };
  }
  const auth = await verifyAuth(req);
  if (!auth) {
    res.status(401).json({ error: "Autentificare necesara. Conectati-va la cont." });
    return null;
  }
  return auth;
}

/**
 * Require a minimum plan level. Sends 403 if plan is insufficient.
 * @param {import('http').ServerResponse} res
 * @param {string} userPlan - Current user plan
 * @param {string} minPlan - Minimum required plan ("free", "pro", "business")
 * @returns {boolean} true if plan is sufficient
 */
export function requirePlan(res, userPlan, minPlan) {
  const userLevel = PLAN_HIERARCHY[userPlan] ?? 0;
  const minLevel = PLAN_HIERARCHY[minPlan] ?? 0;

  if (userLevel < minLevel) {
    res.status(403).json({
      error: `Aceasta functie necesita planul ${minPlan}. Planul dvs. actual: ${userPlan}.`,
      requiredPlan: minPlan,
    });
    return false;
  }
  return true;
}
