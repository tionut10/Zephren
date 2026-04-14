/**
 * assistantEngine.js — Funcții pure extrase din EnvelopeAssistant.jsx.
 * Fără dependențe React — importabil direct în teste Vitest.
 *
 * Motor heuristic LOCAL (fără LLM extern) pentru verificări anvelopă.
 */

import { computeEnvelopeProgress } from "../EnvelopeProgress.js";

// ── U_REF tables (Mc 001-2022) ────────────────────────────────────────────────
export const U_REF_NZEB_RES  = { PE: 0.25, PR: 0.67, PS: 0.29, PT: 0.15, PP: 0.15, PB: 0.29, PL: 0.20, SE: 0.20 };
export const U_REF_NZEB_NRES = { PE: 0.33, PR: 0.80, PS: 0.35, PT: 0.17, PP: 0.17, PB: 0.35, PL: 0.22, SE: 0.22 };
export const U_REF_GLAZING_RES  = 1.11;
export const U_REF_GLAZING_NRES = 1.20;

// ── Preset prompts ────────────────────────────────────────────────────────────
export const PRESET_PROMPTS = [
  { id: "missing",     icon: "🔍", text: "Ce elemente am uitat?" },
  { id: "conformity",  icon: "✓",  text: "Verifică-mi conformitatea U" },
  { id: "improve-g",   icon: "📈", text: "Pot îmbunătăți G-ul?" },
  { id: "analyze-all", icon: "🧭", text: "Analizează-mi anvelopa" },
];

/**
 * Returnează U_ref nZEB pentru un element opac.
 */
export function getURefNZEB(category, type) {
  const isRes = ["RI", "RC", "RA"].includes(category);
  const ref = isRes ? U_REF_NZEB_RES : U_REF_NZEB_NRES;
  return ref[type] ?? null;
}

/**
 * Verifică dacă categoria de clădire este rezidențială.
 */
export function isResidential(category) {
  return ["RI", "RC", "RA"].includes(category);
}

/**
 * Detectează intenția din text liber → intent preset.
 * @param {string} text
 * @returns {"missing"|"conformity"|"improve-g"|"analyze-all"}
 */
