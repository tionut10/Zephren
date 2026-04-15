// ═══════════════════════════════════════════════════════════════
// nZEB — VERIFICARE CONFORMARE (nearly Zero-Energy Building)
// Legislație aplicabilă:
//   • Legea 372/2005 R2 (cu modificările ulterioare) — performanța
//     energetică a clădirilor, definiția nZEB
//   • Legea 238/2024 Art.6 — praguri RER ≥ 30% și ≥ 10% la fața locului
//   • Mc 001-2022 §2.4 + Tabel 2.10a — praguri EP pe zone climatice I-V
//   • Ord. MDLPA 348/2026 Art.6 alin.(1) lit.c) — raport de conformare
//     nZEB ca responsabilitate a auditorului energetic Grad I (AE Ici)
//
// ATENȚIE — distincție cu ZEB (Zero Emission Building):
//   nZEB = cadrul național actual (Mc 001 + L.372)
//   ZEB  = Directiva (UE) 2024/1275 EPBD recast, orizont 2028–2030
//          (implementat în src/calc/zeb-compliance.js)
//   Raportul cerut de Ord. 348/2026 Art.6 este nZEB, NU ZEB.
// ═══════════════════════════════════════════════════════════════

import { NZEB_THRESHOLDS } from "../data/energy-classes.js";
import { getNzebEpMax } from "./smart-rehab.js";

// ── Mapare categorie Zephren → categorie de bază nZEB ─────────
// Copy local (evită import circular), aliniat cu CATEGORY_BASE_MAP
const BASE_CAT_FALLBACK = {
  RI: "RI", RC: "RC", RA: "RA",
  BI: "BI", ED: "ED", SA: "SA",
  HC: "HC", CO: "CO", SP: "SP",
  IN: "AL", AL: "AL",
};

// ── Severitate pe tip de gap ──────────────────────────────────
const SEV = { ERR: "error", WARN: "warning", OK: "ok", INFO: "info" };

