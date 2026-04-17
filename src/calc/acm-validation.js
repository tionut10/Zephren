// ═══════════════════════════════════════════════════════════════
// VALIDĂRI ACM — Sprint 4b (17 apr 2026)
// AUDIT_08 §3.3 + SPRINT_04a §„Rămas" — validări sanity consumatori,
// temperaturi, volum stocare, distribuție, recirculare, Legionella.
//
// Baze normative:
//   • SR EN 15316-3:2017 (plaje tipice T_ACM, consum specific)
//   • HG 1425/2006 + Ord. MS 1002/2015 (Legionella — T_set ≥ 60°C public)
//   • Ord. MDLPA 16/2023 (limite rezonabile auditor CPE)
//   • ErP Reg. 812/2013 (clase etichetare boiler A/B/C)
// ═══════════════════════════════════════════════════════════════

import { HIGH_RISK_CATEGORIES } from "./acm-legionella.js";

// Severitate: "error" (blocant), "warning" (avertizare), "info" (recomandare)
export const SEVERITY = {
  ERROR:   "error",
  WARNING: "warning",
  INFO:    "info",
};

/**
 * Validează inputurile ACM din state (Step 3 Systems / tab ACM).
 *
 * @param {object} acm             — obiectul acm din state (consumers, dailyLiters, tSupply, ...)
 * @param {object} opts
 * @param {string} opts.category   — cod categorie clădire (pentru heuristici Legionella)
 * @param {number} opts.areaUseful — Au (m²) pentru a valida raport consumators/Au
 *
 * @returns {{ errors: Array, warnings: Array, info: Array, blockSubmit: boolean }}
 */
