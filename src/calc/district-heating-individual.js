// ═══════════════════════════════════════════════════════════════
// TERMOFICARE — Contorizare individuală per apartament din Gcal comun
// Pct. 68 — Conf. HG 393/2023 + ANRE Metodologie + EN 834 repartitoare
// ═══════════════════════════════════════════════════════════════

// Factori de energie primară termoficare [kWh EP / kWh final]
// Sursa: ANRE + Mc 001-2022 Tabel 4.1 + date operatori 2024-2025
export const DISTRICT_HEATING_FP = {
  'București':       1.12,  // Termoenergetica / RADET — CHP + centrale
  'Cluj-Napoca':     1.08,  // Energoterm / Thermo Cluj — centrale pe gaz
  'Iași':            1.15,  // CET Iași — turbine abur vechi + cogenerare
  'Constanța':       1.10,  // Confort Urban
  'Oradea':          1.05,  // OTL / GreenHeat — biomasa modernizată
  'Craiova':         1.13,  // SCE Craiova
  'Brașov':          1.09,  // Rial Confort
  'Galați':          1.14,  // Calorgal — CET Galați
  'Ploiești':        1.11,  // Veolia Ploiești
  'Brăila':          1.12,  // CET Brăila
  'Timișoara':       1.07,  // COLTERM (restructurare în curs)
  'Bacău':           1.10,  // CET Bacău
  'Pitești':         1.09,  // Termoficare SA Pitești
  'Târgu Mureș':     1.08,  // Energomur
  'Sibiu':           1.06,  // Telmex — rețea modernizată
};

// Factori de corecție poziție apartament — conform HG 393/2023
// Reflectă pierderi suplimentare prin suprafețe expuse la exterior/neîncălzit
export const POSITION_CORRECTION_FACTORS = {
  middle:         1.00,   // apartament interior (etaj curent, interior bloc)
  corner:         1.15,   // colț (2 fațade expuse)
  basement:       1.20,   // subsol / parter cu subsol neîncălzit dedesubt
  attic:          1.25,   // mansardă / ultimul etaj cu pod neîncălzit
  attic_corner:   1.32,   // mansardă + colț
  ground_corner:  1.22,   // parter colț
  ground:         1.12,   // parter (fără subsol sau subsol neîncălzit)
};

const POSITION_LABELS = {
  middle:         'Etaj curent, interior',
  corner:         'Etaj curent, colț',
  basement:       'Parter / subsol',
  attic:          'Ultimul etaj, interior',
  attic_corner:   'Ultimul etaj, colț',
  ground_corner:  'Parter, colț',
  ground:         'Parter, interior',
};

/**
 * Calculează ponderea din Gcal-ul comun al blocului per apartament.
 * Suportă 3 metode de calcul.
 *
 * @param {Array} apartments - [{
 *   id, area_m2, persons, floor, exposedFaces,
 *   position: 'middle'|'corner'|'basement'|'attic'|...,
 *   repartitor_units (opțional — EN 834)
 * }]
 * @param {number} totalGcal_year   - consum total bloc [Gcal/an]
 * @param {string} method           - 'area' | 'area_corrected' | 'en834'
 * @returns {{
 *   apartments: Array,    // fiecare cu share, gcal, ep
 *   method,
 *   totalGcal: number,
 *   totalArea: number,
 *   notes: string[]
 * }}
 */
