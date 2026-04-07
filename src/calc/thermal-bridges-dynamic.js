/**
 * Punți termice liniare — calcul ψ dinamic conform ISO 14683:2017 + C107/3-2005
 * Metodă: interpolare ψ(izolat) ↔ ψ(neizolat) funcție de rezistența termica a izolației
 *
 * Referințe:
 * - SR EN ISO 14683:2017 — Punți termice, coeficient liniar ψ
 * - C107/3-2005 — Calculul performanței higrotermice (metode detaliate)
 * - Mc 001-2022 Anexa B — Evaluarea punților termice în auditul energetic
 * - SR EN ISO 10211:2017 — Modelare numerică punți termice (referință metodă exactă)
 */

import BRIDGES_DB from "../data/thermal-bridges.json";

/**
 * Calculează ψ dinamic pentru o punte termică dată grosimea izolației elementului adiacent
 * Interpolează liniar între ψ_neizolat și ψ_izolat funcție de R_ins / R_ins_ref
 *
 * @param {object} bridge — intrare din catalog (cu psi, psi_izolat)
 * @param {number} R_ins — rezistența termică a stratului izolant [m²·K/W]
 * @param {number} R_ins_ref — R de referință pentru ψ_izolat (implicit 3.5 m²·K/W)
 * @returns {number} ψ_dinamic [W/(m·K)]
 */
export function calcPsiDynamic(bridge, R_ins, R_ins_ref = 3.5) {
  const psi_0 = bridge.psi;           // neizolat
  const psi_1 = bridge.psi_izolat;    // izolat complet (la R_ref)
  if (!R_ins || R_ins <= 0) return psi_0;
  if (R_ins >= R_ins_ref) return psi_1;
  // Interpolare liniară
  const t = R_ins / R_ins_ref;
  const psi = psi_0 - t * (psi_0 - psi_1);
  return Math.round(psi * 1000) / 1000;
}

/**
 * Detectează tipurile de punți termice probabile din lista elementelor de anvelopă
 * Returnează sugestii de joncțiuni pe baza tipurilor de elemente prezente
 */
export function detectJunctions(opaqueElements = [], glazingElements = []) {
  const types = new Set(opaqueElements.map(e => e.type));
  const suggestions = [];

  if (types.has("PE") && types.has("PT")) {
    suggestions.push({ cat: "Joncțiuni pereți", name: "Perete ext. — Planșeu terasă", reason: "Element PT detectat" });
  }
  if (types.has("PE") && (types.has("PL") || types.has("PB"))) {
    suggestions.push({ cat: "Joncțiuni pereți", name: "Perete ext. — Soclu/fundație", reason: "Planșeu de peste sol/subsol detectat" });
    suggestions.push({ cat: "Joncțiuni pereți", name: "Perete ext. — Planșeu peste subsol", reason: "Planșeu de peste sol/subsol detectat" });
  }
  if (types.has("PE") && types.has("PP")) {
    suggestions.push({ cat: "Joncțiuni pereți", name: "Perete ext. — Planșeu pod", reason: "Planșeu pod detectat" });
  }
  if (types.size >= 2 && types.has("PE")) {
    suggestions.push({ cat: "Joncțiuni pereți", name: "Colț exterior", reason: "Colț exterior comun" });
  }
  if (glazingElements.length > 0) {
    suggestions.push({ cat: "Ferestre", name: "Contur fereastră standard", reason: `${glazingElements.length} element(e) vitrat(e) detectate` });
  }
  return suggestions;
}

/**
 * Extrage rezistența termica a stratului izolant principal dintr-un element de anvelopă
 */
export function extractInsulationR(layers = []) {
  if (!layers || !layers.length) return 0;
  let maxR = 0;
  layers.forEach(layer => {
    const d = (parseFloat(layer.thickness) || 0) / 1000; // mm → m
    const lambda = parseFloat(layer.lambda) || 0;
    if (d > 0 && lambda > 0) {
      const R = d / lambda;
      if (R > maxR) maxR = R;
    }
  });
  return Math.round(maxR * 100) / 100;
}

/**
 * Calculează ψL total dinamic pentru o listă de punți termice,
 * actualizând valorile ψ pe baza elementelor opace adiacente
 *
 * @param {Array} thermalBridges — lista punților termice din proiect
 * @param {Array} opaqueElements — elementele opace (cu layers)
 * @returns {Array} lista punților termice cu ψ_dyn calculat și psiL_dyn
 */
