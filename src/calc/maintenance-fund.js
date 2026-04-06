// ═══════════════════════════════════════════════════════════════
// FOND DE REPARAȚII — Simulare costuri mentenanță pe 30 ani
// Per componentă de clădire, cu durate de viață și costuri unitare
// Util pentru asociații de proprietari, planificare buget
// ═══════════════════════════════════════════════════════════════

// Componente clădire cu durate de viață estimată și costuri înlocuire/reparație
export const BUILDING_COMPONENTS = [
  // Anvelopă
  { id:"tamp_ferestre",   label:"Tâmplărie ferestre/uși",   cat:"Anvelopă",   lifespan:25, costPerM2:250, unit:"m²",  maintPct:0.5,  maintDesc:"Revizie etanșeitate și garnituri" },
  { id:"izol_fatada",     label:"Sistem izolație fațadă",    cat:"Anvelopă",   lifespan:35, costPerM2:80,  unit:"m²",  maintPct:0.3,  maintDesc:"Revopsire/refacere tencuială decorativă" },
  { id:"invelitoare",     label:"Învelitoare acoperiș",      cat:"Anvelopă",   lifespan:30, costPerM2:60,  unit:"m²",  maintPct:0.4,  maintDesc:"Verificare și colmatare fisuri" },
  { id:"terasa_hidroiz",  label:"Hidroizolație terasă",      cat:"Anvelopă",   lifespan:20, costPerM2:45,  unit:"m²",  maintPct:1.0,  maintDesc:"Verificare și remedieri locale" },
  { id:"soclu",           label:"Soclu + borduri",           cat:"Anvelopă",   lifespan:30, costPerM2:35,  unit:"m_lin", maintPct:0.5, maintDesc:"Reparații tencuială soclu" },
  // Instalații termice
  { id:"cazan",           label:"Cazan/centrală termică",    cat:"Instalații", lifespan:20, costPerUnit:3500, unit:"buc", maintPct:3.0, maintDesc:"Revizie anuală + piese uzură" },
  { id:"pompa_caldura",   label:"Pompă de căldură",          cat:"Instalații", lifespan:20, costPerUnit:8000, unit:"buc", maintPct:2.0, maintDesc:"Revizie anuală + agent frigorific" },
  { id:"radiatoare",      label:"Radiatoare/corp încălzire", cat:"Instalații", lifespan:40, costPerM2:45,  unit:"m²",  maintPct:0.3,  maintDesc:"Aerisire și verificare robineți" },
  { id:"pardoseala_calda",label:"Instalație pardoseală",     cat:"Instalații", lifespan:40, costPerUnit:0, unit:"m²",  maintPct:0.1,  maintDesc:"Verificare presiune și etanșeitate" },
  { id:"ventilare_hr",    label:"Centrală ventilare HR",     cat:"Instalații", lifespan:20, costPerUnit:4500, unit:"buc", maintPct:2.5, maintDesc:"Filtre (trimestrial) + revizie anuală" },
  // ACM
  { id:"boiler_acm",      label:"Boiler ACM",                cat:"ACM",        lifespan:15, costPerUnit:800, unit:"buc", maintPct:2.0, maintDesc:"Anodă sacrificiu (3 ani), curățare calcar" },
  { id:"solar_termic",    label:"Panouri solar-termice",     cat:"ACM",        lifespan:25, costPerM2:380, unit:"m²",  maintPct:1.0,  maintDesc:"Verificare fluid solar, revizie pompe" },
  // Electrice
  { id:"tablou_electric",  label:"Tablou electric principal", cat:"Electrice",  lifespan:30, costPerUnit:1200, unit:"buc", maintPct:1.0, maintDesc:"Verificare siguranțe și instalație" },
  { id:"pv_sistem",        label:"Sistem fotovoltaic",        cat:"Electrice",  lifespan:25, costPerUnit:5500, unit:"kWp", maintPct:1.0, maintDesc:"Curățare panouri + monitoring invertor" },
  { id:"baterie_stocare",  label:"Baterie stocare energie",   cat:"Electrice",  lifespan:12, costPerKwh:400, unit:"kWh", maintPct:0.5,  maintDesc:"Verificare SOH și balansare celule" },
  // Finisaje comune
  { id:"lift",             label:"Lift/ascensor",             cat:"Comune",     lifespan:30, costPerUnit:18000, unit:"buc", maintPct:3.0, maintDesc:"Revizie lunară conform normative" },
  { id:"interfon",         label:"Interfon/control acces",    cat:"Comune",     lifespan:15, costPerUnit:800, unit:"buc", maintPct:2.0, maintDesc:"Revizii și înlocuire componente" },
  { id:"scara_exterior",   label:"Scări exterioare/rampe",    cat:"Comune",     lifespan:30, costPerM2:180, unit:"m²",  maintPct:0.3,  maintDesc:"Tratament anti-îngheț anual" },
];

