/**
 * external-apis.js — Integrări cu API-uri externe
 * Fiecare funcție încearcă API-ul real dacă e disponibil,
 * altfel returnează date simulate cu `_simulated: true`.
 *
 * API-uri reale (gratuite, fără cheie):
 *   - Open-Meteo ERA5 Archive  → fetchClimateAutomatic
 *   - PVGIS (EC JRC)           → fetchPVGISAutomatic
 *
 * API-uri stub (necesită acces special / nu există API public):
 *   - ANCPI Cadastru           → fetchCadastralData
 *   - ANRE Tarife energie      → fetchANRETariffs
 *   - MDLPA Registru CPE       → submitCPEtoMDLPA
 *   - Google Maps Solar API    → fetchSolarPotential
 */

// ── Constante ──────────────────────────────────────────────────────────────────

const ANRE_TARIFFS_HARDCODED = {
  electricity_ron_kwh: 0.92,   // tarif mediu reglementat 2024 (RON/kWh)
  gas_ron_kwh:         0.147,  // gaz natural, tarif distribuit 2024 (RON/kWh)
  gas_ron_mwh:         147.0,  // echivalent MWh
  district_heat_ron_gcal: 198, // termoficare medie națională 2024 (RON/Gcal)
  updated_date:        "2024-11-01",
  source:              "ANRE — tarife reglementate, actualizate manual",
  _simulated:          true,
};

// ── ANCPI Cadastru (pct. 27) ──────────────────────────────────────────────────
/**
 * Obține date cadastrale pentru un număr cadastral (CF).
 *
 * Implementare reală: proxy server-side la /api/ancpi-proxy
 * (evită CORS — ANCPI nu expune API public fără cheie)
 *
 * @param {string} nrCadastral — numărul cadastral (ex: "123456/București")
 * @returns {Promise<{
 *   address: string,
 *   area_mp: number,
 *   year_built: number|null,
 *   owner_type: string,
 *   parcel_id: string,
 *   _simulated: boolean
 * }>}
 */
export async function fetchCadastralData(nrCadastral) {
  if (!nrCadastral || typeof nrCadastral !== "string" || !nrCadastral.trim()) {
    throw new Error("Numărul cadastral este obligatoriu.");
  }

  // Încearcă proxy-ul server-side (disponibil în deployment Vercel)
  try {
    const res = await fetch("/api/ancpi-proxy", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ nrCadastral: nrCadastral.trim() }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data && !data.error) return data;
    }
  } catch {
    // Proxy indisponibil (dev local fără server) — continuă cu stub
  }

  // STUB — date simulate bazate pe hash simplu al numărului cadastral
  const hash = nrCadastral.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const areas = [45, 62, 78, 95, 110, 125, 148, 175, 210, 280];
  const years = [1965, 1972, 1980, 1985, 1990, 1995, 2000, 2005, 2010, 2015];
  const ownerTypes = ["Persoană fizică", "Persoană juridică", "Stat", "UAT"];
  const streets = [
    "Str. Mihai Eminescu", "Bd. Unirii", "Calea Victoriei",
    "Str. Libertății", "Bd. Regina Maria", "Str. Florilor",
  ];

  return {
    address:    `${streets[hash % streets.length]} nr. ${(hash % 99) + 1}`,
    area_mp:    areas[hash % areas.length],
    year_built: years[hash % years.length],
    owner_type: ownerTypes[hash % ownerTypes.length],
    parcel_id:  nrCadastral.trim(),
    county:     "Necunoscut",
    _simulated: true,
    _note:      "Date simulate — ANCPI nu are API public. Configurați cheia API în panoul de integrări.",
  };
}

// ── ANRE Tarife energie (pct. 28) ─────────────────────────────────────────────
/**
 * Obține tarifele de energie reglementate de ANRE.
 *
 * Implementare reală: scraping sau API viitor ANRE (indisponibil la data 2024).
 * Returnează ultimele tarife hardcodate cu flag `_simulated: true`.
 *
 * @returns {Promise<{
 *   electricity_ron_kwh: number,
 *   gas_ron_kwh: number,
 *   gas_ron_mwh: number,
 *   district_heat_ron_gcal: number,
 *   updated_date: string,
 *   _simulated: boolean
 * }>}
 */
export async function fetchANRETariffs() {
  // ANRE nu expune un API REST public — returnăm date hardcodate
  // Când ANRE va expune un API, înlocuiți blocul de mai jos
  /*
  try {
    const res = await fetch("https://www.anre.ro/api/tariffs"); // URL ipotetic
    if (res.ok) {
      const data = await res.json();
      return { ...data, _simulated: false };
    }
  } catch { }
  */

  return { ...ANRE_TARIFFS_HARDCODED };
}