export function calcDynamicBridges(thermalBridges = [], opaqueElements = []) {
  // Găsim R-ul izolației pentru peretele exterior (tipul "PE")
  const wallPE = opaqueElements.find(e => e.type === "PE");
  const wallPT = opaqueElements.find(e => e.type === "PT");
  const wallPP = opaqueElements.find(e => e.type === "PP");
  const wallPL = opaqueElements.find(e => e.type === "PL" || e.type === "PB");

  const R_pe = wallPE ? extractInsulationR(wallPE.layers) : 0;
  const R_pt = wallPT ? extractInsulationR(wallPT.layers) : 0;
  const R_pp = wallPP ? extractInsulationR(wallPP.layers) : 0;
  const R_pl = wallPL ? extractInsulationR(wallPL.layers) : 0;

  return thermalBridges.map(tb => {
    // Găsim intrarea în catalog corespunzătoare
    const catalogEntry = BRIDGES_DB.find(b => b.name === tb.desc || b.name === tb.cat || b.cat === tb.cat);

    if (!catalogEntry) {
      // Punte personalizată — nu modificăm ψ
      return {
        ...tb,
        psi_dyn: parseFloat(tb.psi) || 0,
        psiL_dyn: (parseFloat(tb.psi) || 0) * (parseFloat(tb.length) || 0),
        isDynamic: false,
        R_ins_used: null,
      };
    }

    // Selectăm R-ul relevant pe baza categoriei punții
    let R_ins = R_pe; // implicit perete exterior
    const cat = catalogEntry.cat || "";
    const name = catalogEntry.name || "";

    if (name.includes("terasă") || name.includes("PT") || cat.includes("terasă")) R_ins = Math.max(R_pe, R_pt);
    if (name.includes("pod") || name.includes("PP")) R_ins = Math.max(R_pe, R_pp);
    if (name.includes("sol") || name.includes("fundație") || name.includes("subsol")) R_ins = Math.max(R_pe, R_pl);
    if (name.includes("fereastră") || name.includes("Fereastră") || cat.includes("Ferestre")) R_ins = R_pe;

    const psi_dyn = calcPsiDynamic(catalogEntry, R_ins);
    const length = parseFloat(tb.length) || 0;

    return {
      ...tb,
      psi_catalog: catalogEntry.psi,
      psi_izolat: catalogEntry.psi_izolat,
      psi_dyn,
      psiL_dyn: Math.round(psi_dyn * length * 100) / 100,
      psiL_orig: Math.round((parseFloat(tb.psi) || 0) * length * 100) / 100,
      isDynamic: true,
      R_ins_used: R_ins,
      delta_psi: Math.round((psi_dyn - (parseFloat(tb.psi) || 0)) * 1000) / 1000,
      detail: catalogEntry.detail,
    };
  });
}

/**
 * Rezumat total punți termice dinamice
 */
export function summarizeDynamicBridges(dynamicBridges = []) {
  const total_psiL_orig = dynamicBridges.reduce((s, tb) => s + (tb.psiL_orig ?? tb.psiL_dyn ?? 0), 0);
  const total_psiL_dyn  = dynamicBridges.reduce((s, tb) => s + (tb.psiL_dyn ?? 0), 0);
  const delta = total_psiL_dyn - total_psiL_orig;
  const nImproved = dynamicBridges.filter(tb => tb.isDynamic && tb.delta_psi < 0).length;
  const nWorse    = dynamicBridges.filter(tb => tb.isDynamic && tb.delta_psi > 0).length;

  return {
    total_psiL_orig: Math.round(total_psiL_orig * 100) / 100,
    total_psiL_dyn:  Math.round(total_psiL_dyn  * 100) / 100,
    delta:           Math.round(delta * 100) / 100,
    nImproved,
    nWorse,
    improved: delta < -0.05,
  };
}

/**
 * Returnează toate tipurile de punți termice din catalog grupate pe categorii
 */
export function getCatalogByCategory() {
  const result = {};
  BRIDGES_DB.forEach(b => {
    if (!result[b.cat]) result[b.cat] = [];
    result[b.cat].push(b);
  });
  return result;
}
