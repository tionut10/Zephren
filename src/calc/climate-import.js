/**
 * Import date climatice externe — ERA5 / EnergyPlus TMY / CSV
 * Suportă: CSV manual, format EnergyPlus EPW (subset), format Open-Meteo JSON
 */

// ── parseClimateCSV ────────────────────────────────────────────────────────────
// Citire CSV simplu cu date lunare (temperatură medie, GHI, etc.)
// Format CSV așteptat: Lună,T_medie,T_min,T_max,GHI,RH,Vânt
// Acceptă și fișiere fără header (12 rânduri, prima coloană = nr. lună 1-12)
export function parseClimateCSV(csvText) {
  if (!csvText || typeof csvText !== "string") {
    return { error: "Text CSV invalid sau gol." };
  }

  const lines = csvText.trim().split(/\r?\n/).filter(l => l.trim());
  if (!lines.length) return { error: "Fișierul CSV este gol." };

  // Detectează headerul
  const firstLine = lines[0].toLowerCase();
  const hasHeader =
    firstLine.includes("luna") ||
    firstLine.includes("lun") ||
    firstLine.includes("month") ||
    firstLine.includes("t_medie") ||
    firstLine.includes("temp") ||
    firstLine.includes("ghi") ||
    isNaN(parseFloat(firstLine.split(/[,;\t]/)[1]));

  const dataLines = hasHeader ? lines.slice(1) : lines;

  if (dataLines.length < 12) {
    return { error: `CSV trebuie să conțină 12 rânduri de date lunare. Găsite: ${dataLines.length}` };
  }

  const result = {
    temp_month: [],
    temp_min: [],
    temp_max: [],
    GHI_month: [],
    RH_month: [],
    wind_month: [],
  };

  for (let i = 0; i < 12; i++) {
    const cols = dataLines[i].split(/[,;\t]/).map(c => c.trim().replace(",", "."));
    // Coloana 0 = luna (1-12), o ignorăm
    const startIdx = cols.length >= 7 ? 1 : 0;
    const t_med  = parseFloat(cols[startIdx + 0]);
    const t_min  = parseFloat(cols[startIdx + 1]);
    const t_max  = parseFloat(cols[startIdx + 2]);
    const ghi    = parseFloat(cols[startIdx + 3]);
    const rh     = parseFloat(cols[startIdx + 4]);
    const wind   = parseFloat(cols[startIdx + 5]);

    if (isNaN(t_med)) return { error: `Rândul ${i + 1}: temperatura medie lipsă sau invalidă.` };

    result.temp_month.push(parseFloat(t_med.toFixed(2)));
    result.temp_min.push(isNaN(t_min) ? t_med - 5 : parseFloat(t_min.toFixed(2)));
    result.temp_max.push(isNaN(t_max) ? t_med + 5 : parseFloat(t_max.toFixed(2)));
    result.GHI_month.push(isNaN(ghi) ? 0 : parseFloat(ghi.toFixed(1)));
    result.RH_month.push(isNaN(rh) ? 65 : Math.min(100, Math.max(0, parseFloat(rh.toFixed(1)))));
    result.wind_month.push(isNaN(wind) ? 3 : parseFloat(wind.toFixed(2)));
  }

  return result;
}