// ── ERA5 / Open-Meteo automat din coordonate (pct. 29) ───────────────────────
/**
 * Obține date climatice ERA5-based din Open-Meteo Archive API (GRATUIT, fără cheie).
 * https://archive-api.open-meteo.com/v1/archive
 *
 * @param {number} lat   — latitudine (ex: 44.43)
 * @param {number} lon   — longitudine (ex: 26.10)
 * @param {string} [city] — denumire localitate (pentru metadate)
 * @param {number} [year] — an de referință (implicit: ultimul an complet)
 * @returns {Promise<{
 *   temp_month: number[],
 *   temp_min: number[],
 *   temp_max: number[],
 *   GHI_month: number[],
 *   RH_month: number[],
 *   wind_month: number[],
 *   lat: number, lon: number, elevation: number,
 *   source: string, year: number,
 *   _simulated: boolean
 * }>}
 */
export async function fetchClimateAutomatic(lat, lon, city = "", year) {
  if (lat == null || lon == null) {
    throw new Error("Coordonatele lat/lon sunt obligatorii pentru importul climatic automat.");
  }

  // Folosim ultimul an complet dacă nu e specificat
  const refYear = year ?? (new Date().getFullYear() - 1);
  const startDate = `${refYear}-01-01`;
  const endDate   = `${refYear}-12-31`;

  const params = new URLSearchParams({
    latitude:   String(lat),
    longitude:  String(lon),
    start_date: startDate,
    end_date:   endDate,
    timezone: "Europe/Bucharest",
  });
  for (const v of [
    "temperature_2m_mean",
    "temperature_2m_min",
    "temperature_2m_max",
    "shortwave_radiation_sum",
    "relative_humidity_2m_mean",
    "wind_speed_10m_mean",
    "precipitation_sum",
  ]) params.append("monthly", v);

  const url = `https://archive-api.open-meteo.com/v1/archive?${params.toString()}`;

  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Open-Meteo API error ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = await res.json();
  if (data.error) {
    throw new Error(`Open-Meteo: ${data.reason || JSON.stringify(data)}`);
  }

  const m = data.monthly || {};

  const get = (key) => {
    const arr = m[key];
    return Array.isArray(arr) ? arr.map(v => (v == null ? null : parseFloat(v.toFixed(2)))) : [];
  };

  // shortwave_radiation_sum: MJ/m²/lună → kWh/m²/lună (÷ 3.6)
  const swRad = get("shortwave_radiation_sum");
  const GHI_month = swRad.map(v => (v != null ? parseFloat((v / 3.6).toFixed(1)) : null));

  return {
    temp_month:  get("temperature_2m_mean"),
    temp_min:    get("temperature_2m_min"),
    temp_max:    get("temperature_2m_max"),
    GHI_month,
    RH_month:    get("relative_humidity_2m_mean"),
    wind_month:  get("wind_speed_10m_mean"),
    precip_month: get("precipitation_sum"),
    lat:          data.latitude,
    lon:          data.longitude,
    elevation:    data.elevation,
    city:         city || "",
    source:       "Open-Meteo ERA5 Archive (real)",
    year:         refYear,
    _simulated:   false,
  };
}

// ── PVGIS automat din coordonate (pct. 30) ───────────────────────────────────
/**
 * Calculează producția fotovoltaică via PVGIS API (European Commission JRC).
 * https://re.jrc.ec.europa.eu/api/v5_2/PVcalc
 * API GRATUIT — fără cheie necesară.
 *
 * @param {number} lat           — latitudine
 * @param {number} lon           — longitudine
 * @param {number} peakPower_kWp — putere instalată (kWp)
 * @param {number} systemLoss_pct — pierderi sistem (%, implicit 14)
 * @param {number} [tilt]        — unghi înclinare panouri (°, implicit 35)
 * @param {number} [azimuth]     — azimut (°, 0=S, -90=E, 90=V; implicit 0)
 * @returns {Promise<{
 *   annual_kWh: number,
 *   monthly_kWh: number[],
 *   optimal_tilt: number,
 *   optimal_azimuth: number,
 *   performance_ratio: number,
 *   specific_energy: number,
 *   _simulated: boolean
 * }>}
 */
