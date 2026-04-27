/**
 * step8-pdf-exports.js — S30C
 *
 * Export PDF unificat pentru cele 13 module avansate Step 8:
 *   C1  PMV/PPD (SR EN ISO 7730:2005)
 *   C2  EN 12831-1/NA:2022 peak load
 *   C3  Pasivhaus check (delegă la pasivhaus-pdf.js)
 *   C4  BACS detaliat 200 factori (SR EN ISO 52120-1:2022)
 *   C5  SRI complet 42 servicii (Smart Readiness Indicator)
 *   C6  MEPS optimizator roadmap (EPBD Art.9 + BUILD UP)
 *   C7  Pașaport renovare detaliat (deja există passport-export.js)
 *   C8  Monte Carlo EP — incertitudini U/n50/COP
 *   C9  Thermovision — import imagini IR
 *   C10 Acoustic — LAeq C 125-2013
 *   C11 Cooling hourly — 8760h grafice
 *   C12 Shading dynamic — F_sh per oră
 *   C13 Night ventilation — free cooling EN 16798-9
 *
 * Toate folosesc generateAdvancedReportPDF (advanced-report-pdf.js) cu
 * format A4, font Liberation Sans (diacritice RO), header/footer Zephren,
 * referințe normative la final.
 *
 * Sprint 30 — apr 2026
 */

import { generateAdvancedReportPDF } from "./advanced-report-pdf.js";

/**
 * C1 — PMV/PPD (SR EN ISO 7730:2005 + Fanger 1970)
 * Standard NEACHIZIȚIONAT. Surse: Fanger 1970 + ASHRAE 55 + ISO 7730 formule publice.
 */
export async function exportPMVPDF(result, building) {
  if (!result) throw new Error("Rezultat PMV/PPD indisponibil");
  return generateAdvancedReportPDF({
    title: "Confort termic — PMV/PPD",
    subtitle: "Conform SR EN ISO 7730:2005 + Fanger 1970 + ASHRAE 55",
    building,
    sections: [
      {
        heading: "1. Indicii de confort PMV (Predicted Mean Vote)",
        paragraphs: [
          `PMV calculat: ${result.pmv?.toFixed(2) || "—"} (limită SR EN 16798-1 cat. II: −0.5 ≤ PMV ≤ +0.5)`,
          `PPD (Predicted Percentage Dissatisfied): ${result.ppd?.toFixed(1) || "—"} % (limită cat. II ≤ 10%)`,
          `Categorie confort: ${result.category || "—"} conform EN 16798-1 Anexa A.`,
        ],
      },
      {
        heading: "2. Parametri de calcul",
        table: {
          head: ["Parametru", "Valoare", "Unitate"],
          body: [
            ["Temperatura aer (Ta)",     result.ta?.toFixed(1) || "—",  "°C"],
            ["Temperatura radiantă (Tr)", result.tr?.toFixed(1) || "—",  "°C"],
            ["Umiditate relativă (RH)",   result.rh?.toFixed(0) || "—",  "%"],
            ["Viteză aer (Va)",           result.va?.toFixed(2) || "—",  "m/s"],
            ["Activitate metabolică (M)",  result.met?.toFixed(1) || "—", "met"],
            ["Izolație vestimentară (Icl)", result.clo?.toFixed(2) || "—", "clo"],
          ],
        },
      },
      {
        heading: "3. Verdict + recomandări",
        bullets: result.recommendations || [
          result.passed ? "Spațiul îndeplinește categoria II EN 16798-1 (recomandat clădiri noi)" : "Spațiul nu îndeplinește cat. II — vezi recomandări tehnice.",
          "Verificați C 107/7-2002 + NP 057-02: max 5 zile/an > limită confort.",
        ],
      },
    ],
    references: [
      "SR EN ISO 7730:2005 (neachiziționat ASRO) — formule Fanger 1970",
      "ASHRAE 55-2017 (validare paralelă)",
      "SR EN 16798-1:2019/NA:2019 — categorii confort interior",
      "C 107/7-2002 — confort termic clădiri RO (MDLPA)",
      "NP 057-2002 — performanța higrotermică (MDLPA)",
    ],
    filename: `pmv_ppd_${building?.address?.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 25) || "cladire"}`,
  });
}

/**
 * C2 — EN 12831-1/NA:2022 peak heating load.
 */