// ── parseEPW ──────────────────────────────────────────────────────────────────
// Parser minimal EPW (EnergyPlus Weather) — extrage medii lunare
// Returnează { temp_month:[12], GHI_month:[12], RH_month:[12], wind_month:[12], lat, lon, elevation, city }
export function parseEPW(epwText) {
  if (!epwText || typeof epwText !== "string") {
    return { error: "Fișierul EPW este gol sau invalid." };
  }

  const lines = epwText.split(/\r?\n/);
  if (lines.length < 10) {
    return { error: "Fișierul EPW prea scurt — format invalid." };
  }

  // Linia 1: LOCATION
  const loc = lines[0].split(",");
  const city      = loc[1]?.trim() || "Necunoscut";
  const lat       = parseFloat(loc[6]) || null;
  const lon       = parseFloat(loc[7]) || null;
  const elevation = parseFloat(loc[9]) || null;

  // Liniile 1-7 = metadata (LOCATION, DESIGN CONDITIONS, TYPICAL/EXTREME PERIODS, etc.)
  // Datele orare încep după linia „DATA PERIODS" (de obicei linia 8, index 7)
  let dataStart = -1;
  for (let i = 0; i < Math.min(20, lines.length); i++) {
    if (lines[i].toUpperCase().startsWith("DATA PERIODS")) {
      dataStart = i + 1;
      break;
    }
  }
  if (dataStart < 0) {
    // Încearcă fallback: caută prima linie cu >20 câmpuri numerice
    for (let i = 8; i < Math.min(30, lines.length); i++) {
      const cols = lines[i].split(",");
      if (cols.length >= 30 && !isNaN(parseFloat(cols[0]))) {
        dataStart = i;
        break;
      }
    }
  }
  if (dataStart < 0) {
    return { error: "Nu s-a putut localiza secțiunea de date orare în fișierul EPW." };
  }

  // Acumulatori pe luni (0-indexed)
  const monthAccum = Array.from({ length: 12 }, () => ({
    temp: [], rh: [], ghi: [], wind: [],
  }));

  const hourlyLines = lines.slice(dataStart).filter(l => l.trim());
  const EXPECTED_HOURS = 8760;

  for (const line of hourlyLines.slice(0, EXPECTED_HOURS)) {
    const c = line.split(",");
    if (c.length < 22) continue;

    const month    = parseInt(c[1]) - 1; // 1-12 → 0-11
    const dryBulb  = parseFloat(c[6]);   // °C
    const dewPoint = parseFloat(c[7]);   // °C
    const rh       = parseFloat(c[8]);   // %
    const ghi      = parseFloat(c[14]);  // Wh/m² — Global Horizontal Radiation
    const wind     = parseFloat(c[21]);  // m/s

    if (month < 0 || month > 11) continue;
    if (!isNaN(dryBulb))  monthAccum[month].temp.push(dryBulb);
    if (!isNaN(rh))       monthAccum[month].rh.push(rh);
    if (!isNaN(ghi))      monthAccum[month].ghi.push(ghi);
    if (!isNaN(wind))     monthAccum[month].wind.push(wind);
  }

  const avg = arr => arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;

  const DAYS_PER_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  const temp_month = monthAccum.map(m => parseFloat(avg(m.temp).toFixed(2)));
  const RH_month   = monthAccum.map(m => parseFloat(avg(m.rh).toFixed(1)));
  const wind_month = monthAccum.map(m => parseFloat(avg(m.wind).toFixed(2)));
  // GHI din EPW este în Wh/m² per oră → sumăm și convertim în kWh/m²/lună
  const GHI_month  = monthAccum.map((m, i) =>
    parseFloat((avg(m.ghi) * DAYS_PER_MONTH[i] * 24 / 1000).toFixed(1))
  );

  return { temp_month, GHI_month, RH_month, wind_month, lat, lon, elevation, city };
}

// ── fetchOpenMeteo ─────────────────────────────────────────────────────────────
// Import de la Open-Meteo API (gratuit, fără key, date ERA5-based)
// URL: https://archive-api.open-meteo.com/v1/archive
export async function fetchOpenMeteo(lat, lon, year = 2023) {
  if (lat == null || lon == null) {
    throw new Error("Coordonatele lat/lon sunt necesare pentru Open-Meteo.");
  }

  const startDate = `${year}-01-01`;
  const endDate   = `${year}-12-31`;

  const baseParams = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    start_date: startDate,
    end_date: endDate,
    timezone: "Europe/Bucharest",
  });
  // Open-Meteo cere virgule literale în URL (nu %2C, nu parametri repetiți)
  const monthlyVars = [
    "temperature_2m_mean",
    "temperature_2m_min",
    "temperature_2m_max",
    "precipitation_sum",
    "shortwave_radiation_sum",
    "relative_humidity_2m_mean",
    "wind_speed_10m_mean",
  ].join(",");

  const url = `https://archive-api.open-meteo.com/v1/archive?${baseParams.toString()}&monthly=${monthlyVars}`;

  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Open-Meteo API error ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = await res.json();
  if (data.error) {
    throw new Error(`Open-Meteo: ${data.reason || JSON.stringify(data)}`);
  }

  return data;
}