// ═══════════════════════════════════════════════════════════════
// checkNZEBCompliance — verificare completă conformare nZEB
//
// @param {object} params
//   @param {object} params.building — date clădire (category, zone, etc.)
//   @param {object} params.climate  — { zone: "III", name, theta_e, ... }
//   @param {object} params.renewSummary — { ep_adjusted_m2, rer, rerOnSite }
//   @param {object} [params.instSummary] — pentru fallback EP
//   @param {object} [params.auditor]     — { grade, ... } pentru validare competență
//   @param {string} [params.projectPhase] — "proiectare" | "audit" | "renovare"
//
// @returns {object|null}
//   null                    dacă nu sunt date suficiente
//   { compliant, ep, epMax, epDelta,
//     rer, rerMin, rerOk,
//     rerOnsite, rerOnsiteMin, rerOnsiteOk,
//     zone, category, categoryLabel,
//     checks: [ {id, label, value, target, ok, severity, unit} ],
//     gaps: [string],
//     recommendations: [ {priority, title, description, impactEP, impactRER} ],
//     verdict: string, verdictShort: string, color: string,
//     references: [ {doc, article, text} ],
//     auditorValid: bool, auditorNote: string }
// ═══════════════════════════════════════════════════════════════
export function checkNZEBCompliance(params = {}) {
  const {
    building = {},
    climate = null,
    renewSummary = null,
    instSummary = null,
    auditor = null,
    projectPhase = "proiectare",
  } = params;

  const category = building?.category;
  if (!category) return null;

  // Rezolvă categoria de bază (BI, RI, etc.) — tratează aliasuri
  const baseCat = BASE_CAT_FALLBACK[category] || category;
  const thresholds = NZEB_THRESHOLDS[baseCat] || NZEB_THRESHOLDS.AL;

  // EP calculat (energie primară totală ajustată cu regenerabile)
  const ep = renewSummary?.ep_adjusted_m2 != null
    ? renewSummary.ep_adjusted_m2
    : (instSummary?.ep_total_m2 || 0);

  if (!ep || !climate?.zone) return null;

  // Prag EP nZEB pentru zona climatică
  const epMax = getNzebEpMax(category, climate.zone) || thresholds.ep_max?.[2] || 100;
  const epDelta = ep - epMax;  // pozitiv = depășire

  // RER total (regenerabile, % din consum)
  const rer = renewSummary?.rer || 0;
  const rerMin = thresholds.rer_min || 30;  // Legea 238/2024 Art.6

  // RER la fața locului (≥10% conform Legea 238/2024 + 20% prin garanții)
  const rerOnsite = renewSummary?.rerOnSite || 0;
  const rerOnsiteMin = thresholds.rer_onsite_min || 10;

  // Verificări individuale
  const epOk = ep <= epMax;
  const rerOk = rer >= rerMin;
  const rerOnsiteOk = rerOnsite >= rerOnsiteMin;
  const compliant = epOk && rerOk && rerOnsiteOk;

  const checks = [
    {
      id: "ep",
      label: `Energie primară totală EP ≤ ${epMax.toFixed(0)} kWh/(m²·an) (zona ${climate.zone})`,
      value: Math.round(ep * 10) / 10,
      target: Math.round(epMax * 10) / 10,
      ok: epOk,
      severity: epOk ? SEV.OK : SEV.ERR,
      unit: "kWh/(m²·an)",
      reference: "Mc 001-2022 Tabel 2.10a",
    },
    {
      id: "rer",
      label: `Pondere energie regenerabilă RER ≥ ${rerMin}%`,
      value: Math.round(rer * 10) / 10,
      target: rerMin,
      ok: rerOk,
      severity: rerOk ? SEV.OK : SEV.ERR,
      unit: "%",
      reference: "Legea 238/2024 Art.6",
    },
    {
      id: "rer_onsite",
      label: `Pondere regenerabilă la fața locului ≥ ${rerOnsiteMin}%`,
      value: Math.round(rerOnsite * 10) / 10,
      target: rerOnsiteMin,
      ok: rerOnsiteOk,
      severity: rerOnsiteOk ? SEV.OK : SEV.WARN,
      unit: "%",
      reference: "Legea 238/2024 Art.6 + garanții origine 20%",
    },
  ];

  // Lista gap-urilor (doar cele neîndeplinite, cu descriere clară)
  const gaps = [];
  if (!epOk) {
    gaps.push(
      `EP depășește pragul nZEB cu ${epDelta.toFixed(1)} kWh/(m²·an) ` +
      `(${((epDelta / epMax) * 100).toFixed(1)}% peste limita Mc 001-2022 pentru zona ${climate.zone})`
    );
  }
  if (!rerOk) {
    gaps.push(
      `Ponderea energiei regenerabile este de ${rer.toFixed(1)}% (necesar ≥ ${rerMin}% ` +
      `conform Legea 238/2024 Art.6) — deficit de ${(rerMin - rer).toFixed(1)} puncte procentuale`
    );
  }
  if (!rerOnsiteOk) {
    gaps.push(
      `Ponderea regenerabilă la fața locului este de ${rerOnsite.toFixed(1)}% ` +
      `(necesar ≥ ${rerOnsiteMin}%) — se poate compensa parțial prin garanții de origine (max 20%)`
    );
  }

  // Recomandări automate — mapare gap → măsură concretă
  const recommendations = [];

  if (!epOk) {
    // Prioritate măsuri de reducere EP, în ordinea impactului
    const overrun = epDelta / epMax;

    if (overrun > 0.30) {
      recommendations.push({
        priority: 1,
        title: "Termoizolare avansată anvelopă opacă",
        description: "Adăugare termoizolație exterioară 15-20 cm (vată minerală sau EPS grafitat) pe pereți și 20-25 cm pe acoperiș/planșeu peste ultimul nivel. Impact estimat: -25...35% EP.",
        impactEP: "-25...35%",
        category: "envelope",
      });
      recommendations.push({
        priority: 1,
        title: "Înlocuire tâmplărie cu U ≤ 0.80 W/(m²·K)",
        description: "Tâmplărie cu triplă geamuri, intercalare cu Argon, rame cu rupere termică. Reduce pierderile prin vitraje cu 40-60%. Impact estimat: -8...15% EP.",
        impactEP: "-8...15%",
        category: "envelope",
      });
    } else if (overrun > 0.10) {
      recommendations.push({
        priority: 2,
        title: "Termoizolare suplimentară pereți exteriori",
        description: "Placare exterioară cu 10-15 cm termoizolație (vată minerală/EPS). Reduce coeficientul G global cu 0.15-0.25 W/(m³·K). Impact estimat: -12...20% EP.",
        impactEP: "-12...20%",
        category: "envelope",
      });
    } else {
      recommendations.push({
        priority: 2,
        title: "Optimizări minore anvelopă",
        description: "Verificare punți termice (colțuri, buiandrugi, balcoane) și completare termoizolație locală. Impact estimat: -3...8% EP.",
        impactEP: "-3...8%",
        category: "envelope",
      });
    }

    recommendations.push({
      priority: 2,
      title: "Sistem încălzire cu pompă de căldură (COP ≥ 4.0)",
      description: "Pompă de căldură aer-apă sau sol-apă, cuplată cu corpuri radiante de joasă temperatură (pardoseală radiantă / radiator la 35-45°C). Impact estimat: -30...45% EP faţă de cazan pe gaz.",
      impactEP: "-30...45%",
      category: "systems",
    });

    recommendations.push({
      priority: 3,
      title: "Ventilare mecanică cu recuperare căldură (η ≥ 85%)",
      description: "Schimbător contracurent sau entalpic, clasa H2/H3 conform EN 13141-7. Reduce pierderile prin ventilare cu 60-80%. Impact estimat: -10...18% EP.",
      impactEP: "-10...18%",
      category: "systems",
    });
  }

  if (!rerOk || !rerOnsiteOk) {
    const onsiteGap = Math.max(0, rerOnsiteMin - rerOnsite);
    const totalGap = Math.max(0, rerMin - rer);

    recommendations.push({
      priority: 1,
      title: `Instalare panouri fotovoltaice (min. ${Math.ceil(onsiteGap * 1.2)} kWp)`,
      description: `Pentru a acoperi deficitul RER on-site, instalare PV pe acoperiș — orientare S (±45°), înclinare 30-35°. Producție specifică estimată 1100-1300 kWh/kWp/an. Impact estimat: +${Math.min(25, Math.ceil(totalGap * 1.5))} p.p. RER.`,
      impactRER: `+${Math.min(25, Math.ceil(totalGap * 1.5))} p.p.`,
      category: "renewables",
    });

    if (totalGap > 10) {
      recommendations.push({
        priority: 2,
        title: "Sistem solar termic pentru ACM",
        description: "Panouri solare plane / cu tuburi vidate (4-6 m²/apartament), rezervor puffer 200-300 L. Acoperă 55-70% din ACM anual. Impact estimat: +5...10 p.p. RER.",
        impactRER: "+5...10 p.p.",
        category: "renewables",
      });
    }

    if (totalGap > 15) {
      recommendations.push({
        priority: 2,
        title: "Cazan biomasă (peleți) cu stocare",
        description: "Cazan peleți cu modulare, buffer 1000-2000 L, pentru încălzire + ACM. Emisii considerate aproape neutre (ciclu scurt carbon). Impact estimat: +15...25 p.p. RER.",
        impactRER: "+15...25 p.p.",
        category: "renewables",
      });
    }

    if (onsiteGap > 5) {
      recommendations.push({
        priority: 3,
        title: "Garanții de origine electricitate verde (max 20%)",
        description: "Achiziție certificate GO conform Legea 238/2024 pentru completarea parțială a RER total. NU contează ca RER on-site, ci doar la totalul RER.",
        impactRER: "max +20 p.p. total",
        category: "certificates",
      });
    }
  }

  // Validare competență auditor (Grad I obligatoriu pentru raport de conformare)
  let auditorValid = true;
  let auditorNote = "Auditor validat pentru emiterea raportului de conformare nZEB";
  if (auditor) {
    const grade = String(auditor.grade || "").trim().toUpperCase();
    const isGradeOne = grade === "I" || grade === "1" || grade.includes("AE ICI") || grade.includes("GRAD I");
    if (!isGradeOne) {
      auditorValid = false;
      auditorNote = `ATENȚIE — conform art. 6 alin. (1) lit. c) Ord. MDLPA 348/2026, ` +
        `raportul de conformare nZEB trebuie emis de un auditor energetic Grad I (AE Ici). ` +
        `Gradul declarat: "${auditor.grade || "nespecificat"}".`;
    }
  }

  // Verdict textual
  const verdictShort = compliant ? "CONFORM nZEB" : "NECONFORM nZEB";
  const verdict = compliant
    ? `Clădirea SE ÎNCADREAZĂ în categoria clădirilor cu consum de energie aproape egal cu zero (nZEB), ` +
      `conform Mc 001-2022 §2.4 și Legea 238/2024 Art.6. ` +
      `EP = ${ep.toFixed(1)} ≤ ${epMax.toFixed(0)} kWh/(m²·an), RER = ${rer.toFixed(1)}% ≥ ${rerMin}%, ` +
      `RER on-site = ${rerOnsite.toFixed(1)}% ≥ ${rerOnsiteMin}%.`
    : `Clădirea NU SE ÎNCADREAZĂ în categoria nZEB. Gap-uri identificate: ${gaps.length} criteriu(i) neîndeplinite. ` +
      `Sunt necesare măsuri de ameliorare a performanței energetice și/sau suplimentarea surselor regenerabile ` +
      `pentru atingerea pragurilor impuse.`;

  // Referințe normative (pentru nota de subsol a raportului)
  const references = [
    {
      doc: "Legea 372/2005 R2",
      article: "Art.2 pct.16, Art.13^1",
      text: "Definiția nZEB și obligația respectării cerințelor la proiectarea clădirilor noi și renovărilor majore",
    },
    {
      doc: "Legea 238/2024",
      article: "Art.6 alin.(1)-(3)",
      text: "Praguri minime pondere energie regenerabilă: 30% total, 10% la fața locului, max. 20% prin garanții de origine",
    },
    {
      doc: "Mc 001-2022",
      article: "§2.4 + Tabel 2.10a",
      text: "Valori maxime EP pentru încadrarea în categoria nZEB, pe categorii de clădiri și zone climatice (I-V)",
    },
    {
      doc: "Ord. MDLPA 348/2026",
      article: "Art.6 alin.(1) lit.c)",
      text: "Raportul de conformare nZEB privind cerințele minime de conformare a unei clădiri cu consum de energie aproape egal cu zero — atribut al auditorului energetic Grad I (AE Ici)",
    },
    {
      doc: "Ord. MDLPA 16/2023",
      article: "Anexa 1 + Anexa 2",
      text: "Metodologie de calcul al performanței energetice — conținut-cadru certificat și raport tehnic",
    },
  ];

  return {
    // Verdict
    compliant,
    verdict,
    verdictShort,
    color: compliant ? "#22c55e" : "#ef4444",

    // Valori calculate
    ep: Math.round(ep * 10) / 10,
    epMax: Math.round(epMax * 10) / 10,
    epDelta: Math.round(epDelta * 10) / 10,
    rer: Math.round(rer * 10) / 10,
    rerMin,
    rerOnsite: Math.round(rerOnsite * 10) / 10,
    rerOnsiteMin,

    // Status individual
    epOk,
    rerOk,
    rerOnsiteOk,

    // Context
    zone: climate.zone,
    zoneName: climate.name || "",
    category,
    baseCategory: baseCat,
    categoryLabel: thresholds.label || category,
    projectPhase,

    // Checks detaliate + gaps
    checks,
    gaps,
    recommendations,

    // Referințe
    references,

    // Auditor
    auditorValid,
    auditorNote,
  };
}