export async function exportEN12831PDF(result, building) {
  if (!result) throw new Error("Rezultat EN 12831 indisponibil");
  return generateAdvancedReportPDF({
    title: "Sarcină termică de vârf — SR EN 12831-1:2017/NA:2022",
    subtitle: "Calcul conform NA:2022 + corigendum C91:2024",
    building,
    sections: [
      {
        heading: "1. Sarcină totală de proiectare",
        paragraphs: [
          `Sarcina termică totală (Φ_H,design): ${result.phi_H_design?.toFixed(0) || "—"} W`,
          `Pierderi prin transmisie (H_T): ${result.H_T?.toFixed(1) || "—"} W/K`,
          `Pierderi prin sol (H_T_ground): ${result.H_T_ground?.toFixed(1) || "—"} W/K`,
          `Pierderi prin ventilare (H_V): ${result.H_V?.toFixed(1) || "—"} W/K`,
        ],
      },
      {
        heading: "2. Pierderi per element anvelopă",
        table: {
          head: ["Element", "Arie (m²)", "U (W/m²·K)", "τ", "Pierdere (W/K)"],
          body: (result.elementLoads || []).map(el => [
            el.name || "—",
            el.area?.toFixed(1) || "—",
            el.U?.toFixed(2) || "—",
            el.tau?.toFixed(2) || "—",
            el.load_WK?.toFixed(1) || "—",
          ]),
        },
      },
      {
        heading: "3. Recomandări dimensionare instalație",
        paragraphs: [
          `Putere recomandată boiler / pompă: ${(result.phi_H_design * 1.1 / 1000)?.toFixed(1) || "—"} kW (cu factor de siguranță 1.10).`,
        ],
      },
    ],
    references: [
      "SR EN 12831-1:2017/NA:2022 — Performanța energetică a clădirilor",
      "Corigendum C91:2024 — corecții factori sol fg1/fg2",
      "Mc 001-2022 — calcul termic RO",
    ],
    filename: `en12831_peak_${building?.address?.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 25) || "cladire"}`,
  });
}

/**
 * C4 — BACS detaliat 200 factori (SR EN ISO 52120-1:2022).
 */
export async function exportBACSDetailedPDF(result, building) {
  if (!result) throw new Error("Rezultat BACS indisponibil");
  return generateAdvancedReportPDF({
    title: "BACS — Building Automation Control Systems detaliat",
    subtitle: "Conform SR EN ISO 52120-1:2022 + L.238/2024 termen 1 ian 2025",
    building,
    sections: [
      {
        heading: "1. Clasă BACS și factor f_BAC",
        paragraphs: [
          `Clasa BACS curentă: ${result.bacsClass || "—"} (A/B/C/D conform ISO 52120-1)`,
          `Factor f_BAC aplicat: ${result.f_BAC?.toFixed(3) || "—"} pe Q_final.`,
          `Reducere energetică estimată: ${(result.savings_pct * 100)?.toFixed(0) || "—"} % față de clasa de referință.`,
        ],
      },
      {
        heading: "2. Servicii BACS detaliate (200 factori per ISO 52120-1 Anexa A)",
        table: {
          head: ["Domeniu", "Serviciu", "Factor", "Status"],
          body: (result.services || []).map(s => [
            s.domain || "—",
            s.service || "—",
            s.factor?.toFixed(3) || "—",
            s.implemented ? "✅ Activat" : "⚠️ Lipsă",
          ]),
        },
      },
      {
        heading: "3. Conformitate L.238/2024",
        paragraphs: [
          "Termenul L.238/2024 art.13: clădiri nerezidențiale > 290 kW termic trebuiau dotate cu BACS clasa C minim până la 1 ianuarie 2025.",
          result.compliant_L238 ? "Clădirea ÎNDEPLINEȘTE cerința L.238/2024." : "Clădirea NU îndeplinește L.238/2024 — recomandare upgrade BACS.",
        ],
      },
    ],
    references: [
      "SR EN ISO 52120-1:2022 — BACS impact on energy performance",
      "Legea 238/2024 art.13 — termen 1 ianuarie 2025",
      "EPBD 2024/1275 Art.13 — automation requirements",
    ],
    filename: `bacs_detaliat_${building?.address?.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 25) || "cladire"}`,
  });
}

/**
 * C5 — SRI (Smart Readiness Indicator) complet 42 servicii.
 */
export async function exportSRIDetailedPDF(result, building) {
  if (!result) throw new Error("Rezultat SRI indisponibil");
  return generateAdvancedReportPDF({
    title: "SRI — Smart Readiness Indicator (42 servicii)",
    subtitle: "Conform metodologie EU Comisia Europeană + EN 16484 (Considerent 53 EPBD)",
    building,
    sections: [
      {
        heading: "1. Scor SRI total",
        paragraphs: [
          `Scor SRI final: ${result.sri_score?.toFixed(0) || "—"} % (clasa ${result.sri_class || "—"})`,
          `Punctaj per dimensiune: Energie ${result.dim_energy?.toFixed(0) || "—"}%, Confort ${result.dim_comfort?.toFixed(0) || "—"}%, Accesibilitate ${result.dim_access?.toFixed(0) || "—"}%.`,
        ],
      },
      {
        heading: "2. Servicii implementate (per 7 domenii × 6 funcționalități)",
        table: {
          head: ["Domeniu", "Servicii activate", "Punctaj"],
          body: (result.domains || []).map(d => [
            d.name || "—",
            `${d.activeCount || 0}/${d.totalCount || 6}`,
            `${d.score?.toFixed(0) || "—"} %`,
          ]),
        },
      },
    ],
    references: [
      "EU SRI Methodology — energy.ec.europa.eu/smart-readiness-indicator",
      "EPBD 2024/1275 Considerent 53 — pregătire digitală clădiri",
      "EN 16484 — sisteme automatizare",
    ],
    filename: `sri_complet_${building?.address?.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 25) || "cladire"}`,
  });
}