export function calcDistrictHeatingShare(apartments, totalGcal_year = 0, method = 'area_corrected') {
  if (!apartments || apartments.length === 0) return { apartments: [], method, totalGcal: 0, totalArea: 0, notes: [] };

  const totalArea = apartments.reduce((s, a) => s + (parseFloat(a.area_m2) || 0), 0);
  const notes     = [];
  let result;

  // ── Metoda 1: Proporțional arie (simplă)
  if (method === 'area') {
    notes.push('Metodă: proporțional suprafață utilă — conform Legea 325/2006 Art. 10 (variantă simplificată)');
    result = apartments.map(apt => {
      const area   = parseFloat(apt.area_m2) || 0;
      const share  = totalArea > 0 ? area / totalArea : 0;
      const gcal   = totalGcal_year * share;
      return { ...apt, share: Math.round(share * 10000) / 100, gcal: Math.round(gcal * 100) / 100, method: 'area' };
    });
  }

  // ── Metoda 2: Proporțional arie cu corecție poziție (HG 393/2023)
  else if (method === 'area_corrected') {
    notes.push('Metodă: proporțional arie corectat poziție — conform HG 393/2023 + Metodologie ANRE');
    notes.push('Factori poziție aplicați: colț ×1.15, subsol ×1.20, mansardă ×1.25');

    // Calculăm "arie echivalentă termică" pentru fiecare apartament
    const thermalAreas = apartments.map(apt => {
      const area     = parseFloat(apt.area_m2) || 0;
      const posKey   = apt.position || (apt.exposedFaces >= 2 ? 'corner' : 'middle');
      const corrFactor = POSITION_CORRECTION_FACTORS[posKey] || 1.0;
      return { area, corrFactor, thermalArea: area * corrFactor };
    });
    const totalThermalArea = thermalAreas.reduce((s, a) => s + a.thermalArea, 0);

    result = apartments.map((apt, i) => {
      const { thermalArea, corrFactor } = thermalAreas[i];
      const share = totalThermalArea > 0 ? thermalArea / totalThermalArea : 0;
      const gcal  = totalGcal_year * share;
      return {
        ...apt,
        positionLabel: POSITION_LABELS[apt.position] || apt.position || 'Nespecificat',
        positionFactor: corrFactor,
        thermalArea: Math.round(thermalArea * 10) / 10,
        share: Math.round(share * 10000) / 100,
        gcal: Math.round(gcal * 100) / 100,
        method: 'area_corrected',
      };
    });
  }

  // ── Metoda 3: EN 834 — repartitoare de căldură
  else if (method === 'en834') {
    notes.push('Metodă: EN 834 — repartitoare de căldură individuale');
    notes.push('Unități repartitor reflectă consumul măsurat la fiecare corp de încălzire');
    notes.push('Costuri comune (pierderi rețea, pierderi orizontale) se împart proporțional pe suprafață');

    const totalUnits     = apartments.reduce((s, a) => s + (parseFloat(a.repartitor_units) || 0), 0);
    // Costuri comune = 30% din total (pierderi rețea + comune) — valoare tipică EN 834
    const commonSharePct = 0.30;
    const measuredPct    = 1 - commonSharePct;

    result = apartments.map(apt => {
      const area  = parseFloat(apt.area_m2) || 0;
      const units = parseFloat(apt.repartitor_units) || 0;

      // Cota parte din costurile comune (proporțional arie)
      const commonShare    = totalArea > 0 ? area / totalArea * commonSharePct : 0;
      // Cota parte din costurile măsurate (proporțional unități repartitor)
      const measuredShare  = totalUnits > 0 ? units / totalUnits * measuredPct : 0;
      const totalShare     = commonShare + measuredShare;
      const gcal           = totalGcal_year * totalShare;

      return {
        ...apt,
        repartitor_units: units,
        commonShare:   Math.round(commonShare  * 10000) / 100,
        measuredShare: Math.round(measuredShare * 10000) / 100,
        share:         Math.round(totalShare   * 10000) / 100,
        gcal:          Math.round(gcal * 100) / 100,
        method: 'en834',
      };
    });
  } else {
    notes.push(`Metodă necunoscută: ${method} — fallback la 'area_corrected'`);
    return calcDistrictHeatingShare(apartments, totalGcal_year, 'area_corrected');
  }

  // Adăugăm EP și qf la fiecare apartament
  result = result.map(apt => {
    const area = parseFloat(apt.area_m2) || 0;
    if (apt.gcal && area > 0) {
      const ep = convertGcalToEP(apt.gcal, area);
      return { ...apt, ...ep };
    }
    return apt;
  });

  return {
    apartments: result,
    method,
    totalGcal: totalGcal_year,
    totalArea: Math.round(totalArea * 10) / 10,
    notes,
  };
}

/**
 * Convertește Gcal/an în kWh energie primară per m².
 * @param {number} gcal_per_year  - consum termoficare [Gcal/an]
 * @param {number} area_m2        - suprafața utilă apartament [m²]
 * @param {number} fp_district    - factor energie primară rețea termoficare [-]
 * @param {string} city           - oraș (pentru lookup automat fp dacă nu e furnizat)
 * @returns {{ ep_kWh_m2, qf_kWh_m2, gcal_m2, ep_total_kWh, qf_total_kWh }}
 */
export function convertGcalToEP(gcal_per_year, area_m2, fp_district = null, city = null) {
  // 1 Gcal = 1163 kWh (1 kcal = 4186 J → 1 Gcal = 10⁶ kcal × 4186 = 4.186×10⁹ J = 1162.78 kWh)
  const GCAL_TO_KWH = 1163;

  // Factor energie primară
  let fp = fp_district;
  if (!fp && city) {
    fp = DISTRICT_HEATING_FP[city] || 1.10;
  }
  fp = fp || 1.10; // default dacă nimic specificat

  const qf_total_kWh = gcal_per_year * GCAL_TO_KWH;
  const ep_total_kWh = qf_total_kWh * fp;

  const au = parseFloat(area_m2) || 1;
  const qf_kWh_m2 = Math.round(qf_total_kWh / au * 10) / 10;
  const ep_kWh_m2 = Math.round(ep_total_kWh / au * 10) / 10;
  const gcal_m2   = Math.round(gcal_per_year / au * 1000) / 1000;

  return {
    ep_kWh_m2,
    qf_kWh_m2,
    gcal_m2,
    ep_total_kWh: Math.round(ep_total_kWh),
    qf_total_kWh: Math.round(qf_total_kWh),
    fp_used: fp,
  };
}

/**
 * Returnează factorul de energie primară pentru un oraș dat.
 * @param {string} city
 * @returns {{ fp, city, source }}
 */
export function getDistrictFP(city) {
  const fp = DISTRICT_HEATING_FP[city];
  if (fp) {
    return { fp, city, source: 'ANRE / Mc 001-2022 date operator local' };
  }
  return { fp: 1.10, city, source: 'Valoare implicită (lipsesc date operator)' };
}

/**
 * Estimează consumul de Gcal pe baza EP cunoscut și suprafeței.
 * Util când se știe EP din certificat și vrei conversia inversă.
 * @param {number} ep_kWh_m2 - energie primară [kWh/(m²·an)]
 * @param {number} area_m2
 * @param {number} fp
 * @returns {{ gcal_per_year, qf_kWh_m2, qf_total_kWh }}
 */
export function convertEPtoGcal(ep_kWh_m2, area_m2, fp = 1.10) {
  const GCAL_TO_KWH = 1163;
  const au           = parseFloat(area_m2) || 1;
  const ep_total     = ep_kWh_m2 * au;
  const qf_total_kWh = ep_total / fp;
  const gcal_per_year = qf_total_kWh / GCAL_TO_KWH;

  return {
    gcal_per_year: Math.round(gcal_per_year * 100) / 100,
    qf_kWh_m2: Math.round(qf_total_kWh / au * 10) / 10,
    qf_total_kWh: Math.round(qf_total_kWh),
  };
}
