/**
 * api/anre-tariff-scrape.js — Sprint P2 (6 mai 2026)
 *
 * Endpoint serverless — scrape ANRE comparator tarife reglementate gaz natural
 * casnic + electricitate pentru actualizare automată trimestrială a preset-ului
 * `casnic_2025` din src/data/energy-prices.js.
 *
 * STATUS: DEFERRED — Vercel Hobby plan e la limit. Activare la upgrade Pro.
 *
 * Flux planificat:
 *   1. Vercel cron job (1x/lună): apelează acest endpoint
 *   2. Compară valorile ANRE cu preset static actual din DB Supabase
 *   3. Dacă deltă > 5%: trimite notificare email + creează GitHub PR cu update
 *      la `src/data/energy-prices.js` casnic_<YYYY>
 *
 * Surse:
 *   - ANRE comparator gaze: https://www.anre.ro/gaze-naturale/comparator-tarife
 *   - ANRE comparator electricitate: https://www.anre.ro/comparator-energie-electrica
 *   - Cache 7 zile (date reglementate sunt stabile)
 */

let memoryCache = null;
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 zile

function setCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Cache-Control", "public, s-maxage=604800, stale-while-revalidate=1209600");
}

/**
 * Parser HTML ANRE — extrage tarif reglementat mediu casnic.
 * Pattern căutat: tarif activ + cota TVA inclusă + transport + distribuție.
 *
 * IMPORTANT la activare:
 *   1. Verifică structura HTML curentă (poate să se schimbe)
 *   2. ANRE folosește JavaScript dynamic loading în unele cazuri →
 *      necesită Puppeteer pentru pagini SPA (mai costisitor)
 *   3. Verifică ToS ANRE — scraping permis pentru date publice reglementate
 */
function parseAnreGazTariff(html) {
  // Pattern simplu: caută „tarif reglementat" + valoare RON/MWh sau RON/kWh
  const patterns = [
    /tarif\s+reglementat[^<]*?(\d+[.,]\d{1,2})\s*(?:lei|RON)\/(?:kWh|MWh)/i,
    /pre[țt]\s+gaz\s+casnic[^<]*?(\d+[.,]\d{1,2})/i,
  ];
  for (const p of patterns) {
    const m = p.exec(html);
    if (m) {
      const val = parseFloat(m[1].replace(",", "."));
      if (val > 0.05 && val < 5) return val; // RON/kWh range plauzibil
      if (val > 50 && val < 5000) return val / 1000; // RON/MWh → RON/kWh
    }
  }
  return null;
}

function parseAnreElectricityTariff(html) {
  const patterns = [
    /tarif\s+reglementat[^<]*?(\d+[.,]\d{1,2})\s*(?:lei|RON)\/kWh/i,
    /pre[țt]\s+electricitate\s+casnic[^<]*?(\d+[.,]\d{1,2})/i,
    /serviciu\s+universal[^<]*?(\d+[.,]\d{1,2})/i,
  ];
  for (const p of patterns) {
    const m = p.exec(html);
    if (m) {
      const val = parseFloat(m[1].replace(",", "."));
      if (val > 0.5 && val < 3) return val;
    }
  }
  return null;
}

export default async function handler(req, res) {
  setCorsHeaders(res);

  if (req.method === "OPTIONS") { res.status(204).end(); return; }
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  // Cache check
  if (memoryCache && Date.now() - memoryCache.fetchedAtMs < CACHE_TTL_MS) {
    res.status(200).json({ ...memoryCache, cached: true });
    return;
  }

  const userAgent = "Zephren/1.0 (energy audit; +https://zephren.ro)";
  const result = {
    fetchedAt: new Date().toISOString(),
    fetchedAtMs: Date.now(),
    source: "ANRE Romania (scrape comparator tarife)",
    prices: {},
    errors: [],
  };

  // GAZ
  try {
    const r = await fetch("https://www.anre.ro/gaze-naturale/comparator-tarife", {
      signal: AbortSignal.timeout(10000),
      headers: { "User-Agent": userAgent },
    });
    if (r.ok) {
      const html = await r.text();
      const gazPrice = parseAnreGazTariff(html);
      if (gazPrice) result.prices.gaz = gazPrice;
      else result.errors.push("Gaz: parser nu a găsit pattern");
    } else result.errors.push(`Gaz: HTTP ${r.status}`);
  } catch (err) {
    result.errors.push(`Gaz: ${err.message}`);
  }

  // ELECTRICITATE
  try {
    const r = await fetch("https://www.anre.ro/comparator-energie-electrica", {
      signal: AbortSignal.timeout(10000),
      headers: { "User-Agent": userAgent },
    });
    if (r.ok) {
      const html = await r.text();
      const elPrice = parseAnreElectricityTariff(html);
      if (elPrice) result.prices.electricitate = elPrice;
      else result.errors.push("Electricitate: parser nu a găsit pattern");
    } else result.errors.push(`Electricitate: HTTP ${r.status}`);
  } catch (err) {
    result.errors.push(`Electricitate: ${err.message}`);
  }

  // Validare succes parțial vs eșec total
  if (Object.keys(result.prices).length === 0) {
    res.status(503).json({
      error: "Scrape ANRE eșuat pentru toate combustibilii",
      details: result.errors,
      fallbackHint: "Folosește preset static src/data/energy-prices.js casnic_2025",
    });
    return;
  }

  memoryCache = result;
  res.status(200).json({ ...result, cached: false });
}
