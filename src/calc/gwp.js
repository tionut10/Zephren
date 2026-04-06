// ═══════════════════════════════════════════════════════════════
// GWP LIFECYCLE — EN 15978:2011 detaliat pe materiale
// Module: A1-A3 (producție), A4-A5 (transport+execuție),
//         B1-B3 (utilizare/reparații), B4 (înlocuire),
//         C3-C4 (dezasamblare+eliminare), D (reciclare credit)
// ═══════════════════════════════════════════════════════════════
import _gwpData from "../data/gwp-factors.json";

export const GWP_FACTORS = _gwpData.GWP_FACTORS;
export const GWP_GLAZING = _gwpData.GWP_GLAZING;

// Materiale izolante care pot necesita înlocuire după 30 de ani (EN 15978 §B.4.7)
const INSULATION_KEYWORDS = [
  "EPS","XPS","PUR","PIR","Vată minerală","Vată de sticlă","Celuloză","Cânepă","Lână",
  "Perlită","Plută","Aerogel","VIP","Vacuum","spumă","foam","Fibră de lemn",
];
function isInsulationMaterial(name) {
  if (!name) return false;
  var n = name.toLowerCase();
  return INSULATION_KEYWORDS.some(function(k) { return n.includes(k.toLowerCase()); });
}

// Factori transport A4 estimați [kgCO2eq/kg·km] × distanță medie
// Distanță medie aprovizionare materiale în România: 200–400 km
const TRANSPORT_FACTOR = 0.0001; // kgCO2eq/(kg·km) — transport rutier Euro VI
const TRANSPORT_DIST_KM = 300;   // distanță medie aprovizionare [km]

// Factor execuție A5 — emisii instalare [% din A1-A3]
const A5_FACTOR = 0.05; // 5% din emisiile de producție (deșeuri, echipamente șantier)

// Factori reparații/întreținere B2-B3 per material [kgCO2eq/an·kg]
// Finisaje: revopsire la 10 ani; structură: minimă mentenanță
const B_MAINT_FACTOR = 0.002; // 0.2%/an din emisiile de producție

export function calcGWPDetailed(opaqueElements, glazingElements, areaUseful, lifetime) {
  if (!opaqueElements?.length || !areaUseful) return null;
  lifetime = lifetime || 50; // ani
  let totalGWP_A1A3 = 0; // producție
  let totalGWP_A4 = 0;   // transport
  let totalGWP_A5 = 0;   // execuție
  let totalGWP_B2B3 = 0; // reparații/întreținere (B2-B3)
  let totalGWP_B4 = 0;   // înlocuire (B4)
  let totalGWP_C = 0;    // C3-C4 dezasamblare + eliminare
  let totalGWP_D = 0;    // D reciclare (credit)
  const details = [];

  opaqueElements.forEach(el => {
    const area = parseFloat(el.area) || 0;
    (el.layers || []).forEach(layer => {
      const d = (parseFloat(layer.thickness) || 0) / 1000; // m
      const rho = layer.rho || 1500;
      const mass = area * d * rho; // kg
      const matName = layer.material || layer.matName || "";
      const gwpFactor = GWP_FACTORS[matName] || 0.15;
      const gwp_a1a3 = mass * gwpFactor;
      // A4 — transport
      const gwp_a4 = mass * TRANSPORT_FACTOR * TRANSPORT_DIST_KM;
      // A5 — execuție
      const gwp_a5 = gwp_a1a3 * A5_FACTOR;
      // B2-B3 — reparații/întreținere (per an × durată viață)
      const gwp_b2b3 = gwp_a1a3 * B_MAINT_FACTOR * lifetime;
      // B4 — înlocuire materiale cu durabilitate < durata de viață
      const needsReplacement = isInsulationMaterial(matName) || ((layer.lambda || 1) < 0.06 && !matName.includes("Aerogel") && !matName.includes("VIP"));
      const gwp_b4 = needsReplacement && lifetime > 30 ? gwp_a1a3 * 0.5 : 0;
      // C3-C4 — dezasamblare + eliminare
      const gwp_c = mass * 0.02;
      // D — credit reciclare (lemn = sechestrare CO2, oțel = reciclare)
      const gwp_d = gwpFactor < 0 ? mass * gwpFactor * -0.3 :
                    matName.includes("Oțel") ? mass * gwpFactor * -0.25 : 0;

      totalGWP_A1A3 += gwp_a1a3;
      totalGWP_A4 += gwp_a4;
      totalGWP_A5 += gwp_a5;
      totalGWP_B2B3 += gwp_b2b3;
      totalGWP_B4 += gwp_b4;
      totalGWP_C += gwp_c;
      totalGWP_D += gwp_d;

      if (Math.abs(gwp_a1a3) > 50) {
        details.push({ material: matName, mass: Math.round(mass), gwp_a1a3: Math.round(gwp_a1a3), gwpFactor });
      }
    });
  });

  // Ferestre — GWP diferențiat pe tip
  glazingElements?.forEach(gl => {
    const area = parseFloat(gl.area) || 0;
    const glazType = gl.type || gl.name || "default";
    const gwpGl = GWP_GLAZING[glazType] || GWP_GLAZING["default"];
    const gwp = area * gwpGl.gwp;
    totalGWP_A1A3 += gwp;
    totalGWP_A4 += gwp * 0.03; // transport ferestre
    totalGWP_C += area * 5;    // eliminare sticlă ~5 kgCO2eq/m²
  });

  const totalGWP = totalGWP_A1A3 + totalGWP_A4 + totalGWP_A5 + totalGWP_B2B3 + totalGWP_B4 + totalGWP_C - totalGWP_D;
  const gwpPerM2 = totalGWP / areaUseful;
  const gwpPerM2Year = gwpPerM2 / lifetime;

  let cls, color;
  if (gwpPerM2Year <= 5) { cls = "A — Excelent"; color = "#22c55e"; }
  else if (gwpPerM2Year <= 10) { cls = "B — Bun"; color = "#84cc16"; }
  else if (gwpPerM2Year <= 15) { cls = "C — Mediu"; color = "#eab308"; }
  else if (gwpPerM2Year <= 25) { cls = "D — Ridicat"; color = "#f97316"; }
  else { cls = "E — Foarte ridicat"; color = "#ef4444"; }

  return {
    totalGWP: Math.round(totalGWP),
    gwpPerM2: Math.round(gwpPerM2 * 10) / 10,
    gwpPerM2Year: Math.round(gwpPerM2Year * 10) / 10,
    // Module detaliate
    gwp_A1A3: Math.round(totalGWP_A1A3),
    gwp_A4: Math.round(totalGWP_A4),
    gwp_A5: Math.round(totalGWP_A5),
    gwp_B2B3: Math.round(totalGWP_B2B3),
    gwp_B4: Math.round(totalGWP_B4),
    gwp_C: Math.round(totalGWP_C),
    gwp_D: Math.round(totalGWP_D),
    // Compatibilitate cu codul anterior
    gwp_A: Math.round(totalGWP_A1A3 + totalGWP_A4 + totalGWP_A5),
    gwp_B: Math.round(totalGWP_B2B3 + totalGWP_B4),
    classification: cls, color,
    details: details.sort((a,b) => b.gwp_a1a3 - a.gwp_a1a3).slice(0, 10),
    lifetime,
    benchmarkNZEB: 15, // kgCO2eq/(m²·an) — referință EPBD
  };
}
