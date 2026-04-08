/**
 * POST /api/ancpi-proxy
 * Proxy server-side pentru ANCPI Geoportal — evită CORS din browser.
 *
 * Body: { nrCadastral: string }
 * Returns: { address, area_mp, year_built, owner_type, parcel_id, _simulated }
 *
 * Rate limiting: max 10 req/min per IP
 * Cache în memorie: 1 oră per număr cadastral
 *
 * Notă: ANCPI nu expune API public REST fără acord instituțional.
 * Funcția încearcă endpoint-ul real dacă ANCPI_API_KEY e configurat,
 * altfel returnează date simulate cu _simulated: true.
 */

// ── Cache în memorie (1 oră) ──────────────────────────────────────────────────
const CACHE_TTL_MS    = 60 * 60 * 1000; // 1 oră
const CACHE_MAX_SIZE  = 500;            // max intrări în cache
const cache = new Map(); // key: nrCadastral, value: { data, expiresAt }

function cacheGet(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function cacheSet(key, data) {
  // Evicție simplă FIFO când limita e atinsă
  if (cache.size >= CACHE_MAX_SIZE) {
    const firstKey = cache.keys().next().value;
    cache.delete(firstKey);
  }
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

// ── Rate limiting (max 10 req/min per IP) ─────────────────────────────────────
const RATE_WINDOW_MS  = 60 * 1000; // 1 minut
const RATE_MAX_REQ    = 10;
const rateLimitStore  = new Map(); // key: ip, value: { count, windowStart }

function checkRateLimit(ip) {
  const now    = Date.now();
  const entry  = rateLimitStore.get(ip) || { count: 0, windowStart: now };

  // Resetează fereastra dacă a expirat
  if (now - entry.windowStart > RATE_WINDOW_MS) {
    entry.count       = 0;
    entry.windowStart = now;
  }

  entry.count++;
  rateLimitStore.set(ip, entry);

  const remaining  = Math.max(0, RATE_MAX_REQ - entry.count);
  const resetSec   = Math.ceil((entry.windowStart + RATE_WINDOW_MS - now) / 1000);

  return {
    allowed:    entry.count <= RATE_MAX_REQ,
    remaining,
    resetSec,
    retryAfter: resetSec,
  };
}

// ── Curățare periodică rate limit store (evită memory leak) ──────────────────
// Vercel serverless: funcția e stateless între invocații reci,
// dar poate fi reutilizată în aceeași instanță. Curățăm la fiecare invocare.
function cleanupRateLimitStore() {
  const now = Date.now();
  for (const [ip, entry] of rateLimitStore.entries()) {
    if (now - entry.windowStart > RATE_WINDOW_MS * 2) {
      rateLimitStore.delete(ip);
    }
  }
}

// ── Stub date simulate (fallback fără cheie API) ──────────────────────────────
function generateStubData(nrCadastral) {
  const hash = String(nrCadastral)
    .split("")
    .reduce((acc, ch) => acc + ch.charCodeAt(0), 0);

  const areas = [42, 55, 68, 78, 90, 105, 125, 148, 175, 220, 280, 350];
  const years = [1960, 1965, 1970, 1975, 1980, 1985, 1990, 1995, 2000, 2005, 2010, 2018];
  const types = ["Persoană fizică", "Persoană juridică", "Stat", "UAT", "Asociație"];
  const streets = [
    "Str. Mihai Eminescu", "Bd. Unirii", "Calea Victoriei",
    "Str. Libertății", "Bd. Dacia", "Str. Florilor",
    "Aleea Trandafirilor", "Bd. Nicolae Titulescu",
  ];
  const cities = ["București", "Cluj-Napoca", "Timișoara", "Iași", "Brașov", "Constanța"];

  return {
    address:    `${streets[hash % streets.length]} nr. ${(hash % 150) + 1}`,
    city:       cities[hash % cities.length],
    county:     "—",
    area_mp:    areas[hash % areas.length],
    year_built: years[hash % years.length],
    owner_type: types[hash % types.length],
    parcel_id:  String(nrCadastral).trim(),
    _simulated: true,
    _note:      "Date simulate — ANCPI_API_KEY neconfiguratã sau API indisponibil.",
  };
}

// ── Apel real ANCPI (necesită ANCPI_API_KEY) ──────────────────────────────────
async function fetchFromANCPI(nrCadastral, apiKey) {
  // ANCPI Geoportal — endpoint ipotetic (nu există REST API public documentat)
  // Înlocuiți cu endpoint-ul real când obțineți acces instituțional
  const url =
    `https://geoportal.ancpi.ro/api/v1/parcels?nr=${encodeURIComponent(nrCadastral)}` +
    `&key=${apiKey}`;

  const res = await fetch(url, {
    headers: {
      "Accept":       "application/json",
      "User-Agent":   "ZephrenEnergyApp/3.4",
    },
    signal: AbortSignal.timeout(8000), // timeout 8s
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`ANCPI API error ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = await res.json();

  // Mapare câmpuri ANCPI → format intern Zephren
  // (structura reală poate diferi — ajustați după documentația API)
  return {
    address:    data.adresa     || data.address      || "—",
    city:       data.localitate || data.city         || "—",
    county:     data.judet      || data.county       || "—",
    area_mp:    parseFloat(data.suprafata || data.area || 0),
    year_built: parseInt(data.an_constructie || data.yearBuilt || 0) || null,
    owner_type: data.tip_proprietar || data.ownerType || "—",
    parcel_id:  nrCadastral,
    _simulated: false,
  };
}

// ── Handler principal ─────────────────────────────────────────────────────────
export default async function handler(req, res) {
  // Setează CORS headers (permite apeluri din browser)
  res.setHeader("Access-Control-Allow-Origin",  "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Preflight OPTIONS
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  // ── Rate limiting ──────────────────────────────────────────────────────────
  cleanupRateLimitStore();

  const ip = (
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.headers["x-real-ip"] ||
    req.socket?.remoteAddress ||
    "unknown"
  );

  const limit = checkRateLimit(ip);
  if (!limit.allowed) {
    res.setHeader("Retry-After",             String(limit.retryAfter));
    res.setHeader("X-RateLimit-Limit",       String(RATE_MAX_REQ));
    res.setHeader("X-RateLimit-Remaining",   "0");
    res.setHeader("X-RateLimit-Reset",       String(Math.floor(Date.now() / 1000) + limit.resetSec));
    return res.status(429).json({
      error: `Prea multe cereri. Reveniți în ${limit.retryAfter} secunde. (Max ${RATE_MAX_REQ} req/min)`,
      retryAfter: limit.retryAfter,
    });
  }

  res.setHeader("X-RateLimit-Limit",     String(RATE_MAX_REQ));
  res.setHeader("X-RateLimit-Remaining", String(limit.remaining));

  // ── Validare body ──────────────────────────────────────────────────────────
  const { nrCadastral } = req.body || {};

  if (!nrCadastral || typeof nrCadastral !== "string" || !nrCadastral.trim()) {
    return res.status(400).json({
      error: "Câmpul 'nrCadastral' este obligatoriu (string nevid).",
    });
  }

  const cacheKey = nrCadastral.trim().toLowerCase();

  // ── Cache hit ──────────────────────────────────────────────────────────────
  const cached = cacheGet(cacheKey);
  if (cached) {
    res.setHeader("X-Cache", "HIT");
    return res.status(200).json({ ...cached, _cached: true });
  }

  res.setHeader("X-Cache", "MISS");

  // ── Apel ANCPI real (dacă există cheie API) ────────────────────────────────
  const ancpiKey = process.env.ANCPI_API_KEY;

  let result;

  if (ancpiKey) {
    try {
      result = await fetchFromANCPI(nrCadastral.trim(), ancpiKey);
    } catch (err) {
      console.warn("[ancpi-proxy] API real eșuat, fallback la stub:", err.message);
      // Fallback la stub în caz de eroare API (nu întoarce 500 utilizatorului)
      result = generateStubData(nrCadastral.trim());
      result._api_error = err.message;
    }
  } else {
    // Fără cheie API → date simulate
    result = generateStubData(nrCadastral.trim());
  }

  // ── Salvare în cache ───────────────────────────────────────────────────────
  cacheSet(cacheKey, result);

  return res.status(200).json(result);
}
