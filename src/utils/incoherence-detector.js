/**
 * incoherence-detector.js — Detector incoerențe valori CPE
 *
 * Audit 2 mai 2026 (sprint avansat post-MDLPA): detectează automat valori
 * suspecte / improbabile / fizic imposibile în datele introduse de auditor
 * pentru a preveni emiterea unui CPE cu greșeli grosolane.
 *
 * Categorii detectate:
 *   - Severitate ERROR  (blocant — generare DOCX nu trebuie permisă)
 *   - Severitate WARN   (suspect — auditorul confirmă conștient)
 *   - Severitate INFO   (informativ — sugerare verificare)
 *
 * Folosit din Step6Certificate.jsx înainte de export DOCX.
 */

const CURRENT_YEAR = new Date().getFullYear();

/**
 * Detectează incoerențe în datele clădirii + elemente.
 *
 * @param {object} args
 * @param {object} args.building — date generale clădire (Step 1)
 * @param {Array} args.opaqueElements — elemente opace (Step 2)
 * @param {Array} args.glazingElements — vitraje (Step 2)
 * @param {object} args.heating — sistem încălzire (Step 3)
 * @param {object} args.results — rezultate calc (Step 5)
 *
 * @returns {Array<{severity: 'error'|'warn'|'info', code: string, message: string, field: string}>}
 */
