// ═══════════════════════════════════════════════════════════════
// CALCUL ACUSTIC SIMPLIFICAT — SR EN ISO 717-1:2013, NP 008-97
// Indice izolare acustică aeriană Rw [dB] per element de construcție
// ═══════════════════════════════════════════════════════════════

// Cerințe minime Rw [dB] conform NP 008-97 și SR 6156:2016
export const RW_REQUIREMENTS = {
  // Pereți exteriori față de exterior
  PE: { residential: 38, office: 35, school: 38, hospital: 45, hotel: 40 },
  // Pereți despărțitori între unități diferite
  PD: { residential: 53, office: 42, school: 45, hospital: 50, hotel: 52 },
  // Planșee între etaje (impact + aerian)
  PL_INT: { residential: 52, office: 45, school: 48, hospital: 52, hotel: 54 },
  // Ferestre și uși exterioare
  FE: { residential: 30, office: 28, school: 32, hospital: 35, hotel: 32 },
  // Uși interioare între spații
  UI: { residential: 32, office: 28, school: 30, hospital: 35 },
};

// Date Rw pentru materiale de construcție comune (valori medii SR EN 12354-1)
// Metodă: Rw ≈ 20·log(m·f) - 47.5 [dB] (legea masei la 500 Hz)
// m = masă superficială [kg/m²], f = frecvență 500 Hz
function massLawRw(massPerM2) {
  if (massPerM2 <= 0) return 0;
  return Math.max(10, Math.round(20 * Math.log10(massPerM2 * 500) - 47.5));
}

// Calcul Rw compus (element stratificat) — SR EN ISO 717-1
export function calcElementRw(layers, elementType) {
  if (!layers || !layers.length) return null;

  // Masă superficială totală [kg/m²]
  const massPerM2 = layers.reduce((s, l) => {
    const d = (parseFloat(l.thickness) || 0) / 1000; // m
    const rho = l.rho || 1500; // kg/m³
    return s + d * rho;
  }, 0);

  // Rw de bază din legea masei
  let Rw = massLawRw(massPerM2);

  // Corecții pentru materiale speciale
  let correction = 0;

  // Izolație acustică în cavitate: +5 dB pentru strat de aer/lână minerală ≥ 5cm
  const hasAirCavity = layers.some(l => (l.lambda || 1) < 0.1 && (parseFloat(l.thickness)||0) >= 50);
  if (hasAirCavity) correction += 5;

  // Straturi duble (2 stele independente): +10 dB față de lege masă singulă
  const hasDualLeaf = layers.filter(l => (l.rho || 0) > 500 && (parseFloat(l.thickness)||0) > 40).length >= 2;
  if (hasDualLeaf && hasAirCavity) correction += 5;

  // Gips-carton dublu: +3 dB față de simplu
  const gcCount = layers.filter(l => (l.matName || l.material || "").includes("Gips-carton")).length;
  if (gcCount >= 2) correction += 3;

  // Penalizare: reziliență (planșee cu pardoseală plutitoare) — pozitivă
  const hasResiliency = layers.some(l => (l.matName || l.material || "").toLowerCase().includes("vată") && elementType === "PL_INT");
  if (hasResiliency) correction += 6; // pardoseală plutitoare +6 dB impact

  Rw = Math.min(70, Rw + correction);

  return {
    massPerM2: Math.round(massPerM2 * 10) / 10,
    Rw,
    correction,
    method: "SR EN ISO 717-1 + legea masei la 500 Hz",
  };
}

// Calcul Rw fereastră combinat (ramă + geam)
export function calcWindowRw(glazingType, frameType) {
  const glazingRw = {
    "Simplu vitraj": 26,
    "Dublu vitraj (4-12-4)": 30,
    "Dublu vitraj termoizolant": 32,
    "Dublu vitraj Low-E": 33,
    "Triplu vitraj": 36,
    "Triplu vitraj Low-E": 38,
    "Triplu vitraj 2×Low-E": 40,
  };
  const frameRw = {
    "PVC (5 camere)": 34, "PVC (6-7 camere)": 36,
    "Lemn stratificat": 33, "Aluminiu fără RPT": 30,
    "Aluminiu cu RPT": 33, "Lemn-aluminiu": 35,
  };
  const gRw = glazingRw[glazingType] || 32;
  const fRw = frameRw[frameType] || 33;
  // Rw combinat (element mai slab domină): medie ponderată 70% geam + 30% ramă
  const combined = Math.round(gRw * 0.70 + fRw * 0.30);
  return { Rw: combined, glazingRw: gRw, frameRw: fRw };
}

// Verificare conformitate acustică per categorie clădire
export function checkAcousticConformity(params) {
  const {
    opaqueElements,
    glazingElements,
    category,
    externalNoise, // nivel zgomot exterior [dB(A)] — trafic, aeroport
  } = params;

  const catMap = { RI:"residential", RC:"residential", RA:"residential",
                   BI:"office", ED:"school", SA:"hospital", HC:"hotel",
                   CO:"office", SP:"office", AL:"office" };
  const bldCat = catMap[category] || "residential";
  const results = [];
  let allConform = true;

  // Verificare pereți exteriori
  (opaqueElements || []).filter(e => e.type === "PE").forEach(el => {
    const rwResult = calcElementRw(el.layers, "PE");
    if (!rwResult) return;
    const rwReq = RW_REQUIREMENTS.PE[bldCat] + (externalNoise ? Math.max(0, externalNoise - 60) : 0);
    const conform = rwResult.Rw >= rwReq;
    if (!conform) allConform = false;
    results.push({
      name: el.name || el.type,
      type: "Perete exterior",
      Rw: rwResult.Rw,
      Rw_req: rwReq,
      massPerM2: rwResult.massPerM2,
      conform,
      deficit: conform ? 0 : rwReq - rwResult.Rw,
    });
  });

  // Verificare ferestre
  (glazingElements || []).forEach(gl => {
    const rwResult = calcWindowRw(gl.type || gl.name, gl.frameType);
    const rwReq = RW_REQUIREMENTS.FE[bldCat] + (externalNoise ? Math.max(0, externalNoise - 60) : 0);
    const conform = rwResult.Rw >= rwReq;
    if (!conform) allConform = false;
    results.push({
      name: "Fereastră " + (gl.orientation || ""),
      type: "Vitrare",
      Rw: rwResult.Rw,
      Rw_req: rwReq,
      massPerM2: null,
      conform,
      deficit: conform ? 0 : rwReq - rwResult.Rw,
    });
  });

  const nonConform = results.filter(r => !r.conform);

  return {
    results,
    allConform: nonConform.length === 0,
    nonConformCount: nonConform.length,
    avgRw: results.length ? Math.round(results.reduce((s,r) => s+r.Rw, 0) / results.length) : null,
    verdict: nonConform.length === 0
      ? "CONFORM acustic — toate elementele respectă Rw minim"
      : `NECONFORM acustic — ${nonConform.length} element(e) sub Rw minim NP 008-97`,
    color: nonConform.length === 0 ? "#22c55e" : "#ef4444",
    recommendations: nonConform.map(r => `${r.name}: deficit ${r.deficit} dB — adăugați izolație fonică sau strat GC dublu`),
    method: "SR EN ISO 717-1:2013, NP 008-97 (legea masei + corecții material)",
  };
}