export function validateACMInputs(acm = {}, opts = {}) {
  const errors = [];
  const warnings = [];
  const info = [];
  const { category = "RI", areaUseful = 0 } = opts;

  const push = (arr, field, msg, ref) => arr.push({ field, message: msg, reference: ref || null });

  // ─── 1. Consumatori ──────────────────────────────────────────
  const consumers = parseFloat(acm.consumers);
  if (acm.consumers !== undefined && acm.consumers !== "" && acm.consumers !== null) {
    if (!isFinite(consumers) || consumers < 0) {
      push(errors, "consumers",
        "Nr. consumatori trebuie să fie un număr pozitiv.",
        "SR EN 15316-3 §6.2");
    } else if (consumers === 0) {
      push(warnings, "consumers",
        "Zero consumatori echivalenți → Q_W_nd = 0. Dacă clădirea e ocupată, introduceți numărul real.",
        "SR EN 15316-3");
    } else if (consumers > 10000) {
      push(errors, "consumers",
        "Peste 10 000 consumatori — valoare nerealistă pentru o singură clădire. Recalculați pentru o zonă.",
        null);
    } else if (consumers > 0 && areaUseful > 0 && consumers > areaUseful) {
      push(warnings, "consumers",
        `Densitate ocupare >1 pers/m² (${consumers} pers / ${Math.round(areaUseful)} m²). Verificați valoarea.`,
        "Mc 001-2022 Anexa 9");
    }
  }

  // ─── 2. Consum specific dailyLiters ──────────────────────────
  const dailyL = parseFloat(acm.dailyLiters);
  if (acm.dailyLiters !== undefined && acm.dailyLiters !== "" && acm.dailyLiters !== null) {
    if (!isFinite(dailyL) || dailyL < 0) {
      push(errors, "dailyLiters",
        "Consum specific trebuie să fie ≥ 0 L/pers·zi.", null);
    } else if (dailyL > 500) {
      push(errors, "dailyLiters",
        "Consum specific > 500 L/pers·zi este nerealist (max. tipic: piscine 120, spitale 150).",
        "Mc 001-2022 Anexa 10");
    } else if (dailyL > 200 && (category === "RI" || category === "RC" || category === "RA")) {
      push(warnings, "dailyLiters",
        `Consum ${dailyL} L/pers·zi este ridicat pentru rezidențial (tipic 40-80). Verificați dacă include irigare / piscină.`,
        "Mc 001-2022");
    }
  }

  // ─── 3. Temperatură livrare tSupply ──────────────────────────
  const tSup = parseFloat(acm.tSupply);
  if (acm.tSupply !== undefined && acm.tSupply !== "" && acm.tSupply !== null) {
    if (!isFinite(tSup)) {
      push(errors, "tSupply", "Temperatura ACM setată trebuie să fie numerică.", null);
    } else if (tSup < 40) {
      push(errors, "tSupply",
        `T_ACM = ${tSup}°C sub 40°C — confort insuficient și risc Legionella extrem.`,
        "SR EN 15316-3 §5.2");
    } else if (tSup > 70) {
      push(warnings, "tSupply",
        `T_ACM = ${tSup}°C peste 70°C — risc de opărire (EN 806-2 §6: T max. 60°C la punctul de utilizare).`,
        "EN 806-2");
    } else if (tSup < 55) {
      const isHighRisk = HIGH_RISK_CATEGORIES.has(category);
      push(warnings, "tSupply",
        isHighRisk
          ? `T_ACM = ${tSup}°C < 60°C cerut pentru clădiri publice cu risc ridicat (${category}) conform Ord. MS 1002/2015.`
          : `T_ACM = ${tSup}°C < 55°C crește riscul Legionella. Recomandat ≥ 55°C rezidențial, ≥ 60°C public.`,
        "HG 1425/2006 + Ord. MS 1002/2015");
    }
  }

  // ─── 4. Volum stocare ────────────────────────────────────────
  const vol = acm.storageVolume === "0" || acm.storageVolume === 0
    ? 0
    : parseFloat(acm.storageVolume);
  if (acm.storageVolume !== undefined && acm.storageVolume !== "" && acm.storageVolume !== null) {
    if (acm.storageVolume !== "0" && acm.storageVolume !== 0 && !isFinite(vol)) {
      push(errors, "storageVolume",
        "Volumul boilerului trebuie să fie un număr (sau 0 pentru sistem instant).", null);
    } else if (vol < 0) {
      push(errors, "storageVolume", "Volumul boilerului nu poate fi negativ.", null);
    } else if (vol > 10000) {
      push(errors, "storageVolume",
        "Volum > 10 000 L necorespunzător pentru clădire individuală. Verificați unitatea (L vs m³).",
        null);
    } else if (vol > 1000 && !HIGH_RISK_CATEGORIES.has(category)) {
      push(warnings, "storageVolume",
        `Boiler ${vol}L supradimensionat pentru categoria ${category}. Pierderi standby mari. Justificați tehnic.`,
        "EN 15316-5");
    } else if (vol > 400 && (!acm.hasLegionella || acm.legionellaFreq === "none")) {
      push(warnings, "storageVolume",
        `Boiler ${vol}L > 400L necesită tratament termic anti-Legionella obligatoriu (VDI 6023 / Ord. MS 1002/2015).`,
        "VDI 6023");
    }
  }

  // ─── 5. Clasă izolație boiler ────────────────────────────────
  const insClass = acm.insulationClass;
  if (insClass && !["A", "B", "C"].includes(insClass)) {
    push(errors, "insulationClass",
      "Clasa izolație boiler trebuie să fie A, B sau C (ErP Reg. 812/2013).",
      "ErP Reg. 812/2013");
  }

  // ─── 6. Lungime conducte distribuție ─────────────────────────
  const pipeL = parseFloat(acm.pipeLength);
  if (acm.pipeLength !== undefined && acm.pipeLength !== "" && acm.pipeLength !== null) {
    if (!isFinite(pipeL) || pipeL < 0) {
      push(errors, "pipeLength",
        "Lungime conducte distribuție trebuie să fie ≥ 0 m.", null);
    } else if (pipeL > 500) {
      push(warnings, "pipeLength",
        `Lungime ${pipeL}m > 500m — rețea foarte mare. Verificați dacă e o clădire cu multe scări / corpuri.`,
        null);
    } else if (pipeL > 0 && pipeL < 2) {
      push(info, "pipeLength",
        `Lungime ${pipeL}m foarte scurtă — tipic pentru apartament. Verificați dacă include tur+retur.`,
        null);
    }
  }

  // ─── 7. Diametru conducte ────────────────────────────────────
  const pipeD = parseFloat(acm.pipeDiameter);
  if (acm.pipeDiameter !== undefined && acm.pipeDiameter !== "" && acm.pipeDiameter !== null) {
    if (!isFinite(pipeD) || pipeD <= 0) {
      push(errors, "pipeDiameter", "Diametru conductă trebuie să fie > 0 mm.", null);
    } else if (pipeD < 10 || pipeD > 100) {
      push(warnings, "pipeDiameter",
        `Diametru ${pipeD}mm în afara plajei tipice (10-100mm PP-R / Cu).`,
        "SR EN 806-3");
    }
  }

  // ─── 8. Ore recirculare ──────────────────────────────────────
  const circH = parseFloat(acm.circHours);
  if (acm.circRecirculation && acm.circHours !== undefined && acm.circHours !== "" && acm.circHours !== null) {
    if (!isFinite(circH) || circH < 0) {
      push(errors, "circHours", "Ore recirculare ACM trebuie să fie între 0-24 h/zi.", null);
    } else if (circH > 24) {
      push(errors, "circHours", "Ore recirculare nu pot depăși 24 h/zi.", null);
    } else if (circH > 18) {
      push(warnings, "circHours",
        `Recirculare ${circH}h/zi aproape continuă — pierderi mari. Considerați controller orar (pornire doar în intervalele de consum).`,
        "EN 15316-3");
    } else if (circH > 0 && circH < 4) {
      push(info, "circHours",
        `Recirculare ${circH}h/zi — programată scurt. Util doar pentru vârfuri de consum (dimineață/seară).`,
        null);
    }
  }

  // ─── 9. Legionella — coerență frecvență / temperatură ────────
  if (acm.hasLegionella) {
    const tTreatment = parseFloat(acm.legionellaT);
    if (acm.legionellaT !== undefined && acm.legionellaT !== "" && acm.legionellaT !== null) {
      if (!isFinite(tTreatment) || tTreatment < 60 || tTreatment > 80) {
        push(errors, "legionellaT",
          `Temperatura șoc termic trebuie în plaja 60-80°C (recomandat 70°C). Valoarea: ${tTreatment}°C.`,
          "VDI 6023 §6.2");
      } else if (tTreatment < 65) {
        push(warnings, "legionellaT",
          `T_șoc = ${tTreatment}°C < 65°C poate fi insuficient. VDI 6023 recomandă ≥ 70°C pentru 3 min.`,
          "VDI 6023");
      }
    }
    const freq = acm.legionellaFreq;
    if (freq && !["daily", "weekly", "none"].includes(freq)) {
      push(errors, "legionellaFreq",
        "Frecvența tratamentului Legionella: 'weekly' (săptămânal) sau 'daily' (zilnic).",
        null);
    }
  } else if (HIGH_RISK_CATEGORIES.has(category)) {
    push(info, "hasLegionella",
      `Categoria ${category} este cu risc ridicat Legionella. Activați tratamentul termic periodic (recomandat săptămânal la 70°C).`,
      "Ord. MS 1002/2015 + VDI 6023");
  }

  // ─── 10. Coerență sursă cu parametri ─────────────────────────
  if (acm.source === "CAZAN_H" && acm.storageVolume && vol > 0 && vol > 200) {
    push(info, "source",
      `Cazan combi + boiler ${vol}L: combinația combi+boiler e atipică (combi este instant). Verificați dacă e corect.`,
      null);
  }

  return {
    errors,
    warnings,
    info,
    blockSubmit: errors.length > 0,
  };
}

/**
 * Formatează un rezultat de validare pentru afișare compactă UI (badge + mesaje).
 */
export function summarizeValidation(result) {
  if (!result) return { label: "—", color: "#9ca3af" };
  if (result.errors.length > 0) {
    return { label: `${result.errors.length} eroare(i) blocant(e)`, color: "#ef4444" };
  }
  if (result.warnings.length > 0) {
    return { label: `${result.warnings.length} avertizare`, color: "#f59e0b" };
  }
  if (result.info.length > 0) {
    return { label: `${result.info.length} recomandare`, color: "#3b82f6" };
  }
  return { label: "Configurație validă", color: "#10b981" };
}
