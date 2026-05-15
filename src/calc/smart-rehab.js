import { NZEB_THRESHOLDS } from '../data/energy-classes.js';
import { getPrice } from '../data/rehab-prices.js';
import {
  U_REF_NZEB_RES,
  U_REF_NZEB_NRES,
  U_REF_RENOV_RES,
  U_REF_RENOV_NRES,
  U_REF_GLAZING,
} from '../data/u-reference.js';

// getNzebEpMax: Calculate nZEB ep_max for category and climate zone
// zone: "I"-"V" string → index 0-4 în array-ul ep_max
export function getNzebEpMax(category, zone) {
  const t = NZEB_THRESHOLDS[category] || NZEB_THRESHOLDS.AL;
  const zoneIdx = {"I":0,"II":1,"III":2,"IV":3,"V":4}[zone] ?? 2;
  return Array.isArray(t.ep_max) ? t.ep_max[zoneIdx] : t.ep_max;
}

// ─── Adaptori prețuri (Sprint 25 P0.1) ──────────────────────────────────────
// Sursă canonică: rehab-prices.js. Aici doar interpolare liniară pe grosime.
// Fallback (între paranteze) = valori vechi smart-rehab înainte de migrare.

function _interp(p10, p15, thickCm) {
  if (p10 == null || p15 == null) return null;
  const slope = (p15 - p10) / 5;
  return p10 + (thickCm - 10) * slope;
}

function getWallInsulCostM2(thickCm, scenario = 'mid') {
  const p10 = getPrice('envelope', 'wall_eps_10cm', scenario)?.price;
  const p15 = getPrice('envelope', 'wall_eps_15cm', scenario)?.price;
  const itp = _interp(p10, p15, Math.max(5, Math.min(25, thickCm)));
  return itp != null ? Math.round(itp) : 42;
}

function getRoofInsulCostM2(thickCm, scenario = 'mid') {
  const p15 = getPrice('envelope', 'roof_eps_15cm', scenario)?.price;
  const p25 = getPrice('envelope', 'roof_mw_25cm', scenario)?.price;
  if (p15 != null && p25 != null) {
    const slope = (p25 - p15) / 10;
    return Math.round(p15 + (Math.max(8, Math.min(30, thickCm)) - 15) * slope);
  }
  return 42;
}

function getBasementInsulCostM2(scenario = 'mid') {
  return getPrice('envelope', 'basement_xps_10cm', scenario)?.price ?? 32;
}

function getWindowsCostM2(uTarget, scenario = 'mid') {
  // uTarget: 1.40, 1.10, 0.90, 0.70
  const key = uTarget <= 0.75 ? 'windows_u070'
           : uTarget <= 0.95 ? 'windows_u090'
           : uTarget <= 1.20 ? 'windows_u110'
           : 'windows_u140';
  return getPrice('envelope', key, scenario)?.price ?? 135;
}

// Calcul economie anuală estimată [kWh/m²·an] per măsură de reabilitare
function estimateEpSaving(measure, gap, epActual) {
  const pct = { wall: 0.30, window: 0.18, roof: 0.12, pv: 0.35, hp: 0.50, vent: 0.20, solar: 0.08, led: 0.06 };
  return { wall: gap * (pct.wall), window: gap * (pct.window), roof: gap * (pct.roof),
           pv: Math.min(epActual * 0.35, 40), hp: epActual * pct.hp * 0.4, vent: gap * pct.vent,
           solar: epActual * pct.solar, led: epActual * pct.led }[measure] || 0;
}

