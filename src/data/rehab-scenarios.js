/**
 * rehab-scenarios.js — Sprint P0-C (6 mai 2026) P1-04
 *
 * SURSĂ CANONICĂ pentru scenarii de reabilitare (preset-uri).
 *
 * Înainte de Sprint P0-C existau DOUĂ surse cu valori CONFLICTUALE pentru
 * aceleași denumiri:
 *   - energy-calc.jsx:438-442  multiScenarios (Minim wall=10cm, Mediu=15cm, Maxim=20cm)
 *   - energy-calc.jsx:1704-1708 SCENARIO_PRESETS (MINIM=5cm, MEDIU=10cm, MAXIM=15cm)
 *
 * Sprint P0-C unifică la valorile SCENARIO_PRESETS (mai prudente, aliniate cu
 * minimul reglementar): MINIM 5cm pereți (obligatoriu), MEDIU 10cm (recomandat
 * Mc 001-2022), MAXIM 15cm (nZEB Tab 2.4 nZEB rezidențial U_perete ≤ 0.30).
 *
 * Filozofie:
 *   - MINIM = pragul jos absolut acceptat de C107 (transitie 5cm legacy CT-stil)
 *   - MEDIU = recomandat pentru proiect renovare clasică PNRR (10cm + tâmplărie)
 *   - MAXIM = nZEB conform Mc 001-2022 (15cm + ventilare HR + PV + HP)
 */

export const SCENARIO_PRESETS = [
  {
    id: "MINIM",
    label: "Minim (obligatoriu)",
    name: "Minim",
    addInsulWall: true,    insulWallThickness: "5",
    addInsulRoof: true,    insulRoofThickness: "8",
    addInsulBasement: false, insulBasementThickness: "0",
    replaceWindows: false, newWindowU: "1.40",
    addHR: false,          hrEfficiency: "0",
    addPV: false,          pvArea: "0",
    addHP: false,          hpCOP: "3.5",
    addSolarTh: false,     solarThArea: "0",
  },
  {
    id: "MEDIU",
    label: "Mediu (recomandat)",
    name: "Mediu",
    addInsulWall: true,    insulWallThickness: "10",
    addInsulRoof: true,    insulRoofThickness: "15",
    addInsulBasement: true, insulBasementThickness: "8",
    replaceWindows: true,  newWindowU: "0.90",
    addHR: true,           hrEfficiency: "80",
    addPV: true,           pvArea: "20",
    addHP: false,          hpCOP: "4.0",
    addSolarTh: true,      solarThArea: "6",
  },
  {
    id: "MAXIM",
    label: "Maxim (nZEB)",
    name: "Maxim (nZEB)",
    addInsulWall: true,    insulWallThickness: "15",
    addInsulRoof: true,    insulRoofThickness: "25",
    addInsulBasement: true, insulBasementThickness: "12",
    replaceWindows: true,  newWindowU: "0.70",
    addHR: true,           hrEfficiency: "90",
    addPV: true,           pvArea: "40",
    addHP: true,           hpCOP: "4.5",
    addSolarTh: true,      solarThArea: "10",
  },
];

/**
 * Returnează un preset după id (MINIM/MEDIU/MAXIM).
 * @param {string} id
 * @returns {object|null}
 */
export function getScenarioPreset(id) {
  return SCENARIO_PRESETS.find(p => p.id === id) || null;
}

/**
 * Returnează lista de scenarii pentru tabelul comparativ multiScenarios.
 * Format adaptat pentru render React (id + name + flags).
 */
export function getMultiScenariosCompact() {
  return SCENARIO_PRESETS.map(p => ({
    id: p.id === "MINIM" ? "S1" : p.id === "MEDIU" ? "S2" : "S3",
    name: p.name,
    addInsulWall: p.addInsulWall,
    insulWallThickness: p.insulWallThickness,
    addInsulRoof: p.addInsulRoof,
    insulRoofThickness: p.insulRoofThickness,
    replaceWindows: p.replaceWindows,
    newWindowU: p.newWindowU,
    addPV: p.addPV,
    pvArea: p.pvArea,
    addHP: p.addHP,
    hpCOP: p.hpCOP,
    addHR: p.addHR,
    hrEfficiency: p.hrEfficiency,
  }));
}
