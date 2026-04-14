/**
 * bridgesCalc.js — Funcții pure extrase din WizardBridges.jsx.
 * Fără dependențe React — importabil direct în teste Vitest.
 */

import THERMAL_BRIDGES_DB from "../../../data/thermal-bridges.json";

// ── Categorii principale (top 6) ─────────────────────────────────────────────
export const MAIN_CATEGORIES = [
  { id: "Joncțiuni pereți", icon: "🧱", label: "Joncțiuni pereți",
    hint: "Planșee, colțuri, socluri, subsol" },
  { id: "Ferestre",         icon: "🪟", label: "Ferestre & glafuri",
    hint: "Perimetrul tâmplăriei, praguri, pervazuri" },
  { id: "Balcoane",         icon: "🏛", label: "Balcoane & logii",
    hint: "Console, parapeți, ruptoare termice" },
  { id: "Acoperiș",         icon: "🏠", label: "Acoperiș & cornișe",
    hint: "Coame, streașini, luminatoare, atice" },
  { id: "Stâlpi/grinzi",    icon: "📏", label: "Stâlpi & grinzi",
    hint: "Structură beton/metalică în perete" },
  { id: "Instalații",       icon: "⚙️", label: "Instalații",
    hint: "Țevi, canale, coșuri, casete rolete" },
];

/**
 * Returnează primele 4 punți termice din categoria specificată.
 * @param {string} catId - ID-ul categoriei (din MAIN_CATEGORIES)
 * @returns {Array} max 4 bridge-uri cu { name, psi, cat, ... }
 */
export function getQuickPicks(catId) {
  const all = THERMAL_BRIDGES_DB.filter(b => b.cat === catId);
  return all.slice(0, 4);
}

/**
 * Estimează lungimea sugerată (m) pentru o punte termică pe baza geometriei clădirii.
 * @param {string} bridgeName - Numele punții (din thermal-bridges.json)
 * @param {Object} building   - Date clădire (building.areaUseful)
 * @returns {string} lungime estimată ca string (pentru input default)
 */
export function suggestLength(bridgeName, building) {
  const perim = 4 * Math.sqrt(parseFloat(building?.areaUseful) || 100);
  if (bridgeName.includes("Planșeu intermediar"))   return (perim * 0.8).toFixed(1);
  if (bridgeName.includes("Planșeu terasă"))        return perim.toFixed(1);
  if (bridgeName.includes("Planșeu peste subsol"))  return perim.toFixed(1);
  if (bridgeName.includes("Soclu"))                 return perim.toFixed(1);
  if (bridgeName.includes("Colț"))                  return "10";
  if (bridgeName.includes("Glaf"))                  return "24";
  if (bridgeName.includes("Prag"))                  return "4";
  if (bridgeName.includes("Consolă"))               return "8";
  if (bridgeName.includes("Cornișă"))               return perim.toFixed(1);
  if (bridgeName.includes("Coamă"))                 return (perim * 0.4).toFixed(1);
  if (bridgeName.includes("Atic"))                  return perim.toFixed(1);
  if (bridgeName.includes("Stâlp"))                 return "12";
  if (bridgeName.includes("Grindă"))                return "6";
  if (bridgeName.includes("Țeavă") || bridgeName.includes("Canal")) return "2";
  if (bridgeName.includes("Coș"))                   return "8";
  if (bridgeName.includes("Roletă"))                return "6";
  return "5";
}