// ─── Sprint 25 P0.7 — preț energie per combustibil principal ──────────────
// Surse: ANRE Q1 2026 (gaz, electric, termoficare) + statistici INS (lemn, peleți)
// Subsidii eliminate cf. EPBD 2024 → reflectă piața liberă
export const FUEL_PRICES_EUR = {
  gaz_natural:    0.08,  // gaz natural cu TVA 21% (RO 2026)
  gaz_butelie:    0.12,
  gpl:            0.13,
  motorina:       0.18,
  pacura:         0.16,
  electric:       0.22,  // ANRE Q1 2026 mediu rezidențial
  termoficare:    0.07,
  lemn:           0.04,
  peleti:         0.06,
  carbune:        0.05,
  biomasa:        0.05,
};

/**
 * Returnează prețul energiei în EUR/kWh pentru combustibilul principal de încălzire.
 * Preferă instSummary.energyPriceEUR (override explicit), apoi mapare heuristică
 * pe instSummary.heating.source / heatingSrcType, apoi fallback gaz natural.
 * @param {object} instSummary
 * @param {object} [building] - rezervat pentru extensii viitoare
 */
export function getEnergyPriceEUR(instSummary, building) {
  if (instSummary?.energyPriceEUR) return parseFloat(instSummary.energyPriceEUR);
  const src = String(
    instSummary?.heating?.source ?? instSummary?.heatingSrcType ?? instSummary?.heatingSource ?? ""
  ).toLowerCase();
  if (!src) return FUEL_PRICES_EUR.gaz_natural;
  if (src.includes("electric")) return FUEL_PRICES_EUR.electric;
  if (src.includes("termof"))   return FUEL_PRICES_EUR.termoficare;
  if (src.includes("peleti") || src.includes("peleți")) return FUEL_PRICES_EUR.peleti;
  if (src.includes("lemn"))     return FUEL_PRICES_EUR.lemn;
  if (src.includes("carbune"))  return FUEL_PRICES_EUR.carbune;
  if (src.includes("biomasa"))  return FUEL_PRICES_EUR.biomasa;
  if (src.includes("motorina") || src.includes("motorină")) return FUEL_PRICES_EUR.motorina;
  if (src.includes("pacura")  || src.includes("păcură"))  return FUEL_PRICES_EUR.pacura;
  if (src.includes("butelie")) return FUEL_PRICES_EUR.gaz_butelie;
  if (src.includes("gpl"))     return FUEL_PRICES_EUR.gpl;
  // pompele de căldură consumă electricitate — preț electric, nu gaz
  if (src.includes("pc_") || src.includes("pompa") || src.includes("pompă") ||
      src.includes("hp_") || src.includes("aer_aer") || src.includes("aer_apa")) {
    return FUEL_PRICES_EUR.electric;
  }
  if (src.includes("gaz")) return FUEL_PRICES_EUR.gaz_natural;
  return FUEL_PRICES_EUR.gaz_natural;
}

// ─── Sprint 25 P0.6 — detectare context normativ ──────────────────────────
// Mc 001-2022 nu specifică U_REF per zonă climatică (verificat normativ +
// Ord. MDLPA 2641/2017 — valori unice rezidențial). Praguri adaptive doar
// pe RES vs NRES vs RENOVARE (Tabel 2.4/2.7/2.10a/2.10b).
function _isResidential(category) {
  return ["RI", "RC", "RA"].includes(category);
}
function _isRenovation(building) {
  // Renovare majoră = construire înainte de 2000 SAU scop CPE explicit "renovare"
  const yearBuilt = parseInt(building?.yearBuilt) || 9999;
  const scop = (building?.scopCpe || building?.scopCPE || "").toLowerCase();
  return yearBuilt < 2000 || scop === "renovare" || scop === "renovare_majora";
}

/**
 * Returnează U_REF pentru un element + categorie + context renovare.
 * Surse: Mc 001-2022 Tab 2.4 (nZEB rez), 2.7 (nZEB nrez), 2.10a (renov rez), 2.10b (renov nrez).
 */
export function getURefAdaptive(category, elementType, building) {
  const isRes = _isResidential(category);
  const isRenov = _isRenovation(building);
  const table = isRenov
    ? (isRes ? U_REF_RENOV_RES : U_REF_RENOV_NRES)
    : (isRes ? U_REF_NZEB_RES : U_REF_NZEB_NRES);
  return table[elementType] ?? null;
}