export function detectIntent(text) {
  const t = text.toLowerCase();
  if (/uit|lipse|lipsa|ce.*mai.*adaug|mai.*trebui|ce.*mai.*fac/.test(t))     return "missing";
  if (/conform|u.max|u'max|verifi.*u|respect.*nzeb|depa.*referin/.test(t))   return "conformity";
  if (/imbunat|îmbunăt|optimiz|cum.*redu.*g|scad.*g|coefic.*g|cres.*g/.test(t)) return "improve-g";
  if (/analiz|verific.*anvelop|sumar|raport|stare/.test(t))                  return "analyze-all";
  return "analyze-all"; // default friendly
}

/**
 * Generează răspuns heuristic pe baza intenției și contextului anvelopei.
 *
 * @param {"missing"|"conformity"|"improve-g"|"analyze-all"} intent
 * @param {Object} ctx
 * @param {Array}    ctx.opaqueElements
 * @param {Array}    ctx.glazingElements
 * @param {Array}    ctx.thermalBridges
 * @param {Object}   ctx.building
 * @param {Object}   ctx.envelopeSummary    - { G, totalArea, volume }
 * @param {Function} ctx.calcOpaqueR        - (layers, type) => { u, r_total }
 * @returns {{ title: string, lines: string[], actions: Array }}
 */
export function generateResponse(intent, ctx) {
  const { opaqueElements, glazingElements, thermalBridges, building, envelopeSummary, calcOpaqueR } = ctx;
  const cat = building?.category;
  const progress = computeEnvelopeProgress({ opaqueElements, glazingElements, thermalBridges, building, calcOpaqueR });

  // ── INTENT: „Ce am uitat?" ──────────────────────────────────────────────────
  if (intent === "missing") {
    const missing = progress.missing;
    if (missing.length === 0) {
      return {
        title: "🎉 Anvelopa pare completă",
        lines: [
          "Toate cele 10 verificări esențiale sunt bifate. Continuă cu Pasul 3 (instalații).",
        ],
        actions: [],
      };
    }
    const orientations = new Set((opaqueElements || [])
      .filter(el => el.type === "PE")
      .map(el => el.orientation));
    const missingOrient = ["N", "S", "E", "V"].filter(o => !orientations.has(o) && orientations.size > 0);

    const lines = [
      `Lipsesc **${missing.length} / 10** verificări:`,
      ...missing.slice(0, 5).map(m => `• ${m.label}`),
    ];
    if (missingOrient.length > 0 && opaqueElements?.length > 0) {
      lines.push(`📍 Pereți exteriori pe orientările: **${missingOrient.join(", ")}** (verifică dacă e cazul)`);
    }

    const actions = [];
    if (missing.some(m => m.key === "hasGlazing"))    actions.push({ label: "+ Adaugă vitraj", kind: "glazing" });
    if (missing.some(m => m.key === "hasBridges"))    actions.push({ label: "+ Pachet 5 punți", kind: "bridges" });
    if (missing.some(m => ["opaqueCount","hasExternalWall","hasRoof","hasFloor"].includes(m.key)))
                                                      actions.push({ label: "+ Adaugă element opac", kind: "opaque" });

    return { title: "🔍 Lipsuri detectate", lines, actions };
  }

  // ── INTENT: „Conformitate U" ────────────────────────────────────────────────
  if (intent === "conformity") {
    const nonCompOpaque = [];
    (opaqueElements || []).forEach(el => {
      if (!calcOpaqueR) return;
      try {
        const { u } = calcOpaqueR(el.layers, el.type) || {};
        const uRef = getURefNZEB(cat, el.type);
        if (Number.isFinite(u) && uRef && u > uRef) {
          nonCompOpaque.push({ name: el.name, u: u.toFixed(3), uRef: uRef.toFixed(2), type: el.type });
        }
      } catch {/* ignore */}
    });

    const nonCompGlazing = [];
    const uRefGlazing = isResidential(cat) ? U_REF_GLAZING_RES : U_REF_GLAZING_NRES;
    (glazingElements || []).forEach(el => {
      const u = parseFloat(el.u);
      if (Number.isFinite(u) && u > uRefGlazing) {
        nonCompGlazing.push({ name: el.name, u: u.toFixed(2), uRef: uRefGlazing.toFixed(2) });
      }
    });

    if ((opaqueElements?.length || 0) === 0 && (glazingElements?.length || 0) === 0) {
      return {
        title: "⏳ Nu pot verifica încă",
        lines: ["Adaugă întâi cel puțin un element (opac sau vitrat)."],
        actions: [{ label: "+ Adaugă element opac", kind: "opaque" }],
      };
    }

    if (nonCompOpaque.length === 0 && nonCompGlazing.length === 0) {
      return {
        title: "✅ Toate elementele sunt CONFORME",
        lines: [
          `Referință utilizată: ${isResidential(cat) ? "nZEB rezidențial" : "nZEB nerezidențial"} (Mc 001-2022).`,
          `Verificate: ${opaqueElements?.length || 0} opace + ${glazingElements?.length || 0} vitrate.`,
        ],
        actions: [],
      };
    }

    const lines = [];
    if (nonCompOpaque.length > 0) {
      lines.push(`**${nonCompOpaque.length} elemente opace** depășesc U'max:`);
      nonCompOpaque.slice(0, 4).forEach(e => {
        lines.push(`• ${e.name} — U=${e.u} > ${e.uRef} (${e.type})`);
      });
    }
    if (nonCompGlazing.length > 0) {
      lines.push(`**${nonCompGlazing.length} elemente vitrate** depășesc U'max (${uRefGlazing.toFixed(2)}):`);
      nonCompGlazing.slice(0, 4).forEach(e => {
        lines.push(`• ${e.name} — U=${e.u}`);
      });
    }
    lines.push("💡 Sugestii: adaugă termoizolație suplimentară sau schimbă tipul vitrajului cu Low-E.");

    return {
      title: "⚠️ Neconformități U detectate",
      lines,
      actions: [{ label: "Vezi tabel conformitate", kind: "scroll-compliance" }],
    };
  }

  // ── INTENT: „Îmbunătățire G" ────────────────────────────────────────────────
  if (intent === "improve-g") {
    if (!envelopeSummary || envelopeSummary.G <= 0) {
      return {
        title: "⏳ G nu e calculat încă",
        lines: ["Completează elemente opace + vitrate + volum (Pasul 1) pentru a obține G."],
        actions: [],
      };
    }
    const G = envelopeSummary.G;
    const lines = [`Coeficientul G actual: **${G.toFixed(3)} W/(m³·K)**`];
    if (G < 0.5) {
      lines.push("✨ Excelent — G-ul este sub 0.5, ceea ce indică o anvelopă foarte performantă (nZEB-ready).");
    } else if (G < 0.8) {
      lines.push("📊 Acceptabil — G între 0.5-0.8. Îmbunătățiri posibile:");
      lines.push("• Mărește grosimea termoizolației la pereți (min. 15 cm EPS/vată)");
      lines.push("• Trece la triplu vitraj Low-E (U ≤ 0.7)");
      lines.push("• Rezolvă punțile termice majore (console balcon, ruptoare Schöck)");
    } else {
      lines.push("⚠️ G > 0.8 — anvelopa necesită intervenții majore:");
      lines.push("• Termosistem obligatoriu (ETICS, min. 10 cm EPS)");
      lines.push("• Schimbă toate ferestrele (min. dublu vitraj Low-E)");
      lines.push("• Identifică și corectează toate punțile termice majore");
    }

    const area = envelopeSummary.totalArea;
    const volume = envelopeSummary.volume;
    if (area > 0 && volume > 0) {
      const av = area / volume;
      lines.push(`📐 Raport A/V = ${av.toFixed(2)} m⁻¹ — ${av < 0.6 ? "compact, favorabil" : av > 1.0 ? "dispersat, defavorabil" : "normal"}`);
    }

    return { title: "📈 Analiză G", lines, actions: [] };
  }

  // ── INTENT: „Analiză generală" ──────────────────────────────────────────────
  if (intent === "analyze-all") {
    const lines = [
      `📊 **Progres Step 2**: ${progress.filled}/${progress.total} (${progress.pct}%)`,
      `🏗 Elemente: ${opaqueElements?.length || 0} opace · ${glazingElements?.length || 0} vitrate · ${thermalBridges?.length || 0} punți`,
    ];

    if (envelopeSummary?.G > 0) {
      lines.push(`📉 Coeficient G: ${envelopeSummary.G.toFixed(3)} W/(m³·K)`);
    }

    if (progress.missing.length > 0) {
      lines.push(``);
      lines.push(`⚠️ Lipsesc ${progress.missing.length} verificări — folosește „Ce elemente am uitat?"`);
    } else {
      lines.push(``);
      lines.push(`✅ Toate gate-urile de bază sunt bifate.`);
    }

    const peByOrientation = {};
    (opaqueElements || []).filter(el => el.type === "PE").forEach(el => {
      peByOrientation[el.orientation] = (peByOrientation[el.orientation] || 0) + 1;
    });
    const orientations = Object.keys(peByOrientation);
    if (orientations.length > 0) {
      lines.push(``);
      lines.push(`🧭 Pereți exteriori pe orientări: ${orientations.sort().join(", ")} (${orientations.length} direcții)`);
      if (orientations.length < 4) {
        lines.push(`   💡 Tipic, o clădire are pereți pe 4 direcții cardinale (N/S/E/V).`);
      }
    }

    return { title: "🧭 Analiză anvelopă", lines, actions: [] };
  }

  // ── Fallback ────────────────────────────────────────────────────────────────
  return {
    title: "🤔 Nu am înțeles",
    lines: ["Încearcă unul din prompturile preset de mai jos."],
    actions: [],
  };
}
