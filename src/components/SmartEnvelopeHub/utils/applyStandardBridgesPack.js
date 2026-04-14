/**
 * applyStandardBridgesPack.js — pachet standard de 5 punți termice liniare.
 *
 * DECIZIE UX aprobată (D1, envelope_hub_design.md, 14.04.2026):
 *   Auto-generate 5 punți termice standard DA, cu avertisment mare „estimare
 *   orientativă — verifică cu auditor" deasupra. Nu aplicare fără consimțământ.
 *
 * CELE 5 PUNȚI STANDARD (cele mai comune pentru clădiri rezidențiale RO):
 *   1. Joncțiune perete exterior – planșeu terasă (PE-PT)
 *   2. Joncțiune perete exterior – planșeu pe sol (PE-PL)
 *   3. Colț vertical exterior (colț între 2 pereți PE)
 *   4. Glaf fereastră (perimetru total ferestre)
 *   5. Consolă balcon (dacă există balcon declarat)
 *
 * VALORI Ψ implicite (din C 107/7-2002 + catalog tipic RO, edificii izolate):
 *   PE-PT       : 0.35 W/(m·K)  (acoperiș terasă cu izolație externă)
 *   PE-PL       : 0.45 W/(m·K)  (planșeu pe sol — punte severă)
 *   colț ext    : 0.10 W/(m·K)  (colț vertical peste 2.5 m înălțime)
 *   glaf geam   : 0.10 W/(m·K)  (cu tâmplărie performantă, cadru izolat)
 *   balcon      : 0.70 W/(m·K)  (consolă BA continuă, fără rupere)
 *
 * Lungimile se derivă din geometria clădirii (Step 1 + glazing existente):
 *   - L_PE-PT / L_PE-PL = perimetru (folosit pe 2 niveluri: acoperiș și sol)
 *   - L_colt = 4 colțuri × heightBuilding (tipic 4 colțuri × 10 m)
 *   - L_glaf = sumă perimetre ferestre (fiecare 4×sqrt(A))
 *   - L_balcon = 1.2 m per etaj (dacă există atribut `balconyLength`)
 *
 * TOTUL e ESTIMARE — warning explicit la UI (D1).
 */

/**
 * Estimează perimetrul clădirii. Folosește `building.perimeter` dacă e setat;
 * altfel derivă din `areaEnvelope` presupunând clădire pătrată cu 2 etaje.
 */
function estimatePerimeter(building) {
  const p = parseFloat(building?.perimeter);
  if (Number.isFinite(p) && p > 0) return p;
  const a = parseFloat(building?.areaEnvelope);
  if (Number.isFinite(a) && a > 0) {
    // Heuristic: area pereți ≈ 70% anvelopă → area = perimeter × height
    const h = parseFloat(building?.heightBuilding) || 10;
    return (a * 0.70) / h;
  }
  return 30; // fallback foarte defensiv
}

/**
 * Estimează perimetrul total al ferestrelor din glazingElements.
 * Pentru fiecare fereastră aproximăm perimetrul = 4 × √aria (pătrată).
 */
function estimateGlazingPerimeter(glazingElements) {
  if (!Array.isArray(glazingElements)) return 0;
  return glazingElements.reduce((sum, el) => {
    const area = parseFloat(el?.area);
    if (!Number.isFinite(area) || area <= 0) return sum;
    return sum + 4 * Math.sqrt(area);
  }, 0);
}

/**
 * Estimează lungimea consolelor balcoanelor.
 * Folosește `building.balconyLength` dacă e setat; altfel derivă 1.2 m × floors
 * doar dacă clădirea e rezidențială (categorii RI/RC/RA).
 */
function estimateBalconyLength(building) {
  const declared = parseFloat(building?.balconyLength);
  if (Number.isFinite(declared) && declared > 0) return declared;
  const isResidential = ["RI", "RC", "RA"].includes(building?.category);
  if (!isResidential) return 0;
  const floors = parseInt(building?.floors) || 1;
  return floors * 1.2;
}

/**
 * Generează pachetul standard de 5 punți termice.
 *
 * @param {Object} building - Date clădire (Step 1).
 * @param {Array} [glazingElements=[]] - Elemente vitrate pentru estimare glaf.
 * @returns {Array<Object>} Lista cu 4-5 punți (balconul doar dacă aplicabil).
 */
export function applyStandardBridgesPack(building, glazingElements = []) {
  const perimeter     = estimatePerimeter(building);
  const heightBuild   = parseFloat(building?.heightBuilding) || 10;
  const glazingPerim  = estimateGlazingPerimeter(glazingElements);
  const balconyLength = estimateBalconyLength(building);

  const bridges = [
    {
      name: "Joncțiune perete exterior — planșeu terasă",
      type: "PE-PT",
      cat: "Joncțiuni planșeu",
      psi: "0.35",
      length: perimeter.toFixed(1),
    },
    {
      name: "Joncțiune perete exterior — planșeu pe sol",
      type: "PE-PL",
      cat: "Joncțiuni planșeu",
      psi: "0.45",
      length: perimeter.toFixed(1),
    },
    {
      name: "Colț vertical exterior",
      type: "CV",
      cat: "Colțuri",
      psi: "0.10",
      length: (4 * heightBuild).toFixed(1),
    },
    {
      name: "Glaf fereastră",
      type: "GF",
      cat: "Tâmplărie",
      psi: "0.10",
      length: glazingPerim > 0 ? glazingPerim.toFixed(1) : "24",
    },
  ];

  if (balconyLength > 0) {
    bridges.push({
      name: "Consolă balcon",
      type: "CB",
      cat: "Console",
      psi: "0.70",
      length: balconyLength.toFixed(1),
    });
  }

  return bridges;
}

/**
 * Textul warning-ului D1 — afișat inline înainte de a confirma aplicarea.
 */
export const STANDARD_BRIDGES_PACK_WARNING =
  "Pachetul este o estimare orientativă bazată pe tipologie RO uzuală (C 107/7-2002). " +
  "Valorile Ψ și lungimile sunt calculate automat din geometria Step 1. " +
  "Verifică cu auditor acreditat și ajustează Ψ din catalogul 165 SVG pentru proiectul tău concret.";