export async function fetchPVGISAutomatic(
  lat,
  lon,
  peakPower_kWp = 1,
  systemLoss_pct = 14,
  tilt = 35,
  azimuth = 0,
) {
  if (lat == null || lon == null) {
    throw new Error("Coordonatele lat/lon sunt obligatorii pentru PVGIS.");
  }
  if (peakPower_kWp <= 0) {
    throw new Error("Puterea instalată trebuie să fie pozitivă (kWp).");
  }

  const params = new URLSearchParams({
    lat:          String(lat),
    lon:          String(lon),
    peakpower:    String(peakPower_kWp),
    loss:         String(systemLoss_pct),
    angle:        String(tilt),
    aspect:       String(azimuth),
    outputformat: "json",
    pvtechchoice: "crystSi",  // silicon cristalizat (standard)
    mountingplace: "building", // montat pe clădire
  });

  const url = `https://re.jrc.ec.europa.eu/api/v5_2/PVcalc?${params.toString()}`;

  let res;
  try {
    res = await fetch(url);
  } catch (err) {
    throw new Error(`PVGIS API inaccesibil: ${err.message}`);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`PVGIS API error ${res.status}: ${body.slice(0, 300)}`);
  }

  const data = await res.json();

  // Structura răspuns PVGIS v5.2
  const outputs = data.outputs || {};
  const totals  = outputs.totals?.fixed || {};
  const monthly = outputs.monthly?.fixed || [];

  const monthly_kWh = monthly.map(m => parseFloat((m.E_m || 0).toFixed(1)));
  const annual_kWh  = parseFloat((totals.E_y || 0).toFixed(1));
  const performance_ratio = parseFloat((totals.PR || 0).toFixed(3));
  const specific_energy   = peakPower_kWp > 0
    ? parseFloat((annual_kWh / peakPower_kWp).toFixed(1))
    : 0;

  // Unghi optim din meta (dacă există în răspuns)
  const meta = data.meta || {};
  const optimal_tilt    = meta.optimal_tilt    ?? tilt;
  const optimal_azimuth = meta.optimal_azimuth ?? azimuth;

  return {
    annual_kWh,
    monthly_kWh,
    optimal_tilt,
    optimal_azimuth,
    performance_ratio,
    specific_energy,
    lat,
    lon,
    peak_power_kwp:   peakPower_kWp,
    system_loss_pct:  systemLoss_pct,
    tilt,
    azimuth,
    source:    "PVGIS v5.2 (European Commission JRC)",
    _simulated: false,
  };
}

// ── MDLPA depunere CPE (pct. 31) ─────────────────────────────────────────────
/**
 * Simulează depunerea unui CPE la MDLPA Registru Național.
 *
 * STUB — registru.mdlpa.ro nu expune API public (depunere se face manual
 * prin portalul web sau la ghișeu).
 *
 * Returnează instrucțiuni pentru depunere manuală + formatul de date necesar.
 *
 * @param {object} cpeData — datele CPE (building, EP, CO2, clasă energetică etc.)
 * @returns {Promise<{
 *   success: boolean,
 *   instructions: string[],
 *   required_fields: string[],
 *   portal_url: string,
 *   _simulated: boolean
 * }>}
 */
export async function submitCPEtoMDLPA(cpeData) {
  // Validare minimă input
  const missing = [];
  if (!cpeData?.building?.address)    missing.push("adresa clădirii");
  if (!cpeData?.energyClass)          missing.push("clasa energetică (A–G)");
  if (cpeData?.EP_total == null)      missing.push("EP total (kWh/m²·an)");
  if (!cpeData?.auditor?.name)        missing.push("numele auditorului energetic");
  if (!cpeData?.auditor?.certificate) missing.push("nr. certificat auditor");

  return {
    success:     false,
    _simulated:  true,
    _note:       "MDLPA nu expune API public. Depunerea se face manual pe portalul web.",
    portal_url:  "https://registru.mdlpa.ro",
    guide_url:   "https://mdlpa.ro/pages/certificatenergetice",
    missing_data: missing,
    instructions: [
      "1. Accesați https://registru.mdlpa.ro și autentificați-vă cu contul de auditor.",
      "2. Selectați 'Adăugare certificat energetic nou'.",
      "3. Completați formularul cu datele clădirii și rezultatele auditului.",
      "4. Atașați PDF-ul CPE generat de Zephren (Export → CPE Complet).",
      "5. Semnați digital cu certificatul calificat al auditorului.",
      "6. Trimiteți și salvați numărul de înregistrare primit.",
    ],
    required_fields: [
      "adresa_completa", "judet", "localitate",
      "nr_cadastral", "an_constructie", "regim_inaltime",
      "suprafata_utila_mp", "destinatie_cladire",
      "EP_total_kwh_m2_an", "EP_incalzire", "EP_racire",
      "EP_apa_calda", "EP_iluminat", "EP_ventilatie",
      "CO2_kg_m2_an", "clasa_energetica",
      "auditor_nume", "auditor_nr_certificat", "auditor_valabilitate",
      "data_emitere_cpe", "valabilitate_cpe_ani",
    ],
    export_hint: "Folosiți Export → JSON (buton din bara de sus) pentru a obține datele în formatul necesar.",
  };
}

