/**
 * envelopeTemplates.js — 5 șabloane de anvelopă (refacere 27 apr 2026 v2).
 *
 * ABORDARE DERIVATĂ 100% DIN DEMO_PROJECTS:
 *   NU hardcodăm șabloanele. Referim cele 5 demo-uri v2 din `src/data/demoProjects.js`
 *   și extragem doar anvelopa ({opaque, glazing, bridges}), lăsând intacte celelalte
 *   date din proiectul curent (building, instalații, auditor).
 *
 * AVANTAJ:
 *   - Zero duplicare de date constructive (layers, Ψ, U).
 *   - Când un demo primește o actualizare normativă (ex. U refrecvent nou),
 *     șabloanele reflectă automat.
 *   - Fiecare șablon e validat prin teste e2e (`e2e/demo-models-end-to-end.spec.js`).
 *
 * SELECȚIE 5 TIPOLOGII (paleta RO acoperită prin zone climatice I→V):
 *   tpl-apt-pafp-vechi      → M1 (RA bloc PAFP '72 Constanța — clasă F, DH RADET)
 *   tpl-birouri-nzeb        → M2 (BI nZEB București 2024 — clasă A, CHP+PV)
 *   tpl-casa-bca-renovata   → M3 (RI BCA Cluj 1998/2015 — clasă D, CT cond.)
 *   tpl-scoala-reabilitata  → M4 (ED Brașov 1985/2022 — clasă B, CT central + PV)
 *   tpl-pensiune-lemn       → M5 (HC Predeal lemn 2010 — clasă C, peleți + solar)
 *
 * UTILIZARE:
 *   import { ENVELOPE_TEMPLATES, extractEnvelopeFromTemplate } from "./envelopeTemplates";
 *   const env = extractEnvelopeFromTemplate(tpl, DEMO_PROJECTS);
 *   setOpaqueElements(env.opaqueElements);
 *   setGlazingElements(env.glazingElements);
 *   setThermalBridges(env.thermalBridges);
 */

/**
 * Catalogul șabloanelor. Ordinea e stabilă și folosită în UI (RampInstant).
 * Fiecare entry conține metadata pentru afișare + index-ul în DEMO_PROJECTS.
 */
export const ENVELOPE_TEMPLATES = Object.freeze([
  {
    id: "tpl-apt-pafp-vechi",
    title: "Apartament bloc PAFP '70 — neanvelopat",
    tagline: "Panouri mari prefabricate 27 cm BA fără izolație, termopan vechi",
    category: "Rezidențial — vechi",
    icon: "🏢",
    demoIndex: 0,                // M1 Constanța
    uRange: "PE 1.45 · PL 1.50 · glaz 2.70",
  },
  {
    id: "tpl-birouri-nzeb",
    title: "Birouri nZEB curtain wall — clasă A",
    tagline: "Curtain wall triplu Low-E + fațadă ventilată vată 18 cm + terasă verde XPS 22 cm",
    category: "Nerezidențial — nZEB",
    icon: "🏙️",
    demoIndex: 1,                // M2 București
    uRange: "PE 0.18 · PT 0.13 · glaz 0.85",
  },
  {
    id: "tpl-casa-bca-renovata",
    title: "Casă BCA renovată parțial '98",
    tagline: "BCA 30 cm + EPS 5 cm (renovare 2015), PVC dublu Low-E argon",
    category: "Rezidențial — renovat parțial",
    icon: "🏡",
    demoIndex: 2,                // M3 Cluj
    uRange: "PE 0.42 · PT 0.32 · glaz 1.35",
  },
  {
    id: "tpl-scoala-reabilitata",
    title: "Școală reabilitată EPS 15 cm — POR",
    tagline: "Zidărie 38 cm + EPS 15 cm grafitat, terasă EPS 18 cm, triplu Low-E",
    category: "Nerezidențial — reabilitat",
    icon: "🏫",
    demoIndex: 3,                // M4 Brașov
    uRange: "PE 0.20 · PT 0.18 · glaz 1.10",
  },
  {
    id: "tpl-pensiune-lemn",
    title: "Pensiune lemn masiv montană",
    tagline: "Bârne brad 20 cm + vată internă 15 cm, acoperiș mansardat vată 25 cm",
    category: "Nerezidențial — lemn",
    icon: "🏔️",
    demoIndex: 4,                // M5 Predeal
    uRange: "PE 0.25 · PT 0.18 · glaz 1.30",
  },
]);

/**
 * Extrage anvelopa (opaque + glazing + bridges) dintr-un demo referit de șablon.
 * Aplică deep-clone pe array-uri pentru a nu strica starea originală din DEMO_PROJECTS.
 *
 * @param {Object} template - Entry din ENVELOPE_TEMPLATES.
 * @param {Array} demoProjects - Array-ul DEMO_PROJECTS (pasat, nu import direct,
 *                                pentru a evita dependență circulară cu energy-calc.jsx).
 * @returns {{opaqueElements: Array, glazingElements: Array, thermalBridges: Array}|null}
 */
export function extractEnvelopeFromTemplate(template, demoProjects) {
  if (!template || !Array.isArray(demoProjects)) return null;
  const demo = demoProjects[template.demoIndex];
  if (!demo) return null;

  // Deep-clone pentru a evita ca user-ul să modifice demo-ul original prin editare.
  return {
    opaqueElements: (demo.opaqueElements || []).map(el => ({
      ...el,
      layers: (el.layers || []).map(l => ({ ...l })),
    })),
    glazingElements: (demo.glazingElements || []).map(el => ({ ...el })),
    thermalBridges: (demo.thermalBridges || []).map(b => ({ ...b })),
  };
}

/**
 * Grupează șabloanele pe categoria afișată (pentru rendering cu headers).
 * @returns {Object<string, Array>} Mapa { categorie → lista șabloane }.
 */
export function groupTemplatesByCategory() {
  const groups = {};
  for (const tpl of ENVELOPE_TEMPLATES) {
    if (!groups[tpl.category]) groups[tpl.category] = [];
    groups[tpl.category].push(tpl);
  }
  return groups;
}
