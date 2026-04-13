/**
 * sri-indicator.js — Smart Readiness Indicator (SRI)
 *
 * Conform Regulamentul delegat (UE) 2020/2155 + Regulamentul de punere în aplicare 2020/2156
 * Metodologie simplificată (Metoda B) cu evaluare pe 9 domenii tehnice și 3 criterii de impact.
 *
 * Referințe:
 * - Regulamentul delegat (UE) 2020/2155 — cadrul metodologic SRI
 * - Regulamentul de punere în aplicare (UE) 2020/2156 — proceduri de calcul
 * - EPBD 2024/1275 Art. 15 — obligativitate SRI clădiri nerezidențiale >290 kW HVAC (din 30.06.2027)
 * - EPBD 2024/1275 Art. 15 alin. 7 — clădiri >70 kW HVAC (din 2029, act delegat Comisie)
 * - EN 15232-1:2017 — complementar BACS
 */

// ── 9 Domenii tehnice SRI ──────────────────────────────────────────────────

export const SRI_DOMAINS = [
  {
    id: "heating",
    name: "Încălzire",
    icon: "🔥",
    weight: 0.17,
    services: [
      { id: "H1", name: "Control emitere căldură", levels: [
        { level: 0, label: "Fără control automat", score: 0 },
        { level: 1, label: "Control centralizat (termostat central)", score: 25 },
        { level: 2, label: "Control individual pe cameră (ON/OFF)", score: 50 },
        { level: 3, label: "Control individual cu programare + PI", score: 75 },
        { level: 4, label: "Control predictiv cu ocupare + auto-adaptare", score: 100 },
      ]},
      { id: "H2", name: "Control generare căldură", levels: [
        { level: 0, label: "Pornire/oprire manuală", score: 0 },
        { level: 1, label: "Programare simplă (timer)", score: 25 },
        { level: 2, label: "Compensare climatică (curbă OTC)", score: 50 },
        { level: 3, label: "OTC + optimizare pornire/oprire", score: 75 },
        { level: 4, label: "Predicție meteo + învățare automată (MPC)", score: 100 },
      ]},
      { id: "H3", name: "Control distribuție căldură", levels: [
        { level: 0, label: "Fără control pompe", score: 0 },
        { level: 1, label: "Pompe viteză constantă cu programare", score: 33 },
        { level: 2, label: "Pompe viteză variabilă (presiune diferențială)", score: 66 },
        { level: 3, label: "Pompe variabile + optimizare debit per zonă", score: 100 },
      ]},
    ],
  },
  {
    id: "cooling",
    name: "Răcire",
    icon: "❄️",
    weight: 0.10,
    services: [
      { id: "C1", name: "Control emitere frig", levels: [
        { level: 0, label: "Fără control", score: 0 },
        { level: 1, label: "Termostat central ON/OFF", score: 25 },
        { level: 2, label: "Control individual pe cameră", score: 50 },
        { level: 3, label: "Control individual + programare", score: 75 },
        { level: 4, label: "Control predictiv cu senzori ocupare", score: 100 },
      ]},
      { id: "C2", name: "Control generare frig", levels: [
        { level: 0, label: "Manual", score: 0 },
        { level: 1, label: "Programare simplă", score: 33 },
        { level: 2, label: "Compensare pe temperatură exterioară", score: 66 },
        { level: 3, label: "Optimizare continuă + free-cooling automat", score: 100 },
      ]},
    ],
  },
  {
    id: "dhw",
    name: "Apă caldă menajeră",
    icon: "🚿",
    weight: 0.10,
    services: [
      { id: "W1", name: "Control temperatură ACM", levels: [
        { level: 0, label: "Fără control (temperatură fixă)", score: 0 },
        { level: 1, label: "Programare simplă temperatura ACM", score: 33 },
        { level: 2, label: "Control funcție de cerere + anti-legionella", score: 66 },
        { level: 3, label: "Control solar termic + predicție consum", score: 100 },
      ]},
      { id: "W2", name: "Control recirculare ACM", levels: [
        { level: 0, label: "Recirculare continuă sau fără recirculare", score: 0 },
        { level: 1, label: "Recirculare pe program (timer)", score: 50 },
        { level: 2, label: "Recirculare pe cerere (senzor/buton)", score: 100 },
      ]},
    ],
  },
  {
    id: "ventilation",
    name: "Ventilare",
    icon: "💨",
    weight: 0.12,
    services: [
      { id: "V1", name: "Control debit aer proaspăt", levels: [
        { level: 0, label: "Fără control (ventilare naturală)", score: 0 },
        { level: 1, label: "Control manual (grile reglabile)", score: 20 },
        { level: 2, label: "Debit fix programat", score: 40 },
        { level: 3, label: "Control pe cerere CO₂ / umiditate", score: 70 },
        { level: 4, label: "Control pe cerere multi-senzor + predicție", score: 100 },
      ]},
      { id: "V2", name: "Recuperare căldură", levels: [
        { level: 0, label: "Fără recuperare", score: 0 },
        { level: 1, label: "Recuperare fixă (η < 65%)", score: 33 },
        { level: 2, label: "Recuperare performantă (η 65-80%) + bypass", score: 66 },
        { level: 3, label: "Recuperare entalpică (η > 80%) + bypass + antigel", score: 100 },
      ]},
    ],
  },
  {
    id: "lighting",
    name: "Iluminat",
    icon: "💡",
    weight: 0.10,
    services: [
      { id: "L1", name: "Control iluminat", levels: [
        { level: 0, label: "Întrerupător manual ON/OFF", score: 0 },
        { level: 1, label: "Senzor prezență ON/OFF", score: 25 },
        { level: 2, label: "Dimming manual sau programat", score: 50 },
        { level: 3, label: "Dimming automat pe lumină naturală (daylight)", score: 75 },
        { level: 4, label: "Control personalizat per zonă + circadian", score: 100 },
      ]},
    ],
  },
  {
    id: "envelope",
    name: "Anvelopă dinamică",
    icon: "🏗️",
    weight: 0.08,
    services: [
      { id: "DE1", name: "Control protecție solară", levels: [
        { level: 0, label: "Fără protecție solară sau fixă", score: 0 },
        { level: 1, label: "Protecție solară manuală (jaluzele)", score: 25 },
        { level: 2, label: "Automatizare pe program/timer", score: 50 },
        { level: 3, label: "Automatizare pe senzor solar + vânt", score: 75 },
        { level: 4, label: "Control integrat cu HVAC + iluminat", score: 100 },
      ]},
      { id: "DE2", name: "Control ferestre / ventilare naturală", levels: [
        { level: 0, label: "Fără control", score: 0 },
        { level: 1, label: "Indicatoare deschidere ferestre", score: 33 },
        { level: 2, label: "Ferestre motorizate cu senzor CO₂", score: 66 },
        { level: 3, label: "Control integrat cu HVAC + calitate aer", score: 100 },
      ]},
    ],
  },
  {
    id: "electricity",
    name: "Electricitate",
    icon: "⚡",
    weight: 0.12,
    services: [
      { id: "E1", name: "Monitorizare consum electric", levels: [
        { level: 0, label: "Fără monitorizare", score: 0 },
        { level: 1, label: "Contor general cu citire lunară", score: 20 },
        { level: 2, label: "Sub-contorizare pe circuite principale", score: 50 },
        { level: 3, label: "Monitorizare în timp real per echipament", score: 80 },
        { level: 4, label: "Monitorizare + analitică + alertare automată", score: 100 },
      ]},
      { id: "E2", name: "Stocare energie / flexibilitate", levels: [
        { level: 0, label: "Fără stocare sau flexibilitate", score: 0 },
        { level: 1, label: "Stocare simplă (boiler, acumulare termică)", score: 33 },
        { level: 2, label: "Baterie + optimizare autoconsum", score: 66 },
        { level: 3, label: "V2G / demand-response / piață energie", score: 100 },
      ]},
    ],
  },
  {
    id: "ev_charging",
    name: "Încărcare vehicule electrice",
    icon: "🔌",
    weight: 0.08,
    services: [
      { id: "EV1", name: "Infrastructură EV", levels: [
        { level: 0, label: "Fără infrastructură", score: 0 },
        { level: 1, label: "Pre-cablare (conducte fără stație)", score: 20 },
        { level: 2, label: "Stație de încărcare simplă (mod 3)", score: 50 },
        { level: 3, label: "Stație inteligentă cu programare + tarifare", score: 75 },
        { level: 4, label: "V2G / load balancing / integrare PV", score: 100 },
      ]},
    ],
  },
  {
    id: "monitoring",
    name: "Monitorizare și control",
    icon: "📊",
    weight: 0.13,
    services: [
      { id: "M1", name: "Sistem de management clădire (BMS)", levels: [
        { level: 0, label: "Fără BMS", score: 0 },
        { level: 1, label: "Monitorizare centralizată (doar vizualizare)", score: 25 },
        { level: 2, label: "BMS cu control HVAC + iluminat", score: 50 },
        { level: 3, label: "BMS integrat cu toate sistemele + alarme", score: 75 },
        { level: 4, label: "BMS cu AI / ML + optimizare predictivă", score: 100 },
      ]},
      { id: "M2", name: "Informare ocupanți", levels: [
        { level: 0, label: "Fără informare", score: 0 },
        { level: 1, label: "Afișaj consum general (holul clădirii)", score: 25 },
        { level: 2, label: "Dashboard online per utilizator", score: 50 },
        { level: 3, label: "Aplicație mobilă cu recomandări personalizate", score: 75 },
        { level: 4, label: "Gamificare + comparare între ocupanți + recompense", score: 100 },
      ]},
    ],
  },
];