export function calcMaintenanceFund(params) {
  const {
    components,     // array {id, area/units, replacementCost(opțional)}
    years,          // număr ani simulare (default 30)
    inflationRate,  // rata inflație [%] (default 4%)
    discountRate,   // rată actualizare [%] (default 5%)
    currentYear,    // an start (default 2026)
    contributionMode, // "equal" (contribuție egală) sau "sinking" (fond de amortizare)
  } = params;

  const Y = years || 30;
  const infl = (inflationRate || 4) / 100;
  const disc = (discountRate || 5) / 100;
  const startYear = currentYear || 2026;

  // Construiesc calendarul de cheltuieli pe ani
  const yearlyEvents = {}; // { year: [{ label, cost, type }] }
  let totalNominalCost = 0;
  let totalPVCost = 0;
  const componentDetails = [];

  (components || []).forEach(comp => {
    const def = BUILDING_COMPONENTS.find(b => b.id === comp.id);
    if (!def) return;

    const qty = comp.area || comp.units || comp.kwp || 1;
    // Cost înlocuire unitar
    const unitCost = comp.replacementCost || def.costPerM2 || def.costPerUnit || def.costPerKwh || 0;
    const totalReplaceCost = unitCost * qty;

    // Cost anual mentenanță (% din valoare)
    const annualMaintCost = totalReplaceCost * (def.maintPct / 100);

    let replacementYears = [];
    let yr = def.lifespan;
    while (yr <= Y) { replacementYears.push(yr); yr += def.lifespan; }

    let componentNominal = 0, componentPV = 0;

    // Cheltuieli mentenanță anuală
    for (let y = 1; y <= Y; y++) {
      const maintInflated = annualMaintCost * Math.pow(1 + infl, y - 1);
      const maintPV = maintInflated / Math.pow(1 + disc, y);
      componentNominal += maintInflated;
      componentPV += maintPV;
      if (!yearlyEvents[y]) yearlyEvents[y] = [];
      yearlyEvents[y].push({ label: def.label + " — mentenanță", cost: Math.round(maintInflated), type: "maint" });
    }

    // Înlocuiri programate
    replacementYears.forEach(ry => {
      const costInflated = totalReplaceCost * Math.pow(1 + infl, ry - 1);
      const costPV = costInflated / Math.pow(1 + disc, ry);
      componentNominal += costInflated;
      componentPV += costPV;
      if (!yearlyEvents[ry]) yearlyEvents[ry] = [];
      yearlyEvents[ry].push({ label: def.label + " — înlocuire", cost: Math.round(costInflated), type: "replace" });
    });

    totalNominalCost += componentNominal;
    totalPVCost += componentPV;
    componentDetails.push({
      id: def.id, label: def.label, cat: def.cat,
      qty, unitCost: Math.round(unitCost),
      totalReplaceCost: Math.round(totalReplaceCost),
      annualMaint: Math.round(annualMaintCost),
      lifespan: def.lifespan,
      replacementYears,
      nominalCost: Math.round(componentNominal),
      pvCost: Math.round(componentPV),
    });
  });

  // Contribuție lunară necesară (fond de amortizare — metoda sinking fund)
  const monthlyContribution = totalPVCost > 0
    ? totalPVCost * disc / (12 * (Math.pow(1 + disc/12, Y*12) - 1))
    : 0;

  // Calendar pe ani
  const yearCalendar = [];
  let cumulative = 0;
  for (let y = 1; y <= Y; y++) {
    const events = yearlyEvents[y] || [];
    const yearTotal = events.reduce((s, e) => s + e.cost, 0);
    cumulative += yearTotal;
    yearCalendar.push({
      year: startYear + y - 1, yearIdx: y,
      events, yearTotal: Math.round(yearTotal),
      cumulative: Math.round(cumulative),
    });
  }

  // Ani critici (cheltuieli > 200% din media anuală)
  const avgAnnual = totalNominalCost / Y;
  const criticalYears = yearCalendar.filter(y => y.yearTotal > avgAnnual * 2);

  return {
    totalNominalCost: Math.round(totalNominalCost),
    totalPVCost: Math.round(totalPVCost),
    avgAnnualCost: Math.round(avgAnnual),
    monthlyContribution: Math.round(monthlyContribution),
    yearCalendar,
    componentDetails: componentDetails.sort((a,b) => b.pvCost - a.pvCost),
    criticalYears,
    years: Y, startYear,
    byCategory: componentDetails.reduce((acc, c) => {
      if (!acc[c.cat]) acc[c.cat] = 0;
      acc[c.cat] += c.pvCost;
      return acc;
    }, {}),
  };
}
