/**
 * pasivhaus-pdf.js — S30C·C3
 *
 * Generator PDF pentru raport Pasivhaus check (referință internă, NU certificat oficial PHI).
 *
 * Sursă: criterii Passivhaus Institut Darmstadt publice + PHPP-like.
 * IMPORTANT: Acest raport NU este un certificat oficial Pasivhaus. Pentru
 * certificare oficială clienții trebuie să contacteze un PHPP-certified consultant.
 *
 * Sprint 30 — apr 2026
 */

import { generateAdvancedReportPDF } from "./advanced-report-pdf.js";

/**
 * Generează raport PDF Pasivhaus din rezultatul checkPasivhaus().
 * @param {object} result - rezultat checkPasivhaus()
 * @param {object} building - { address, category, areaUseful }
 */
export async function exportPasivhausPDF(result, building) {
  if (!result) throw new Error("Rezultat Pasivhaus indisponibil");

  const c = result.criteria || {};
  const checks = result.checks || {};

  return generateAdvancedReportPDF({
    title: "Verificare standard Pasivhaus",
    subtitle: "Conform criterii Passivhaus Institut Darmstadt (PHPP 10) — referință internă",
    building,
    sections: [
      {
        heading: "1. Verdict global",
        paragraphs: [
          result.passed
            ? "✅ Clădirea ÎNDEPLINEȘTE criteriile Pasivhaus."
            : "⚠️ Clădirea NU îndeplinește toate criteriile Pasivhaus. Vezi tabelul detaliat de mai jos.",
          "Această verificare reflectă criteriile publice ale Passivhaus Institut. Pentru certificare oficială este necesar consultant PHPP autorizat.",
        ],
      },
      {
        heading: "2. Rezultate per criteriu",
        table: {
          head: ["Criteriu", "Valoare", "Limită PH", "Verdict"],
          body: [
            ["Q_inc anual",     `${result.qH_nd_m2?.toFixed(1) || "—"} kWh/(m²·an)`, `≤ ${c.qH_max || 15}`, checks.qH ? "✅" : "❌"],
            ["Sarcina vârf",    `${result.peakHeating_Wm2?.toFixed(1) || "—"} W/m²`,  `≤ ${c.peak_max || 10}`, checks.peak ? "✅" : "❌"],
            ["n50",             `${result.n50?.toFixed(2) || "—"} h⁻¹`,               `≤ ${c.n50_max || 0.6}`,  checks.n50 ? "✅" : "❌"],
            ["EP primar",       `${result.ep_primary_m2?.toFixed(1) || "—"} kWh/(m²·an)`, `≤ ${c.ep_max || 120}`, checks.ep ? "✅" : "❌"],
            ["Suprasolicitare termică", `${result.overheating_pct?.toFixed(1) || "—"} %`, `≤ ${c.overheating_max || 10}`, checks.overheating ? "✅" : "❌"],
          ],
        },
      },
      {
        heading: "3. Recomandări",
        bullets: result.recommendations || [
          "Asigurați n50 ≤ 0.6 h⁻¹ prin etanșare suplimentară.",
          "Verificați U pereți / acoperiș / podea ≤ 0.15 W/(m²·K).",
          "VMC dublu flux cu η_HRV ≥ 75% obligatoriu.",
          "Vitrare triplă cu Uw ≤ 0.85 + g ~ 0.50 (sud).",
          "Punți termice psi ≤ 0.01 W/(m·K) pe toate joncțiunile.",
        ],
      },
    ],
    references: [
      "Passivhaus Institut Darmstadt — criterii publice https://passivehouse.com",
      "PHPP 10 (Passive House Planning Package) — metodologie de proiectare",
      "EN ISO 13790:2008 — necesar de căldură anual (compatibilitate)",
      "Mc 001-2022 — calcul energetic clădiri RO",
    ],
    filename: `pasivhaus_${building?.address?.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 25) || "cladire"}`,
  });
}