// ── 3 Criterii de impact SRI (conform Reg. 2020/2155 Anexa I) ──────────────

export const SRI_IMPACT_CRITERIA = {
  energy_efficiency: {
    id: "energy_efficiency",
    name: "Eficiență energetică",
    description: "Capacitatea de a adapta funcționarea la nevoile ocupanților și de a reduce consumul",
    weight: 0.34,
  },
  flexibility: {
    id: "flexibility",
    name: "Flexibilitate la rețea",
    description: "Capacitatea de a răspunde semnalelor rețelei electrice (demand response, stocare)",
    weight: 0.33,
  },
  comfort: {
    id: "comfort",
    name: "Confort și bunăstare",
    description: "Capacitatea de a menține condiții optime de confort termic, vizual și aer",
    weight: 0.33,
  },
};

// ── Funcție principală de calcul SRI ────────────────────────────────────────

/**
 * Calculează scorul SRI al clădirii.
 *
 * @param {Object} selections — { [serviceId]: levelIndex } ex: { H1: 3, H2: 2, C1: 1, ... }
 * @param {{ residential?: boolean }} [options]
 * @returns {{
 *   total: number,              — scor global 0-100%
 *   class: string,              — clasă SRI (A, B, C, D, E)
 *   domains: Object[],          — scor per domeniu
 *   impact: Object,             — scor pe cele 3 criterii de impact
 *   recommendation: string,     — recomandare textuală
 * }}
 */