// ═══════════════════════════════════════════════════════════════
// Utilitar: prag nZEB pentru categorie + zonă (wrapper consistent)
// ═══════════════════════════════════════════════════════════════
export function getNZEBThreshold(category, zone) {
  const baseCat = BASE_CAT_FALLBACK[category] || category;
  const thr = NZEB_THRESHOLDS[baseCat] || NZEB_THRESHOLDS.AL;
  const epMax = getNzebEpMax(category, zone);
  return {
    category: baseCat,
    zone,
    ep_max: epMax,
    rer_min: thr.rer_min,
    rer_onsite_min: thr.rer_onsite_min,
    reference: "Mc 001-2022 Tabel 2.10a + Legea 238/2024 Art.6",
  };
}


// ═══════════════════════════════════════════════════════════════
// Utilitar: status sintetic pentru afișare UI inline (badge)
// ═══════════════════════════════════════════════════════════════
export function getNZEBStatusBadge(compliance) {
  if (!compliance) return { label: "Date insuficiente", color: "#94a3b8", icon: "?" };
  if (compliance.compliant) return { label: "CONFORM nZEB", color: "#22c55e", icon: "✓" };
  const criticalFails = compliance.checks.filter(c => !c.ok && c.severity === "error").length;
  if (criticalFails === 0) return { label: "APROAPE nZEB", color: "#eab308", icon: "~" };
  return { label: "NECONFORM nZEB", color: "#ef4444", icon: "✗" };
}