// ── openMeteoToClimateData ─────────────────────────────────────────────────────
// Convertește datele Open-Meteo în formatul intern Zephren (temp_month, GHI_month, etc.)
// Returnează un obiect compatibil cu validateClimateData
export function openMeteoToClimateData(openMeteoResponse) {
  if (!openMeteoResponse || !openMeteoResponse.monthly) {
    return { error: "Răspuns Open-Meteo invalid sau lipsă câmp 'monthly'." };
  }

  const m = openMeteoResponse.monthly;

  const get = (key) => {
    const arr = m[key];
    return Array.isArray(arr) ? arr.map(v => (v == null ? null : parseFloat(v.toFixed(2)))) : null;
  };

  const temp_month = get("temperature_2m_mean");
  const temp_min   = get("temperature_2m_min");
  const temp_max   = get("temperature_2m_max");
  const RH_month   = get("relative_humidity_2m_mean");
  const wind_month = get("wind_speed_10m_mean");

  // shortwave_radiation_sum este în MJ/m²/lună → convertim în kWh/m²/lună (÷ 3.6)
  const swRad = get("shortwave_radiation_sum");
  const GHI_month = swRad
    ? swRad.map(v => (v != null ? parseFloat((v / 3.6).toFixed(1)) : null))
    : null;

  const result = {
    temp_month:  temp_month || [],
    temp_min:    temp_min   || [],
    temp_max:    temp_max   || [],
    GHI_month:   GHI_month  || [],
    RH_month:    RH_month   || [],
    wind_month:  wind_month || [],
    // metadate suplimentare
    source: "Open-Meteo ERA5",
    year: openMeteoResponse.latitude
      ? null
      : null,
    lat: openMeteoResponse.latitude,
    lon: openMeteoResponse.longitude,
    elevation: openMeteoResponse.elevation,
  };

  return result;
}

// ── validateClimateData ────────────────────────────────────────────────────────
// Validare date climatice importate
// Returnează { valid, errors, warnings }
export function validateClimateData(data) {
  const errors = [];
  const warnings = [];

  if (!data || typeof data !== "object") {
    return { valid: false, errors: ["Date climatice invalide (null sau non-obiect)."], warnings };
  }

  if (data.error) {
    return { valid: false, errors: [data.error], warnings };
  }

  const REQUIRED_FIELDS = ["temp_month"];
  const OPTIONAL_FIELDS = ["GHI_month", "RH_month", "wind_month", "temp_min", "temp_max"];

  // Verifică câmpuri obligatorii
  for (const field of REQUIRED_FIELDS) {
    if (!Array.isArray(data[field])) {
      errors.push(`Câmpul obligatoriu '${field}' lipsește sau nu este un array.`);
    } else if (data[field].length !== 12) {
      errors.push(`Câmpul '${field}' trebuie să aibă exact 12 valori (are ${data[field].length}).`);
    } else {
      const nullCount = data[field].filter(v => v == null || isNaN(v)).length;
      if (nullCount > 0) errors.push(`Câmpul '${field}' conține ${nullCount} valori lipsă (null/NaN).`);
    }
  }

  // Verifică câmpuri opționale (doar avertismente dacă lipsesc)
  for (const field of OPTIONAL_FIELDS) {
    if (!Array.isArray(data[field]) || data[field].length !== 12) {
      warnings.push(`Câmpul opțional '${field}' lipsește sau incomplet — se vor folosi valori implicite.`);
    } else {
      const nullCount = data[field].filter(v => v == null || isNaN(v)).length;
      if (nullCount > 0) warnings.push(`Câmpul '${field}' conține ${nullCount} valori null.`);
    }
  }

  // Verifică plausibilitate temperaturi
  if (Array.isArray(data.temp_month) && data.temp_month.length === 12) {
    const temps = data.temp_month.filter(v => v != null && !isNaN(v));
    const tMin = Math.min(...temps);
    const tMax = Math.max(...temps);
    if (tMin < -50 || tMax > 60) {
      warnings.push(`Temperaturi aparent eronate: min=${tMin}°C, max=${tMax}°C. Verificați unitatea (trebuie °C).`);
    }
    if (tMax - tMin < 5) {
      warnings.push("Variația anuală de temperatură pare neobișnuit de mică (< 5°C). Verificați datele.");
    }
  }

  // Verifică GHI
  if (Array.isArray(data.GHI_month) && data.GHI_month.length === 12) {
    const ghiMax = Math.max(...data.GHI_month.filter(v => v != null && !isNaN(v)));
    if (ghiMax > 300) {
      warnings.push(`GHI max lunar (${ghiMax}) pare mare — verificați că valorile sunt în kWh/m²/lună, nu Wh/m²/zi.`);
    }
  }

  // Verifică RH
  if (Array.isArray(data.RH_month) && data.RH_month.length === 12) {
    const rhVals = data.RH_month.filter(v => v != null && !isNaN(v));
    if (rhVals.some(v => v < 0 || v > 100)) {
      errors.push("Umiditate relativă (RH) conține valori în afara intervalului [0, 100]%.");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