export function calculateSRI(selections = {}, options = {}) {
  const domainScores = SRI_DOMAINS.map(domain => {
    const serviceScores = domain.services.map(service => {
      const selectedLevel = selections[service.id] ?? 0;
      const levelData = service.levels[selectedLevel] ?? service.levels[0];
      return { serviceId: service.id, serviceName: service.name, score: levelData.score, level: selectedLevel, label: levelData.label };
    });

    const domainScore = serviceScores.length > 0
      ? serviceScores.reduce((sum, s) => sum + s.score, 0) / serviceScores.length
      : 0;

    return {
      id: domain.id,
      name: domain.name,
      icon: domain.icon,
      weight: domain.weight,
      score: Math.round(domainScore * 10) / 10,
      services: serviceScores,
    };
  });

  // Scor ponderat global
  const totalWeighted = domainScores.reduce((sum, d) => sum + d.score * d.weight, 0);
  const totalWeight = domainScores.reduce((sum, d) => sum + d.weight, 0);
  const total = Math.round((totalWeighted / totalWeight) * 10) / 10;

  // Clasă SRI
  const sriClass = getSRIClass(total);

  // Impact pe cele 3 criterii (simplificat — ponderat diferit pe domenii)
  const impact = calculateImpactScores(domainScores);

  // Recomandare
  const recommendation = generateRecommendation(total, domainScores);

  return { total, class: sriClass, domains: domainScores, impact, recommendation };
}

