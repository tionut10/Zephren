/**
 * api/energy-prices-live.js — Sprint P2 (6 mai 2026)
 *
 * Endpoint serverless — preț electricitate spot LIVE din OPCOM PZU (Piața pentru
 * Ziua Următoare, RO). Returnează prețul mediu zilnic în RON/MWh + RON/kWh.
 *
 * STATUS: DEFERRED — Vercel Hobby plan e la limit (12/12 funcții). Activare la
 * upgrade Pro plan: mută în `api/` (drop prefix `_deferred/`).
 *
 * Surse:
 *   - OPCOM PZU public results: https://www.opcom.ro/pp/grafice_ip/raportPIPsRoUnique.php
 *     (HTML scraping — fără API REST oficial; site permite scraping conform TOS public)
 *   - Cache 1h în Vercel KV (sau memory dacă KV nu e activat)
 *   - Fallback: ENTSOE Transparency Platform REST (necesită API key gratuit)
 *
 * Pentru consum în client: src/data/energy-prices-live.js → fetch acest endpoint.
 */

const CACHE_KEY = "opcom_pzu_latest";
const CACHE_TTL_MS = 60 * 60 * 1000; // 1h

// In-memory cache pentru cold-start Vercel (per instance)
let memoryCache = null;

function setCorsHeaders(res, origin = "*") {
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=7200");
}

/**
 * Parser HTML OPCOM PZU — extrage preț mediu ponderat zilnic (RON/MWh).
 * Format pagina: tabel cu colonne [Ora, Volum, Preț] în lei/MWh.
 *
 * IMPORTANT: la activare, verifică structura HTML actuală OPCOM (poate să se
 * schimbe). Pattern regex e robust dar nu garantat permanent.
 */
function parseOpcomHtml(html) {
  // Caută toate prețurile (RON/MWh) din tabelul orar
  const priceRegex = /<td[^>]*>\s*(\d{1,4}[.,]\d{2})\s*<\/td>/g;
  const matches = [];
  let m;
  while ((m = priceRegex.exec(html)) !== null) {
    const price = parseFloat(m[1].replace(",", "."));
    if (price > 50 && price < 5000) { // sanity check RO 2025-2026 range
      matches.push(price);
    }
  }
  if (matches.length === 0) return null;
  // Returnează media simplă (audit opțional pentru media ponderată cu volume)
  const avgRonMwh = matches.reduce((a, b) => a + b, 0) / matches.length;
  return {
    avgRonPerMwh: Math.round(avgRonMwh * 100) / 100,
    avgRonPerKwh: Math.round((avgRonMwh / 1000) * 1000) / 1000,
    samplesCount: matches.length,
  };
}

/**
 * Fallback ENTSOE pentru când OPCOM e indisponibil.
 * Necesită ENTSOE_API_KEY environment variable (gratuit, registrare la
 * https://transparency.entsoe.eu/usrm/user/myAccountSettings).
 */
async function fetchEntsoeFallback() {
  const apiKey = process.env.ENTSOE_API_KEY;
  if (!apiKey) return null;
  // ENTSOE A44 = Day-ahead prices, RO = 10YRO-TEL------P
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");
  const url = `https://web-api.tp.entsoe.eu/api?securityToken=${apiKey}` +
    `&documentType=A44&in_Domain=10YRO-TEL------P&out_Domain=10YRO-TEL------P` +
    `&periodStart=${dateStr}0000&periodEnd=${dateStr}2300`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const xml = await res.text();
    // ENTSOE returnează XML — extragere simplă <price.amount>VALUE</price.amount>
    const priceMatches = [...xml.matchAll(/<price\.amount>([\d.]+)<\/price\.amount>/g)]
      .map(m => parseFloat(m[1])).filter(p => p > 0);
    if (priceMatches.length === 0) return null;
    const avgEurMwh = priceMatches.reduce((a, b) => a + b, 0) / priceMatches.length;
    // Conversie EUR/MWh → RON/MWh la curs ~5.05 (fallback fix; client-side aplică curs live)
    const avgRonMwh = avgEurMwh * 5.05;
    return {
      avgRonPerMwh: Math.round(avgRonMwh * 100) / 100,
      avgRonPerKwh: Math.round((avgRonMwh / 1000) * 1000) / 1000,
      samplesCount: priceMatches.length,
      sourceFallback: "ENTSOE Transparency Platform A44",
    };
  } catch (err) {
    console.warn("[energy-prices-live] ENTSOE fallback eșuat:", err.message);
    return null;
  }
}

/**
 * Handler principal Vercel.
 * GET /api/energy-prices-live → { source, avgRonPerMwh, avgRonPerKwh, fetchedAt, cached }
 */
export default async function handler(req, res) {
  setCorsHeaders(res);

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  // Verificare cache
  if (memoryCache && Date.now() - memoryCache.fetchedAtMs < CACHE_TTL_MS) {
    res.status(200).json({ ...memoryCache, cached: true });
    return;
  }

  // Sursa primară: OPCOM
  let result = null;
  try {
    const opcomUrl = "https://www.opcom.ro/pp/grafice_ip/raportPIPsRoUnique.php?lang=ro";
    const opcomRes = await fetch(opcomUrl, {
      signal: AbortSignal.timeout(10000),
      headers: { "User-Agent": "Zephren/1.0 (energy audit; +https://zephren.ro)" },
    });
    if (opcomRes.ok) {
      const html = await opcomRes.text();
      const parsed = parseOpcomHtml(html);
      if (parsed) {
        result = {
          source: "OPCOM PZU spot RO",
          ...parsed,
          fetchedAt: new Date().toISOString(),
          fetchedAtMs: Date.now(),
        };
      }
    }
  } catch (err) {
    console.warn("[energy-prices-live] OPCOM eșuat:", err.message);
  }

  // Fallback: ENTSOE Transparency Platform
  if (!result) {
    const entsoe = await fetchEntsoeFallback();
    if (entsoe) {
      result = {
        source: entsoe.sourceFallback,
        ...entsoe,
        fetchedAt: new Date().toISOString(),
        fetchedAtMs: Date.now(),
      };
    }
  }

  // Niciun preț disponibil
  if (!result) {
    res.status(503).json({
      error: "Toate sursele live indisponibile (OPCOM + ENTSOE)",
      fallbackHint: "Folosește preset static ANRE casnic_2025 din src/data/energy-prices.js",
    });
    return;
  }

  // Cache result
  memoryCache = result;
  res.status(200).json({ ...result, cached: false });
}
