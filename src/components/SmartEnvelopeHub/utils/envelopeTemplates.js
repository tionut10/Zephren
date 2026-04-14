/**
 * envelopeTemplates.js — 8 șabloane de anvelopă tipologii RO.
 *
 * ABORDARE DERIVATĂ 100% DIN DEMO_PROJECTS (decizie S3, 14.04.2026):
 *   NU hardcodăm șabloanele. În schimb, referim 8 demo-uri reprezentative din
 *   `src/data/demoProjects.js` și extragem doar anvelopa ({opaque, glazing, bridges}),
 *   lăsând intacte celelalte date din proiectul curent (building, instalații, auditor).
 *
 * AVANTAJ:
 *   - Zero duplicare de date constructive (layers, Ψ, U).
 *   - Când un demo primește o actualizare normativă (ex. U refrecvent nou),
 *     șabloanele reflectă automat.
 *   - Fiecare șablon e validat ca parte din testele e2e existente (16 Playwright).
 *
 * SELECȚIE (8 tipologii care acoperă paleta RO):
 *   tpl-apt-pafp         → demo 1  (RA 1978 PAFP București — clasă D)
 *   tpl-casa-lemn        → demo 11 (RI lemn tradițional Sibiu 1935 — clasă E)
 *   tpl-casa-nzeb        → demo 2  (RI nZEB Timișoara 2024 — clasă A)
 *   tpl-bloc-reabilitat  → demo 3  (RC reabilitat Iași 1975/2018 — clasă C)
 *   tpl-bloc-nzeb        → demo 19 (RC premium nZEB Cluj 2025 — clasă A)
 *   tpl-birouri-modern   → demo 13 (BI Bacău 2015 — clasă B)
 *   tpl-scoala-reabilit  → demo 5  (ED reabilitată Cluj 1972/2021 — clasă B)
 *   tpl-hala-industrial  → demo 15 (IN Pitești 2018 — clasă C)
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
    id: "tpl-apt-pafp",
    title: "Apartament bloc PAFP '70",
    tagline: "Panouri mari prefabricate, EPS 14 cm, dublu vitraj",
    category: "Rezidențial — vechi",
    icon: "🏢",
    demoIndex: 0,   // demo 1
    uRange: "PE 0.35 · PT nu are · glaz 1.40",
  },
  {
    id: "tpl-casa-lemn",
    title: "Casă lemn tradițională",
    tagline: "Bârne 20 cm, acoperiș mansardat vată, punți reduse",
    category: "Rezidențial — vechi",
    icon: "🏡",
    demoIndex: 10,  // demo 11
    uRange: "PE ~0.55 · PT 0.25 · glaz 1.30",
  },
  {
    id: "tpl-casa-nzeb",
    title: "Casă nZEB pasivă",
    tagline: "Porotherm + vată 25 cm, triplu vitraj Low-E, punți minime",
    category: "Rezidențial — nZEB",
    icon: "🌿",
    demoIndex: 1,   // demo 2
    uRange: "PE 0.12 · PT 0.09 · glaz 0.70",
  },
  {
    id: "tpl-bloc-reabilitat",
    title: "Bloc reabilitat EPS 10 cm",
    tagline: "BCA + EPS, acoperiș terasă vată, ferestre PVC",
    category: "Rezidențial — reabilitat",
    icon: "🧱",
    demoIndex: 2,   // demo 3
    uRange: "PE 0.30 · PT 0.22 · glaz 1.30",
  },
  {
    id: "tpl-bloc-nzeb",
    title: "Bloc nZEB premium 2025",
    tagline: "Porotherm + vată 20 cm, triplu vitraj 2×Low-E, punți eliminate",
    category: "Rezidențial — nZEB",
    icon: "✨",
    demoIndex: 18,  // demo 19
    uRange: "PE 0.15 · PT 0.10 · glaz 0.80",
  },
  {
    id: "tpl-birouri-modern",
    title: "Birouri modern clasă B",
    tagline: "Structură metalică, fațadă ventilată, dublu Low-E",
    category: "Nerezidențial",
    icon: "🏢",
    demoIndex: 12,  // demo 13
    uRange: "PE 0.25 · PT 0.18 · glaz 1.10",
  },
  {
    id: "tpl-scoala-reabilit",
    title: "Școală reabilitată '70",
    tagline: "Zidărie portantă + EPS 15 cm, geamuri PVC, terasă izolată",
    category: "Nerezidențial",
    icon: "🏫",
    demoIndex: 4,   // demo 5
    uRange: "PE 0.28 · PT 0.20 · glaz 1.40",
  },
  {
    id: "tpl-hala-industrial",
    title: "Hală industrială izolată",
    tagline: "Panou sandwich PUR, policarbonat, Ψ colț moderat",
    category: "Nerezidențial",
    icon: "🏭",
    demoIndex: 14,  // demo 15
    uRange: "PE 0.28 · PT 0.24 · glaz 2.00",
  },
]);

/**
 * Extrage anvelopa (opaque + glazing + bridges) dintr-un demo referit de șablon.
 * Aplică shallow-clone pe array-uri pentru a nu strica starea originală din DEMO_PROJECTS.
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