// ── Clasificare SRI ────────────────────────────────────────────────────────

export function getSRIClass(score) {
  if (score >= 80) return "A";
  if (score >= 60) return "B";
  if (score >= 40) return "C";
  if (score >= 20) return "D";
  return "E";
}

export const SRI_CLASS_LABELS = {
  A: { label: "Clădire inteligentă",            color: "emerald", description: "Nivel avansat de automatizare și integrare" },
  B: { label: "Clădire bine echipată",          color: "green",   description: "Sisteme automatizate cu integrare parțială" },
  C: { label: "Clădire cu automatizare medie",  color: "yellow",  description: "Automatizare de bază pe sisteme principale" },
  D: { label: "Clădire cu automatizare minimă",  color: "orange",  description: "Predominant control manual, automatizare punctuală" },
  E: { label: "Clădire fără automatizare",       color: "red",     description: "Control manual complet, fără sisteme inteligente" },
};

// ── Funcții interne ────────────────────────────────────────────────────────

function calculateImpactScores(domainScores) {
  // Ponderi simplificate per domeniu pentru fiecare criteriu de impact
  const energyWeights   = { heating: 0.22, cooling: 0.12, dhw: 0.10, ventilation: 0.15, lighting: 0.12, envelope: 0.10, electricity: 0.12, ev_charging: 0.02, monitoring: 0.05 };
  const flexWeights     = { heating: 0.08, cooling: 0.08, dhw: 0.05, ventilation: 0.05, lighting: 0.05, envelope: 0.02, electricity: 0.35, ev_charging: 0.22, monitoring: 0.10 };
  const comfortWeights  = { heating: 0.20, cooling: 0.18, dhw: 0.12, ventilation: 0.20, lighting: 0.15, envelope: 0.08, electricity: 0.02, ev_charging: 0.00, monitoring: 0.05 };

  function weightedScore(weights) {
    let sum = 0, wSum = 0;
    domainScores.forEach(d => {
      const w = weights[d.id] ?? 0;
      sum += d.score * w;
      wSum += w;
    });
    return wSum > 0 ? Math.round((sum / wSum) * 10) / 10 : 0;
  }

  return {
    energy_efficiency: { ...SRI_IMPACT_CRITERIA.energy_efficiency, score: weightedScore(energyWeights) },
    flexibility:       { ...SRI_IMPACT_CRITERIA.flexibility,       score: weightedScore(flexWeights) },
    comfort:           { ...SRI_IMPACT_CRITERIA.comfort,           score: weightedScore(comfortWeights) },
  };
}

function generateRecommendation(total, domainScores) {
  const weakest = [...domainScores].sort((a, b) => a.score - b.score).slice(0, 3);
  const weakNames = weakest.map(d => d.name).join(", ");

  if (total >= 80) return `Clădirea are un nivel excelent de inteligență (SRI ${Math.round(total)}%). Mențineți actualizările sistemelor existente.`;
  if (total >= 60) return `Clădirea este bine echipată (SRI ${Math.round(total)}%). Domenii cu potențial de îmbunătățire: ${weakNames}.`;
  if (total >= 40) return `Clădirea are automatizare medie (SRI ${Math.round(total)}%). Se recomandă investiții în: ${weakNames}.`;
  if (total >= 20) return `Clădirea are automatizare minimă (SRI ${Math.round(total)}%). Prioritizați modernizarea: ${weakNames}.`;
  return `Clădirea nu dispune de sisteme inteligente (SRI ${Math.round(total)}%). Evaluați un program complet de smart-readiness, începând cu: ${weakNames}.`;
}

