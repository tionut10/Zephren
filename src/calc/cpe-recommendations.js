/**
 * cpe-recommendations.js — Motor unificat de recomandări CPE/Anexa 2.
 *
 * Audit 2 mai 2026 — P1.4: înainte existau două motoare divergente:
 *   - Step6Certificate.jsx:1996-2017 (preview HTML pag. 3 — 8 recomandări)
 *   - CpeAnexa.jsx:120-184 (preview UI Anexa 2 — 6 recomandări A1/A2/A3/B1/B2/C1/D1)
 * Acest modul devine sursă unică, importat în ambele locuri.
 *
 * Categoria "Anvelopă" → A1, A2, A3, A4 (punți)
 * Categoria "Instalații" → B1, B2, B3 (încălzire/ACM/răcire/ventilare)
 * Categoria "SRE" (regenerabile) → C1 (PV), C2 (solar termic), C3 (PdC)
 * Categoria "Iluminat" → D1
 * Categoria "Etanșeitate" → E1 (n50)
 * Categoria "Bloc multi-apartament" → F1 (distribuție consum)
 *
 * Formatul rezultat (per item):
 *   {
 *     code:     "A1",        // cod alfanumeric stabil
 *     priority: "înaltă",    // "înaltă" | "medie" | "scăzută"
 *     category: "Anvelopă",  // grup tematic
 *     measure:  "...",       // titlu scurt măsură
 *     detail:   "...",       // descriere lungă cu valori calculate
 *     savings:  "15-25%",    // estimat sau "necalculat" (NU mai folosim 20% default)
 *   }
 *
 * @typedef {Object} RecommendationContext
 * @property {Object} [building]
 * @property {Object} [envelopeSummary]
 * @property {Array}  [opaqueElements]
 * @property {Array}  [glazingElements]
 * @property {Array}  [thermalBridges]
 * @property {Object} [heating]
 * @property {Object} [acm]
 * @property {Object} [cooling]
 * @property {Object} [ventilation]
 * @property {Object} [lighting]
 * @property {Object} [solarThermal]
 * @property {Object} [photovoltaic]
 * @property {Object} [instSummary]
 * @property {Object} [renewSummary]
 * @property {number} [rer]
 * @property {Function} [calcOpaqueR]      — funcție helper pentru U opac
 * @property {Object} [financialAnalysis]  — pentru savings real (Pas 7)
 *
 * Audit P1.12: pentru `savings` NU mai folosim fallback `|| 20`. Dacă nu e
 * calculat, returnăm string explicit „necalculat (necesită Pas 7)".
 */

const PRIORITY = Object.freeze({
  HIGH: "înaltă",
  MEDIUM: "medie",
  LOW: "scăzută",
});

/** Helper format RO 1 zecimală virgulă. */
function fmtRo(n, dec = 1) {
  const v = parseFloat(n);
  if (!Number.isFinite(v)) return "—";
  return v.toFixed(dec).replace(".", ",");
}

/**
 * Calculează savings real din financialAnalysis (Pas 7) sau întoarce „necalculat".
 * Audit P1.12 — eliminăm fallback-ul `|| 20` care inducea bias optimist.
 */
function realSavings(financialAnalysis, fallback = "necalculat (necesită Pas 7)") {
  const v = financialAnalysis?.energySavingsPercent;
  if (Number.isFinite(v) && v > 0) return `${fmtRo(v, 0)}%`;
  return fallback;
}

/**
 * Generează lista completă de recomandări.
 * @param {RecommendationContext} ctx
 * @returns {Array<{code:string, priority:string, category:string, measure:string, detail:string, savings:string}>}
 */