/**
 * Returnează U_REF pentru ferestre: nZEB rez/nrez vs renovare.
 * Sursă: Mc 001-2022 Tab 2.5 + U_REF_GLAZING.
 */
export function getURefGlazingAdaptive(category, building) {
  const isRes = _isResidential(category);
  const isRenov = _isRenovation(building);
  if (isRenov) return U_REF_GLAZING.renov;
  return isRes ? U_REF_GLAZING.nzeb_res : U_REF_GLAZING.nzeb_nres;
}

// ═══════════════════════════════════════════════════════════════
// SUGESTII SMART REABILITARE — Motor de recomandări cu cost-eficiență
// ═══════════════════════════════════════════════════════════════
export function calcSmartRehab(building, instSummary, renewSummary, opaqueElements, glazingElements, climate) {
  if (!instSummary) return [];
  const suggestions = [];
  // Sprint Audit JS Gotcha (15 mai 2026): `??` tratează 0 ca valid (ZEB).
  // Pentru ZEB ep_adjusted=0 ≤ nzebEpMax → no rehab needed (corect normativ).
  const epActual = renewSummary?.ep_adjusted_m2 ?? instSummary?.ep_total_m2 ?? 999;
  const rer = renewSummary?.rer || 0;
  const cat = building?.category || "AL";
  const nzeb = NZEB_THRESHOLDS[cat] || NZEB_THRESHOLDS.AL;
  const nzebEpMax = getNzebEpMax(cat, climate?.zone);
  const Au = parseFloat(building?.areaUseful) || 100;
  const gap = Math.max(0, epActual - nzebEpMax);
  // Prețul energiei [EUR/kWh] — Sprint 25 P0.7 mapare per combustibil
  const energyPriceEUR = getEnergyPriceEUR(instSummary, building);

  // Sprint 25 P0.6 — praguri U adaptive RES/NRES/RENOVARE (Mc 001-2022 Tab 2.4/2.7/2.10a/2.10b)
  const uRefWall   = getURefAdaptive(cat, "PE", building) ?? 0.30;
  const uRefRoof   = getURefAdaptive(cat, "PT", building) ?? 0.20;
  const uRefGlaz   = getURefGlazingAdaptive(cat, building);
  const isRenov    = _isRenovation(building);
  const isRes      = _isResidential(cat);
  const ctxLabel   = isRenov ? "renovare" : "nZEB";
  const catLabel   = isRes ? "rez" : "nrez";

  function addSuggestion(priority, system, measure, epSavingM2, investPerM2, totalInvest, detail, payback) {
    const annualSavingEUR = epSavingM2 * Au * energyPriceEUR;
    const costEfficiency = annualSavingEUR > 0 ? Math.round(totalInvest / annualSavingEUR * 10) / 10 : null; // ani
    const eurPerKwhSaved = epSavingM2 > 0 ? Math.round(totalInvest / (epSavingM2 * Au) * 100) / 100 : null; // EUR/kWh·an economisit
    suggestions.push({
      priority, system, measure,
      impact: epSavingM2 > 0 ? `-${Math.round(epSavingM2)} kWh/(m²·an)` : detail,
      epSaving_m2: Math.round(epSavingM2 * 10) / 10,
      detail,
      costEstimate: Math.round(totalInvest) + " EUR",
      costPerM2: Math.round(investPerM2) + " EUR/m²",
      annualSaving: Math.round(annualSavingEUR) + " EUR/an",
      payback: payback || (costEfficiency ? costEfficiency.toFixed(1) + " ani" : "N/A"),
      costEfficiency_aniPB: costEfficiency,
      eurPerKwhSaved,
      costEfficLabel: eurPerKwhSaved ? `${eurPerKwhSaved} EUR per kWh·an economisit` : null,
    });
  }

  // ── Analiză pereți (Sprint 25 P0.6 — prag U adaptiv)
  // Strict (>1.20× U_REF): recomandare puternică — măsură obligatorie nZEB/renovare
  // Moderate (>U_REF dar <1.20×): recomandare îmbunătățire — nu e pierdere mare
  const walls = opaqueElements?.filter(e => e.type === "PE") || [];
  const avgUWall = walls.length ? walls.reduce((s,w) => {
    const R = (w.layers||[]).reduce((r,l) => r + ((parseFloat(l.thickness)||0)/1000) / (l.lambda||1), 0.17);
    return s + 1/R;
  }, 0) / walls.length : 2.0;
  const wallArea = walls.reduce((s,w) => s + (parseFloat(w.area)||0), 0) || Au * 0.7;
  if (avgUWall > uRefWall * 1.20) {
    const thickCm = 10, costM2Wall = getWallInsulCostM2(thickCm);
    const totalCost = wallArea * costM2Wall;
    const epSav = estimateEpSaving("wall", gap, epActual);
    addSuggestion(1, "Anvelopă", "Termoizolare pereți exteriori",
      epSav, costM2Wall, totalCost,
      `U mediu pereți = ${avgUWall.toFixed(2)} W/(m²·K). Țintă ${ctxLabel} ${catLabel}: ≤${uRefWall}. Adăugare EPS 10-15cm.`);
  } else if (avgUWall > uRefWall) {
    const thickCm = 5, costM2Wall = getWallInsulCostM2(thickCm);
    const totalCost = wallArea * costM2Wall;
    const epSav = estimateEpSaving("wall", gap, epActual) * 0.4;
    addSuggestion(2, "Anvelopă", "Suplimentare izolație pereți",
      epSav, costM2Wall, totalCost,
      `U mediu pereți = ${avgUWall.toFixed(2)}. Îmbunătățire (țintă ${ctxLabel} ${catLabel}: ≤${uRefWall}). +5cm EPS suplimentar.`);
  }

  // ── Ferestre (Sprint 25 P0.6 — prag adaptiv din U_REF_GLAZING)
  const avgUWin = glazingElements?.length ? glazingElements.reduce((s,e) => s + (parseFloat(e.u)||2.5), 0) / glazingElements.length : 3.0;
  const winArea = glazingElements?.reduce((s,e) => s + (parseFloat(e.area)||0), 0) || 20;
  if (avgUWin > uRefGlaz * 1.20) {
    // Pentru rezidențial recomandăm tripan (u090); pentru nrez/renovare — dublu vitraj low-e
    const targetU = isRes && !isRenov ? 0.90 : 1.10;
    const costM2Win = getWindowsCostM2(targetU);
    const totalCost = winArea * costM2Win;
    const epSav = estimateEpSaving("window", gap, epActual);
    addSuggestion(1, "Anvelopă", "Înlocuire tâmplărie exterioară",
      epSav, costM2Win, totalCost,
      `U mediu ferestre = ${avgUWin.toFixed(2)}. Țintă ${ctxLabel} ${catLabel}: ≤${uRefGlaz} (instalat ${targetU}).`);
  }

  // ── Acoperiș (Sprint 25 P0.6 — prag adaptiv)
  const roofs = opaqueElements?.filter(e => ["PT","PP","PI"].includes(e.type)) || [];
  const avgURoof = roofs.length ? roofs.reduce((s,r) => {
    const R = (r.layers||[]).reduce((rr,l) => rr + ((parseFloat(l.thickness)||0)/1000)/(l.lambda||1), 0.14);
    return s + 1/R;
  }, 0) / roofs.length : 1.5;
  const roofArea = roofs.reduce((s,r) => s + (parseFloat(r.area)||0), 0) || Au * 0.9;
  if (avgURoof > uRefRoof * 1.20) {
    const thickCm = 15, costM2Roof = getRoofInsulCostM2(thickCm);
    const totalCost = roofArea * costM2Roof;
    const epSav = estimateEpSaving("roof", gap, epActual);
    addSuggestion(1, "Anvelopă", "Termoizolare acoperiș/terasă",
      epSav, costM2Roof, totalCost,
      `U mediu acoperiș = ${avgURoof.toFixed(2)}. Țintă ${ctxLabel} ${catLabel}: ≤${uRefRoof}. Adăugare 15-25cm vată minerală.`);
  }

  // ── PV
  if (rer < 30) {
    const pvKwp = Math.max(2, Au * 0.05); // ~5W/m² suprafață utilă
    // Sprint Audit Prețuri P2.4 (9 mai 2026) — preț canonic rehab-prices.renewables.pv_kwp mid 1100 EUR/kWp
    const pvUnitEUR = getPrice("renewables", "pv_kwp", "mid")?.price || 1100;
    const costPV = pvKwp * pvUnitEUR;
    const epSav = estimateEpSaving("pv", gap, epActual);
    addSuggestion(1, "Regenerabile", "Instalare panouri fotovoltaice",
      epSav, pvUnitEUR * pvKwp / Au, costPV,
      `RER actual = ${rer.toFixed(0)}% (minim nZEB: 30%). PV ${pvKwp.toFixed(1)} kWp estimat.`);
  }

  // ── Pompă de căldură
  if (epActual > nzebEpMax * 1.2) {
    const costHP = Au * 55;
    const epSav = estimateEpSaving("hp", gap, epActual);
    addSuggestion(2, "Instalații", "Pompă de căldură aer-apă",
      epSav, 55, costHP,
      "COP 3.5-4.5. Reduce drastic consumul de energie primară. Combină cu PV pentru efect maxim.");
  }

  // ── Ventilare HR
  if (epActual > nzebEpMax) {
    const costVent = Au * 15;
    const epSav = estimateEpSaving("vent", gap, epActual);
    addSuggestion(2, "Instalații", "Ventilare mecanică cu recuperare căldură",
      epSav, 15, costVent,
      "Eficiență HR 80-90%. Reduce pierderile de ventilare menținând calitatea aerului interior.");
  }

  // ── Solar termic ACM
  const costSolar = Au * 0.04 * 380;
  const epSavSolar = estimateEpSaving("solar", gap, epActual);
  addSuggestion(3, "Regenerabile", "Panouri solar-termice pentru ACM",
    epSavSolar, 380, costSolar,
    "2-4 m² colectori per persoană. Acoperire 40-60% necesar ACM vara.");

  // ── LED
  const costLED = Au * 8;
  const epSavLED = estimateEpSaving("led", gap, epActual);
  addSuggestion(3, "Instalații", "Înlocuire iluminat cu LED + senzori prezență",
    epSavLED, 8, costLED,
    "LED eficacitate >100 lm/W. Senzori prezență în holuri, scări, grupuri sanitare. Recuperare rapidă.");

  // Sprint 27 P2.6 — unificare criteriu sortare cu rehab-comparator (NPV-best proxy)
  // Sortare: prioritate principală → costEfficiency_aniPB (payback ASC) → eurPerKwhSaved
  // Notă: payback simplu e o aproximare a NPV-rank pentru măsuri cu lifespan similar
  // (~20-40 ani toate măsurile anvelopă/sisteme), consistent cu marcarea isBest în
  // rehab-comparator.calcRehabPackages (care folosește NPV pe pachete întregi).
  return suggestions.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    const pbA = a.costEfficiency_aniPB ?? 999;
    const pbB = b.costEfficiency_aniPB ?? 999;
    if (pbA !== pbB) return pbA - pbB;  // payback ASC = NPV proxy DESC
    return (a.eurPerKwhSaved || 999) - (b.eurPerKwhSaved || 999);  // tiebreak
  });
}