// ── Verificare obligativitate SRI — EPBD 2024/1275 Art. 15 ─────────────────

/**
 * Verifică dacă SRI este obligatoriu pentru această clădire.
 * EPBD 2024/1275 Art. 15:
 *  - Din 30.06.2027: clădiri nerezidențiale cu HVAC >290 kW
 *  - Din 2029: clădiri nerezidențiale cu HVAC >70 kW (act delegat Comisie)
 *  - Opțional pentru rezidențiale
 *
 * @param {object} params
 * @param {string} params.category — cod categorie clădire (RI/RC/BI etc.)
 * @param {number} params.hvacPower — putere instalată HVAC totală [kW]
 * @param {number} [params.year=2026] — anul evaluării
 * @returns {{ mandatory, reason, deadline }}
 */
export function checkSRIMandatory({ category, hvacPower, year = 2026 }) {
  const isRes = ["RI", "RC", "RA"].includes(category);
  const kw = parseFloat(hvacPower) || 0;

  if (isRes) {
    return {
      mandatory: false,
      reason: "SRI este opțional pentru clădiri rezidențiale (EPBD 2024/1275 Art. 15)",
      deadline: null,
    };
  }

  if (kw > 290) {
    return {
      mandatory: year >= 2027,
      reason: kw > 290
        ? `Clădire nerezidențială cu HVAC ${Math.round(kw)} kW > 290 kW — SRI obligatoriu din 30.06.2027`
        : null,
      deadline: "30.06.2027",
      epbd_ref: "EPBD 2024/1275 Art. 15 alin. 4",
    };
  }

  if (kw > 70) {
    return {
      mandatory: year >= 2029,
      reason: `Clădire nerezidențială cu HVAC ${Math.round(kw)} kW > 70 kW — SRI obligatoriu din 2029`,
      deadline: "31.12.2029",
      epbd_ref: "EPBD 2024/1275 Art. 15 alin. 7",
    };
  }

  return {
    mandatory: false,
    reason: `HVAC ${Math.round(kw)} kW ≤ 70 kW — SRI opțional`,
    deadline: null,
  };
}

// ── BACS minim obligatoriu — EPBD 2024/1275 Art. 14 ───────────────────────

/**
 * Verifică dacă BACS este obligatoriu.
 * EPBD 2024/1275 Art. 14:
 *  - Până 31.12.2024: clădiri nerezidențiale cu HVAC >290 kW → BACS minim clasa C
 *  - Până 31.12.2029: clădiri nerezidențiale cu HVAC >70 kW → BACS minim clasa C
 */
export function checkBACSMandatory({ category, hvacPower }) {
  const isRes = ["RI", "RC", "RA"].includes(category);
  const kw = parseFloat(hvacPower) || 0;

  if (isRes) return { mandatory: false, minClass: null, reason: "BACS nu e obligatoriu pentru rezidențiale" };
  if (kw > 290) return { mandatory: true, minClass: "C", reason: `HVAC ${Math.round(kw)} kW > 290 kW — BACS clasa C minim (EPBD Art.14, termen 31.12.2024)`, deadline: "31.12.2024" };
  if (kw > 70) return { mandatory: true, minClass: "C", reason: `HVAC ${Math.round(kw)} kW > 70 kW — BACS clasa C minim (EPBD Art.14, termen 31.12.2029)`, deadline: "31.12.2029" };
  return { mandatory: false, minClass: null, reason: `HVAC ${Math.round(kw)} kW ≤ 70 kW — BACS opțional` };
}

// ── Export date implicite (toate pe nivel 0) ───────────────────────────────

export function getDefaultSelections() {
  const selections = {};
  SRI_DOMAINS.forEach(domain => {
    domain.services.forEach(service => {
      selections[service.id] = 0;
    });
  });
  return selections;
}
