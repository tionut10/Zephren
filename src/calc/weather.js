/**
 * weather.js — Date meteorologice orare pentru calcul orar ISO 52016 §6.5
 *
 * Două moduri:
 *  (A) `generateTMY` — TMY SINTETIC din medii lunare (legacy, quick).
 *      Sinusoidă simplificată, potrivită pentru metoda lunară.
 *
 *  (B) `loadTMYFromData` — TMY ORAR REAL (Sprint 20) din fișier OMTCT 2210/2013
 *      (Ordinul Ministerului Transporturilor + NA ISO 52010-1) sau EPW standard.
 *      Se folosește pentru calcul orar precis — bilanț dinamic, free-cooling,
 *      night ventilation, PV producție orară.
 */

const MONTH_DAYS = [31,28,31,30,31,30,31,31,30,31,30,31];

export function generateTMY(tempMonth, lat) {
  if (!tempMonth || tempMonth.length < 12) return null;
  const totalHours = 8760;
  const T_ext = new Array(totalHours);
  const Q_sol_horiz = new Array(totalHours);
  const absLat = Math.abs(lat || 45);
  const solarDecl = 23.45 * Math.PI / 180;

  let h = 0;
  for (let m = 0; m < 12; m++) {
    const days = MONTH_DAYS[m];
    const tAvg = tempMonth[m];
    const dailyAmp = 4 + 2 * Math.cos((m - 6) * Math.PI / 6);
    const dayOfYear = MONTH_DAYS.slice(0, m).reduce((s, d) => s + d, 0) + days / 2;
    const decl = solarDecl * Math.sin(2 * Math.PI * (284 + dayOfYear) / 365);
    const latRad = absLat * Math.PI / 180;
    const maxAlt = Math.PI / 2 - latRad + decl;
    const peakIrr = Math.max(0, 1000 * Math.sin(maxAlt) * 0.7);

    for (let d = 0; d < days; d++) {
      for (let hr = 0; hr < 24; hr++) {
        T_ext[h] = tAvg + dailyAmp * Math.cos((hr - 15) * Math.PI / 12);
        const hourAngle = (hr - 12) * Math.PI / 12;
        const sinAlt = Math.max(0, Math.sin(maxAlt) * Math.cos(hourAngle));
        Q_sol_horiz[h] = sinAlt > 0.05 ? peakIrr * sinAlt * 0.001 : 0;
        h++;
      }
    }
  }
  return { T_ext, Q_sol_horiz, source: "synthetic", method: "sinusoidal-fallback" };
}

/**
 * Încarcă TMY din date orare reale conform Ordinului OMTCT 2210/2013 (RO)
 * sau format EPW (EnergyPlus Weather) standard internațional.
 *
 * Structura OMTCT 2210/2013:
 *   Fișier CSV/TSV cu 8760 rânduri × coloane:
 *   {month, day, hour, T_db, T_dp, RH, G_h, G_b, G_d, wind_dir, wind_speed, ...}
 *
 * @param {Array<object>|string} input — array de obiecte orare SAU string CSV
 * @returns {{T_ext, Q_sol_horiz, Q_sol_direct, Q_sol_diffuse, RH, windSpeed, source, method}|null}
 */
export function loadTMYFromData(input) {
  if (!input) return null;
  let rows;
  if (typeof input === "string") {
    const lines = input.split(/\r?\n/).filter(l => l.trim() && !l.startsWith("#"));
    if (lines.length < 8760) return null;
    const header = lines[0].split(/[,;\t]/).map(s => s.trim().toLowerCase());
    rows = lines.slice(1, 8761).map(line => {
      const parts = line.split(/[,;\t]/);
      const obj = {};
      header.forEach((h, i) => obj[h] = parseFloat(parts[i]));
      return obj;
    });
  } else if (Array.isArray(input)) {
    rows = input.slice(0, 8760);
  } else return null;

  if (rows.length < 8760) return null;

  const T_ext = new Array(8760);
  const Q_sol_horiz = new Array(8760);
  const Q_sol_direct = new Array(8760);
  const Q_sol_diffuse = new Array(8760);
  const RH = new Array(8760);
  const windSpeed = new Array(8760);

  for (let h = 0; h < 8760; h++) {
    const r = rows[h];
    T_ext[h] = Number.isFinite(r.t_db) ? r.t_db
             : Number.isFinite(r.temperature) ? r.temperature
             : Number.isFinite(r.t) ? r.t : 0;
    // Radiație (kW/m²). Format OMTCT: W/m² → împărțim la 1000
    const Gh = Number.isFinite(r.g_h) ? r.g_h : Number.isFinite(r.ghi) ? r.ghi : 0;
    const Gb = Number.isFinite(r.g_b) ? r.g_b : Number.isFinite(r.dni) ? r.dni : 0;
    const Gd = Number.isFinite(r.g_d) ? r.g_d : Number.isFinite(r.dhi) ? r.dhi : 0;
    Q_sol_horiz[h]   = Gh / 1000;
    Q_sol_direct[h]  = Gb / 1000;
    Q_sol_diffuse[h] = Gd / 1000;
    RH[h] = Number.isFinite(r.rh) ? r.rh : Number.isFinite(r.humidity) ? r.humidity : 50;
    windSpeed[h] = Number.isFinite(r.wind_speed) ? r.wind_speed : 0;
  }

  return {
    T_ext, Q_sol_horiz, Q_sol_direct, Q_sol_diffuse, RH, windSpeed,
    source: "omtct-2210-2013",
    method: "hourly-real-tmy",
    hoursCount: 8760,
  };
}