export function generateCpeRecommendations(ctx) {
  const {
    building = {},
    envelopeSummary,
    opaqueElements = [],
    glazingElements = [],
    thermalBridges = [],
    heating,
    acm,
    cooling,
    ventilation,
    lighting,
    solarThermal,
    photovoltaic,
    instSummary,
    renewSummary,
    rer,
    calcOpaqueR,
    financialAnalysis,
  } = ctx || {};

  const recs = [];
  const rerVal = Number.isFinite(rer) ? rer : (renewSummary?.rer || 0);

  // ─────────────────────────────────────────────────
  // A. ANVELOPĂ
  // ─────────────────────────────────────────────────
  if (envelopeSummary?.G > 0.8) {
    recs.push({
      code: "A1",
      priority: PRIORITY.HIGH,
      category: "Anvelopă",
      measure: "Termoizolare pereți exteriori (sistem ETICS)",
      detail: `Coeficient G = ${fmtRo(envelopeSummary.G, 3)} W/(m³·K) > 0.8 prag eficiență. Aplicare sistem ETICS cu EPS sau vată minerală 10–15 cm pe pereții exteriori, asigurând U ≤ 0.30 W/(m²·K).`,
      savings: "15–25%",
    });
  }

  // U mediu opac > 0.5 (zid prost izolat)
  if (opaqueElements.length > 0 && calcOpaqueR) {
    const uVals = opaqueElements
      .filter((el) => ["PE", "PT", "PP"].includes(el.type))
      .map((el) => {
        try { return calcOpaqueR(el.layers, el.type)?.u || 0; }
        catch { return 0; }
      })
      .filter((u) => u > 0);
    const uAvg = uVals.length > 0 ? uVals.reduce((s, v) => s + v, 0) / uVals.length : 0;
    if (uAvg > 0.5 && !recs.some((r) => r.code === "A1")) {
      recs.push({
        code: "A1",
        priority: PRIORITY.HIGH,
        category: "Anvelopă",
        measure: "Termoizolare pereți exteriori (sistem ETICS)",
        detail: `U mediu pereți exteriori = ${fmtRo(uAvg, 2)} W/(m²·K) > 0.5. Aplicare ETICS pentru a atinge U ≤ 0.30 W/(m²·K).`,
        savings: "15–25%",
      });
    }
  }

  // A2 — Tâmplărie cu U > 1.8 (relaxat de la 2.5 conform NP048)
  if (glazingElements.some((g) => parseFloat(g.u) > 1.8)) {
    const maxU = Math.max(...glazingElements.map((g) => parseFloat(g.u) || 0));
    recs.push({
      code: "A2",
      priority: parseFloat(maxU) > 2.5 ? PRIORITY.HIGH : PRIORITY.MEDIUM,
      category: "Anvelopă",
      measure: "Înlocuire tâmplărie exterioară (geam Low-E tristrat)",
      detail: `Există ferestre cu U > 1.8 W/(m²·K) (max ${fmtRo(maxU, 2)}). Înlocuire cu tâmplărie PVC/AL cu rupere termică + geam Low-E tristrat U ≤ 1.0 W/(m²·K), g ≥ 0.50.`,
      savings: "8–15%",
    });
  }

  // A3 — Planșeu superior (terasă/pod) cu U > 0.25
  if (calcOpaqueR && opaqueElements.some((el) => {
    if (!["PT", "PP"].includes(el.type)) return false;
    try { return (calcOpaqueR(el.layers, el.type)?.u || 0) > 0.25; }
    catch { return false; }
  })) {
    recs.push({
      code: "A3",
      priority: PRIORITY.MEDIUM,
      category: "Anvelopă",
      measure: "Termoizolare planșeu superior (terasă/pod)",
      detail: "Termoizolație insuficientă la planșeul superior (U > 0.25 W/(m²·K)). Aplicare vată minerală sau XPS ≥ 20 cm pentru U ≤ 0.15 W/(m²·K).",
      savings: "8–12%",
    });
  }

  // A4 — Punți termice (Σ ψ·L > prag)
  if (thermalBridges.length > 0) {
    const totalPsiL = thermalBridges.reduce(
      (s, b) => s + (parseFloat(b.psi) || 0) * (parseFloat(b.length) || 0),
      0
    );
    const Au = parseFloat(building.areaUseful) || 0;
    const ratio = Au > 0 ? totalPsiL / Au : 0;
    if (ratio > 0.05) {
      recs.push({
        code: "A4",
        priority: PRIORITY.MEDIUM,
        category: "Anvelopă",
        measure: "Tratare punți termice (intersecții, balcoane, atice)",
        detail: `Σ(ψ·L)/Au = ${fmtRo(ratio, 3)} W/(m²·K) — punți termice semnificative. Tratare locală cu izolație suplimentară la perimetrul planșeelor, balcoane discontinue, atice și colțuri.`,
        savings: "3–8%",
      });
    }
  }

  // ─────────────────────────────────────────────────
  // B. INSTALAȚII
  // ─────────────────────────────────────────────────
  // B1 — Cazan vechi/randament scăzut
  if (instSummary?.isCOP === false && (instSummary?.eta_total_h || 0) < 0.85) {
    const fuel = String(heating?.source || "").toUpperCase();
    const isFossil = ["GAZ", "GPL", "MOTORINA", "PACURA", "CARBUNE", "CAZAN_GAZ", "GAZ_CONV"].some((f) => fuel.includes(f));
    recs.push({
      code: "B1",
      priority: PRIORITY.HIGH,
      category: "Instalații",
      measure: isFossil
        ? "Înlocuire cazan vechi cu condensare sau pompă de căldură"
        : "Modernizare sursă încălzire (randament > 0.92)",
      detail: `Randament generator η = ${fmtRo((instSummary.eta_total_h || 0) * 100, 1)}% < 85%. ${
        isFossil
          ? "Înlocuire cu cazan condensare η ≥ 0.95 sau pompă de căldură aer-apă SCOP ≥ 3.5."
          : "Înlocuire cu sursă modernă cu randament ≥ 0.92."
      }`,
      savings: "20–40%",
    });
  } else if (instSummary?.isCOP && parseFloat(heating?.eta_gen) < 3.0) {
    recs.push({
      code: "B1",
      priority: PRIORITY.MEDIUM,
      category: "Instalații",
      measure: "Modernizare pompă de căldură (model inverter SCOP > 4.0)",
      detail: `COP/SCOP = ${fmtRo(heating.eta_gen, 2)} < 3.0. Înlocuire cu pompă de căldură aer-apă inverter SCOP ≥ 4.0.`,
      savings: "10–20%",
    });
  }

  // B2 — Ventilație naturală fără recuperare
  if (ventilation?.type === "NAT" || ventilation?.type === "natural") {
    recs.push({
      code: "B2",
      priority: PRIORITY.MEDIUM,
      category: "Instalații",
      measure: "Sistem ventilație mecanică cu recuperare căldură (HRV)",
      detail: "Ventilare actuală naturală — pierderi importante. Instalare HRV cu η_recuperare ≥ 75% (SR EN 16798-1).",
      savings: "10–25%",
    });
  }

  // B3 — Răcire neeficientă (EER < 3.0 dacă există răcire)
  if (cooling?.hasCooling && parseFloat(cooling?.eer) > 0 && parseFloat(cooling.eer) < 3.0) {
    recs.push({
      code: "B3",
      priority: PRIORITY.LOW,
      category: "Instalații",
      measure: "Modernizare sistem răcire (inverter EER > 4.0)",
      detail: `EER = ${fmtRo(cooling.eer, 2)} < 3.0. Înlocuire cu unitate split inverter EER ≥ 4.0 sau VRF.`,
      savings: "5–15%",
    });
  }

  // ─────────────────────────────────────────────────
  // C. SURSE REGENERABILE
  // ─────────────────────────────────────────────────
  // C1 — Fotovoltaic (RER < 30% sau PV nu e activ)
  if (!photovoltaic?.enabled && rerVal < 30) {
    recs.push({
      code: "C1",
      priority: PRIORITY.HIGH,
      category: "SRE",
      measure: "Instalare sistem fotovoltaic (3–5 kWp + invertor hibrid)",
      detail: `RER actual = ${fmtRo(rerVal, 1)}% < 30% prag nZEB. Sistem PV 3–5 kWp acoperă 30–50% din consumul electric anual.`,
      savings: "RER +10–30%",
    });
  } else if (!photovoltaic?.enabled) {
    recs.push({
      code: "C1",
      priority: PRIORITY.LOW,
      category: "SRE",
      measure: "Instalare sistem fotovoltaic (opțional)",
      detail: "Producere locală energie electrică pentru autoconsum + injecție rețea (Casa Verde Plus).",
      savings: "8–15%",
    });
  }

  // C2 — Solar termic (dacă ACM consumă peste prag și nu e activ)
  const qf_w_m2 = instSummary && parseFloat(building.areaUseful) > 0
    ? (instSummary.qf_w || 0) / parseFloat(building.areaUseful)
    : 0;
  if (!solarThermal?.enabled && qf_w_m2 > 10) {
    recs.push({
      code: "C2",
      priority: PRIORITY.MEDIUM,
      category: "SRE",
      measure: "Colectoare solare termice pentru ACM (4–8 m²)",
      detail: `Consum ACM ${fmtRo(qf_w_m2, 1)} kWh/(m²·an) > 10. Instalare 4–8 m² colectoare plane → fracție solară 40–70%.`,
      savings: "5–10%",
    });
  }

  // ─────────────────────────────────────────────────
  // D. ILUMINAT
  // ─────────────────────────────────────────────────
  if (instSummary?.leni > 10) {
    recs.push({
      code: "D1",
      priority: instSummary.leni > 15 ? PRIORITY.MEDIUM : PRIORITY.LOW,
      category: "Iluminat",
      measure: "Modernizare iluminat (LED + senzori prezență)",
      detail: `LENI = ${fmtRo(instSummary.leni, 1)} kWh/(m²·an) > 10. Înlocuire corpuri cu LED și control prezență/luminozitate (DALI-2).`,
      savings: "30–60%",
    });
  }

  // ─────────────────────────────────────────────────
  // E. ETANȘEITATE AER
  // ─────────────────────────────────────────────────
  const n50 = parseFloat(building.n50) || 0;
  if (n50 > 1.0) {
    recs.push({
      code: "E1",
      priority: n50 > 3.0 ? PRIORITY.HIGH : PRIORITY.MEDIUM,
      category: "Etanșeitate",
      measure: "Îmbunătățire etanșeitate aer (n50 ≤ 1.0)",
      detail: `n50 = ${fmtRo(n50, 1)} 1/h > 1.0. Etanșare conexiuni tâmplărie, planșee, racord pereți cu spume PUR + bandă etanșare. Test blower-door după lucrări.`,
      savings: "5–12%",
    });
  }

  // ─────────────────────────────────────────────────
  // F. BLOC MULTI-APARTAMENT
  // ─────────────────────────────────────────────────
  if (building.category === "RC" && (building.apartments?.length ?? 0) > 4) {
    if (!building.commonSystems?.heatingDistribution || building.commonSystems.heatingDistribution === "vertical") {
      recs.push({
        code: "F1",
        priority: PRIORITY.MEDIUM,
        category: "Bloc multi-apartament",
        measure: "Distribuție orizontală cu repartitor consum",
        detail: "Distribuție verticală existentă — fără măsurare individuală. Refacere distribuție orizontală pe apartament cu repartitor de costuri (L.196/2018).",
        savings: "10–20%",
      });
    }
  }

  // ─────────────────────────────────────────────────
  // Fallback: clădire performantă
  // ─────────────────────────────────────────────────
  if (recs.length === 0) {
    recs.push({
      code: "Z0",
      priority: PRIORITY.LOW,
      category: "General",
      measure: "Întreținere regulată sisteme + monitorizare consum",
      detail: "Clădirea prezintă performanță energetică bună. Recomandare: revizii anuale, monitorizare consum și actualizare CPE la 10 ani sau la modificări majore.",
      savings: "—",
    });
  }

  // Audit P1.12 — dacă financialAnalysis e disponibil, override savings cu valoarea reală
  // (doar pentru recomandări fără valoare default specifică)
  if (financialAnalysis?.energySavingsPercent) {
    return recs.map((r) =>
      r.savings === "necalculat (necesită Pas 7)"
        ? { ...r, savings: realSavings(financialAnalysis) }
        : r
    );
  }

  return recs;
}

/**
 * Format compact pentru tabel HTML/DOCX:
 *   { rows: [{n, m, d, e, p}] } compatibil cu generatorul vechi din Step6.
 */
export function formatRecommendationsForTable(recs) {
  return recs.map((r, i) => ({
    n: i + 1,
    m: r.measure,
    d: r.category,
    e: r.savings,
    p: r.priority.toUpperCase(),
    code: r.code,
    detail: r.detail,
  }));
}