/**
 * C6 — MEPS optimizator roadmap.
 */
export async function exportMEPSPDF(result, building) {
  if (!result) throw new Error("Rezultat MEPS indisponibil");
  return generateAdvancedReportPDF({
    title: "MEPS — Minimum Energy Performance Standards (roadmap)",
    subtitle: "Conform EPBD 2024/1275 Art.9 — fază 2030 / 2033 / 2050",
    building,
    sections: [
      {
        heading: "1. Status curent vs. ținte MEPS",
        paragraphs: [
          `EP curent: ${result.ep_current?.toFixed(1) || "—"} kWh/(m²·an)`,
          `Țintă 2030 (clasă E max): ${result.ep_2030?.toFixed(1) || "—"} kWh/(m²·an)`,
          `Țintă 2033 (clasă D max): ${result.ep_2033?.toFixed(1) || "—"} kWh/(m²·an)`,
          `Țintă 2050 (clasa A nZEB): ${result.ep_2050?.toFixed(1) || "—"} kWh/(m²·an)`,
        ],
      },
      {
        heading: "2. Pași roadmap recomandați",
        table: {
          head: ["Etapă", "An", "Măsuri", "Cost estimat (RON)", "EP după"],
          body: (result.steps || []).map(s => [
            s.phase || "—",
            s.deadline || "—",
            (s.measures || []).join(", "),
            s.cost_RON?.toLocaleString("ro-RO") || "—",
            `${s.ep_after?.toFixed(1) || "—"} kWh/(m²·an)`,
          ]),
        },
      },
    ],
    references: [
      "EPBD 2024/1275 Art.9 — Minimum Energy Performance Standards",
      "BUILD UP — Romania MEPS analysis 2024",
      "Mc 001-2022 + Ord. MDLPA 16/2023",
    ],
    filename: `meps_roadmap_${building?.address?.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 25) || "cladire"}`,
  });
}

/**
 * C8 — Monte Carlo EP cu incertitudini.
 */
export async function exportMonteCarloPDF(result, building) {
  if (!result) throw new Error("Rezultat Monte Carlo indisponibil");
  return generateAdvancedReportPDF({
    title: "Analiză Monte Carlo — Incertitudini EP",
    subtitle: "10.000 iterații cu distribuții Gaussiene pentru U, n50, COP, RER",
    building,
    sections: [
      {
        heading: "1. Distribuție EP",
        paragraphs: [
          `Media EP: ${result.ep_mean?.toFixed(1) || "—"} kWh/(m²·an)`,
          `Deviație standard: ${result.ep_std?.toFixed(1) || "—"} kWh/(m²·an)`,
          `Percentila 5: ${result.ep_p5?.toFixed(1) || "—"} (best case 5%)`,
          `Percentila 95: ${result.ep_p95?.toFixed(1) || "—"} (worst case 5%)`,
        ],
      },
      {
        heading: "2. Sensibilitate parametri (corelații)",
        table: {
          head: ["Parametru", "ρ (corelație cu EP)", "Impact %"],
          body: (result.sensitivities || []).map(s => [
            s.name || "—",
            s.rho?.toFixed(3) || "—",
            `${(s.impact * 100)?.toFixed(1) || "—"} %`,
          ]),
        },
      },
    ],
    references: [
      "Monte Carlo simulation — methodology Hopfe & Hensen 2011",
      "ISO 13790:2008 + ISO 52016-1:2017 — modele bază",
    ],
    filename: `monte_carlo_${building?.address?.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 25) || "cladire"}`,
  });
}

/**
 * C13 — Night ventilation / free cooling EN 16798-9.
 */
export async function exportNightVentPDF(result, building) {
  if (!result) throw new Error("Rezultat Night ventilation indisponibil");
  return generateAdvancedReportPDF({
    title: "Ventilare nocturnă — Free cooling EN 16798-9",
    subtitle: "Calcul potențial răcire pasivă pe 8760 ore",
    building,
    sections: [
      {
        heading: "1. Potențial free cooling",
        paragraphs: [
          `Ore eligibile: ${result.eligibleHours || 0} h/an (Te < 18°C noapte)`,
          `Energie răcire evitată: ${result.q_saved_kWh?.toFixed(0) || "—"} kWh/an`,
          `Schimb aer nocturn n_night: ${result.n_night?.toFixed(2) || "—"} h⁻¹`,
        ],
      },
    ],
    references: [
      "EN 16798-9 — Performance evaluation of buildings (free cooling)",
      "Mc 001-2022 — clima RO",
    ],
    filename: `night_vent_${building?.address?.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 25) || "cladire"}`,
  });
}

// Re-export pentru consum în Step8Advanced
export { exportPasivhausPDF } from "./pasivhaus-pdf.js";