// ── Google Maps Solar API (pct. 34) ──────────────────────────────────────────
/**
 * Obține potențialul solar al acoperișului via Google Maps Solar API.
 * https://solar.googleapis.com/v1/buildingInsights:findClosest
 *
 * Necesită: VITE_GOOGLE_SOLAR_API_KEY în fișierul .env
 * Dacă variabila lipsește → returnează date simulate.
 *
 * @param {number} lat — latitudine
 * @param {number} lon — longitudine
 * @returns {Promise<{
 *   maxArrayPanelsCount: number,
 *   maxSunshineHoursPerYear: number,
 *   roofSegments: object[],
 *   carbonOffsetFactorKgPerMwh: number,
 *   _simulated: boolean
 * }>}
 */
export async function fetchSolarPotential(lat, lon) {
  if (lat == null || lon == null) {
    throw new Error("Coordonatele lat/lon sunt obligatorii pentru Solar API.");
  }

  // Sprint 20 (18 apr 2026) — Securitate:
  //   API key NU mai e citit client-side (expunere în bundle public).
  //   Orice variabilă VITE_* e publică (Vite inline în `dist/assets/*.js`).
  //   Varianta corectă: proxy server-side (`api/solar-proxy.js`), dar suntem la limita
  //   Hobby plan Vercel (12/12 funcții). Până la upgrade Pro, folosim exclusiv stubul.
  //   La upgrade plan:
  //     1. Creează `api/solar-proxy.js` cu `requireAuth` + `checkRateLimit` + `GOOGLE_SOLAR_API_KEY` (fără prefix VITE_)
  //     2. Înlocuiește stub-ul cu fetch către `/api/solar-proxy?lat=...&lon=...`.
  if (typeof import.meta !== "undefined" && import.meta.env?.VITE_GOOGLE_SOLAR_API_KEY) {
    console.warn(
      "[fetchSolarPotential] VITE_GOOGLE_SOLAR_API_KEY detectat în env client-side — " +
      "NU se folosește (securitate). Configurați proxy server-side după upgrade plan Vercel."
    );
  }
  return _solarStub(lat, lon);

  // eslint-disable-next-line no-unreachable
  const url =
    `https://solar.googleapis.com/v1/buildingInsights:findClosest` +
    `?location.latitude=${lat}&location.longitude=${lon}&key=EXPUNERE_BLOCATA`;

  let res;
  try {
    res = await fetch(url);
  } catch (err) {
    console.warn("[fetchSolarPotential] Rețea indisponibilă — returnez stub.", err.message);
    return _solarStub(lat, lon);
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    // 403 = key invalid/lipsă, 404 = clădire negăsită → fallback la stub
    if (res.status === 403 || res.status === 404) {
      console.warn(`[fetchSolarPotential] Google Solar API ${res.status} — fallback stub.`);
      return _solarStub(lat, lon);
    }
    throw new Error(`Google Solar API error ${res.status}: ${body?.error?.message || ""}`);
  }

  const data = await res.json();
  const si   = data.solarPotential || {};

  return {
    maxArrayPanelsCount:        si.maxArrayPanelsCount       ?? null,
    maxArrayAreaMeters2:        si.maxArrayAreaMeters2        ?? null,
    maxSunshineHoursPerYear:    si.maxSunshineHoursPerYear    ?? null,
    carbonOffsetFactorKgPerMwh: si.carbonOffsetFactorKgPerMwh ?? null,
    roofSegments:               si.roofSegmentStats           ?? [],
    panelCapacityWatts:         si.panelCapacityWatts         ?? 250,
    source:    "Google Maps Solar API (real)",
    _simulated: false,
  };
}

/** Date simulate Solar API (fallback când lipsește API key) */
function _solarStub(lat, lon) {
  // Estimare simplă bazată pe latitudine (România: 43–48°N)
  const sunshineBase = 1600 - (Math.abs(lat) - 43) * 30; // ~1480–1600 ore/an
  return {
    maxArrayPanelsCount:        20,
    maxArrayAreaMeters2:        33,
    maxSunshineHoursPerYear:    Math.round(sunshineBase),
    carbonOffsetFactorKgPerMwh: 450,
    roofSegments:               [],
    panelCapacityWatts:         400,
    source:    "Estimare locală (stub — configurați VITE_GOOGLE_SOLAR_API_KEY)",
    _simulated: true,
    _note:     "Adăugați VITE_GOOGLE_SOLAR_API_KEY în .env pentru date reale Google Solar.",
    lat,
    lon,
  };
}