export function detectIncoherences({
  building = {},
  opaqueElements = [],
  glazingElements = [],
  heating = {},
  acm = {},
  results = {},
} = {}) {
  const issues = [];

  // ─── CLĂDIRE — date generale ───
  const yearBuilt = parseInt(building.yearBuilt) || 0;
  if (yearBuilt > CURRENT_YEAR) {
    issues.push({
      severity: "error",
      code: "YEAR_FUTURE",
      message: `Anul construirii ${yearBuilt} este în viitor (>${CURRENT_YEAR}). Verificați data.`,
      field: "yearBuilt",
    });
  } else if (yearBuilt > 0 && yearBuilt < 1800) {
    issues.push({
      severity: "warn",
      code: "YEAR_TOO_OLD",
      message: `Anul construirii ${yearBuilt} este suspect (<1800). Verificați data.`,
      field: "yearBuilt",
    });
  }

  const yearRenov = parseInt(building.yearRenov) || 0;
  if (yearRenov > 0 && yearRenov < yearBuilt) {
    issues.push({
      severity: "error",
      code: "RENOV_BEFORE_BUILT",
      message: `Anul renovării (${yearRenov}) este înainte de anul construirii (${yearBuilt}).`,
      field: "yearRenov",
    });
  }
  if (yearRenov > CURRENT_YEAR) {
    issues.push({
      severity: "error",
      code: "RENOV_FUTURE",
      message: `Anul renovării ${yearRenov} este în viitor (>${CURRENT_YEAR}).`,
      field: "yearRenov",
    });
  }

  const areaUseful = parseFloat(building.areaUseful) || 0;
  const volume = parseFloat(building.volume) || 0;
  const heightFloor = parseFloat(building.heightFloor) || 0;

  if (areaUseful > 0 && volume > 0) {
    const avgH = volume / areaUseful;
    if (avgH < 1.8) {
      issues.push({
        severity: "warn",
        code: "HEIGHT_TOO_LOW",
        message: `Înălțime medie cameră ${avgH.toFixed(2)} m este sub 1.8 m (sub-locuibil cf. NP 057-2002).`,
        field: "volume",
      });
    } else if (avgH > 4.5) {
      issues.push({
        severity: "warn",
        code: "HEIGHT_TOO_HIGH",
        message: `Înălțime medie cameră ${avgH.toFixed(2)} m peste 4.5 m (suspect pentru rezidențial).`,
        field: "volume",
      });
    }
  }

  if (heightFloor > 0 && (heightFloor < 2.0 || heightFloor > 5.0)) {
    issues.push({
      severity: "info",
      code: "FLOOR_HEIGHT_UNUSUAL",
      message: `Înălțime etaj ${heightFloor} m e neobișnuită (uzual 2.4–3.5 m).`,
      field: "heightFloor",
    });
  }

  // Categorie RA = apartament — verificare suprafață rezonabilă
  if (building.category === "RA" && areaUseful > 0) {
    if (areaUseful < 15) {
      issues.push({
        severity: "warn",
        code: "AREA_TOO_SMALL",
        message: `Apartament cu Au=${areaUseful} m² e sub 15 m² (improbabil).`,
        field: "areaUseful",
      });
    } else if (areaUseful > 250) {
      issues.push({
        severity: "info",
        code: "AREA_LARGE",
        message: `Apartament cu Au=${areaUseful} m² e mare (>250 m²). Verificați.`,
        field: "areaUseful",
      });
    }
  }

  // ─── ELEMENTE OPACE — U-values ───
  for (const el of opaqueElements) {
    const u = parseFloat(el.u || el.uValue || 0);
    const area = parseFloat(el.area || 0);
    if (u > 0 && u < 0.08) {
      issues.push({
        severity: "warn",
        code: "U_TOO_LOW",
        message: `Element "${el.name || el.type}" cu U=${u.toFixed(3)} W/(m²·K) e sub Passivhaus extrem (<0.08). Verificați compoziția.`,
        field: `opaqueElements`,
      });
    } else if (u > 5.0) {
      issues.push({
        severity: "warn",
        code: "U_TOO_HIGH",
        message: `Element "${el.name || el.type}" cu U=${u.toFixed(2)} W/(m²·K) e mare (>5.0). Posibilă greșeală.`,
        field: `opaqueElements`,
      });
    }
    if (area <= 0) {
      issues.push({
        severity: "error",
        code: "AREA_ZERO",
        message: `Element "${el.name || el.type}" are arie = 0 m². Eliminați sau setați aria reală.`,
        field: `opaqueElements`,
      });
    } else if (area > 5000) {
      issues.push({
        severity: "warn",
        code: "AREA_HUGE",
        message: `Element "${el.name || el.type}" cu aria ${area} m² e foarte mare (>5000). Verificați.`,
        field: `opaqueElements`,
      });
    }
  }

  // ─── VITRAJE — U-values + g-values ───
  for (const el of glazingElements) {
    const u = parseFloat(el.u || el.uValue || 0);
    const g = parseFloat(el.g || el.gValue || 0);
    if (u > 0 && u < 0.5) {
      issues.push({
        severity: "warn",
        code: "GLAZING_U_TOO_LOW",
        message: `Vitraj "${el.name || ""}" cu U=${u.toFixed(2)} e neobișnuit de mic (<0.5). Posibilă greșeală.`,
        field: `glazingElements`,
      });
    } else if (u > 6.0) {
      issues.push({
        severity: "warn",
        code: "GLAZING_U_TOO_HIGH",
        message: `Vitraj "${el.name || ""}" cu U=${u.toFixed(2)} e foarte mare (>6.0).`,
        field: `glazingElements`,
      });
    }
    if (g > 0 && (g < 0.05 || g > 0.95)) {
      issues.push({
        severity: "info",
        code: "GLAZING_G_UNUSUAL",
        message: `Vitraj "${el.name || ""}" cu g=${g.toFixed(2)} e neobișnuit (uzual 0.30–0.85).`,
        field: `glazingElements`,
      });
    }
  }

  // ─── REZULTATE — RER + clase ───
  const rer = parseFloat(results.rer || results.RER || 0);
  if (rer > 100) {
    issues.push({
      severity: "error",
      code: "RER_OVER_100",
      message: `RER = ${rer.toFixed(1)}% e peste 100% (eroare în calc — surse regenerabile mai mari decât consum).`,
      field: "results.rer",
    });
  }

  const epReal = parseFloat(results.epReal || results.ep_real || 0);
  if (epReal > 0 && epReal < 5) {
    issues.push({
      severity: "warn",
      code: "EP_TOO_LOW",
      message: `EP_real = ${epReal.toFixed(1)} kWh/m²·an e suspect de mic (<5).`,
      field: "results.epReal",
    });
  } else if (epReal > 1500) {
    issues.push({
      severity: "warn",
      code: "EP_TOO_HIGH",
      message: `EP_real = ${epReal.toFixed(0)} kWh/m²·an e suspect de mare (>1500).`,
      field: "results.epReal",
    });
  }

  // ─── ETANȘEITATE n50 ───
  const n50 = parseFloat(building.n50 || 0);
  if (n50 > 0 && n50 < 0.3) {
    issues.push({
      severity: "info",
      code: "N50_TOO_LOW",
      message: `n₅₀ = ${n50} h⁻¹ e sub Passivhaus (0.6). Verificați măsurarea.`,
      field: "n50",
    });
  } else if (n50 > 15) {
    issues.push({
      severity: "warn",
      code: "N50_TOO_HIGH",
      message: `n₅₀ = ${n50} h⁻¹ e foarte mare (>15). Posibilă eroare de unitate.`,
      field: "n50",
    });
  }

  return issues;
}

/**
 * Returnează contoare pe severitate.
 */
export function summarizeIncoherences(issues = []) {
  return {
    error: issues.filter((i) => i.severity === "error").length,
    warn: issues.filter((i) => i.severity === "warn").length,
    info: issues.filter((i) => i.severity === "info").length,
    total: issues.length,
  };
}
