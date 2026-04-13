/**
 * benchmark-national.js — Date statistice consum energetic clădiri România
 *
 * Surse: MDLPA Raport anual CPE 2022-2023, INS Balanța energetică 2023,
 *        ANRE Raport eficiență energetică 2023, studii BPIE România.
 *
 * Valori EP (kWh/m²/an) — consum primar total (încălzire + răcire + ACM + iluminat)
 * Valori CO₂ (kgCO₂/m²/an) — emisii echivalent carbon
 */

// ── Medii naționale pe tip de clădire ──────────────────────────────────────

export const NATIONAL_AVERAGES = {
  rezidential_bloc: {
    label: "Bloc rezidențial (apartamente)",
    ep_primary: 185,       // kWh/m²/an — medie națională
    ep_heating: 130,
    ep_dhw: 28,
    ep_cooling: 12,
    ep_lighting: 15,
    co2: 42,               // kgCO₂/m²/an
    energy_class_typical: "D",
    count_cpe: 142000,     // nr. CPE-uri emise 2022-2023
    source: "MDLPA Raport CPE 2023",
  },
  rezidential_casa: {
    label: "Casă individuală (P, P+1, P+M)",
    ep_primary: 230,
    ep_heating: 175,
    ep_dhw: 32,
    ep_cooling: 8,
    ep_lighting: 15,
    co2: 55,
    energy_class_typical: "D",
    count_cpe: 89000,
    source: "MDLPA Raport CPE 2023",
  },
  birouri: {
    label: "Clădire de birouri",
    ep_primary: 210,
    ep_heating: 95,
    ep_dhw: 10,
    ep_cooling: 55,
    ep_lighting: 50,
    co2: 68,
    energy_class_typical: "C",
    count_cpe: 18500,
    source: "MDLPA Raport CPE 2023 + BPIE România",
  },
  comercial: {
    label: "Spații comerciale (retail, magazine)",
    ep_primary: 280,
    ep_heating: 80,
    ep_dhw: 8,
    ep_cooling: 90,
    ep_lighting: 102,
    co2: 88,
    energy_class_typical: "C",
    count_cpe: 12200,
    source: "BPIE România 2022",
  },
  educational: {
    label: "Clădire educațională (școli, universități)",
    ep_primary: 175,
    ep_heating: 120,
    ep_dhw: 18,
    ep_cooling: 15,
    ep_lighting: 22,
    co2: 38,
    energy_class_typical: "D",
    count_cpe: 9800,
    source: "MDLPA + INS 2023",
  },
  spital: {
    label: "Spital / Clinică medicală",
    ep_primary: 390,
    ep_heating: 145,
    ep_dhw: 95,
    ep_cooling: 80,
    ep_lighting: 70,
    co2: 115,
    energy_class_typical: "D",
    count_cpe: 2100,
    source: "BPIE România 2022",
  },
  hotelier: {
    label: "Hotel / Pensiune (4+ stele)",
    ep_primary: 320,
    ep_heating: 110,
    ep_dhw: 100,
    ep_cooling: 60,
    ep_lighting: 50,
    co2: 92,
    energy_class_typical: "C",
    count_cpe: 4500,
    source: "ANRE Eficiență Energetică 2023",
  },
  industrial_usor: {
    label: "Hală industrială ușoară / depozit",
    ep_primary: 145,
    ep_heating: 95,
    ep_dhw: 5,
    ep_cooling: 15,
    ep_lighting: 30,
    co2: 30,
    energy_class_typical: "D",
    count_cpe: 6700,
    source: "INS Balanța Energetică 2023",
  },
};

// ── Medii pe județ (EP primar, kWh/m²/an) — rezidențial mediu ──────────────
// Date derivate din intensitatea energetică regională + grad de urbanizare

export const COUNTY_AVERAGES = {
  AB: { label: "Alba",           ep: 195, co2: 46, climate_zone: "III" },
  AR: { label: "Arad",           ep: 175, co2: 41, climate_zone: "II"  },
  AG: { label: "Argeș",          ep: 182, co2: 43, climate_zone: "II"  },
  BC: { label: "Bacău",          ep: 200, co2: 48, climate_zone: "III" },
  BH: { label: "Bihor",          ep: 178, co2: 42, climate_zone: "II"  },
  BN: { label: "Bistrița-Năsăud",ep: 205, co2: 49, climate_zone: "III" },
  BT: { label: "Botoșani",       ep: 208, co2: 50, climate_zone: "IV"  },
  BV: { label: "Brașov",         ep: 192, co2: 45, climate_zone: "III" },
  BR: { label: "Brăila",         ep: 178, co2: 41, climate_zone: "II"  },
  B:  { label: "București",      ep: 168, co2: 55, climate_zone: "II"  },
  BZ: { label: "Buzău",          ep: 183, co2: 43, climate_zone: "II"  },
  CS: { label: "Caraș-Severin",  ep: 188, co2: 44, climate_zone: "II"  },
  CL: { label: "Călărași",       ep: 185, co2: 43, climate_zone: "II"  },
  CJ: { label: "Cluj",           ep: 185, co2: 44, climate_zone: "III" },
  CT: { label: "Constanța",      ep: 162, co2: 38, climate_zone: "I"   },
  CV: { label: "Covasna",        ep: 210, co2: 50, climate_zone: "III" },
  DB: { label: "Dâmbovița",      ep: 183, co2: 43, climate_zone: "II"  },
  DJ: { label: "Dolj",           ep: 172, co2: 40, climate_zone: "I"   },
  GL: { label: "Galați",         ep: 179, co2: 42, climate_zone: "II"  },
  GR: { label: "Giurgiu",        ep: 176, co2: 41, climate_zone: "II"  },
  GJ: { label: "Gorj",           ep: 190, co2: 45, climate_zone: "II"  },
  HR: { label: "Harghita",       ep: 222, co2: 52, climate_zone: "IV"  },
  HD: { label: "Hunedoara",      ep: 195, co2: 46, climate_zone: "III" },
  IL: { label: "Ialomița",       ep: 180, co2: 42, climate_zone: "II"  },
  IS: { label: "Iași",           ep: 195, co2: 47, climate_zone: "III" },
  IF: { label: "Ilfov",          ep: 170, co2: 40, climate_zone: "II"  },
  MM: { label: "Maramureș",      ep: 205, co2: 49, climate_zone: "III" },
  MH: { label: "Mehedinți",      ep: 178, co2: 42, climate_zone: "II"  },
  MS: { label: "Mureș",          ep: 195, co2: 46, climate_zone: "III" },
  NT: { label: "Neamț",          ep: 202, co2: 48, climate_zone: "III" },
  OT: { label: "Olt",            ep: 175, co2: 41, climate_zone: "I"   },
  PH: { label: "Prahova",        ep: 183, co2: 43, climate_zone: "II"  },
  SM: { label: "Satu Mare",      ep: 182, co2: 43, climate_zone: "II"  },
  SJ: { label: "Sălaj",          ep: 190, co2: 45, climate_zone: "III" },
  SB: { label: "Sibiu",          ep: 192, co2: 45, climate_zone: "III" },
  SV: { label: "Suceava",        ep: 210, co2: 50, climate_zone: "IV"  },
  TR: { label: "Teleorman",      ep: 176, co2: 41, climate_zone: "II"  },
  TM: { label: "Timiș",          ep: 173, co2: 40, climate_zone: "II"  },
  TL: { label: "Tulcea",         ep: 168, co2: 39, climate_zone: "I"   },
  VS: { label: "Vaslui",         ep: 205, co2: 49, climate_zone: "III" },
  VL: { label: "Vâlcea",         ep: 185, co2: 44, climate_zone: "II"  },
  VN: { label: "Vrancea",        ep: 192, co2: 45, climate_zone: "III" },
};

// ── Zone climatice România (conform Mc 001-2022, Cap. 4) ────────────────────

export const CLIMATE_ZONES = {
  "I":   { label: "Zona I (temperată blândă)",   HDD: 2000, CDD: 350 },
  "II":  { label: "Zona II (temperată medie)",    HDD: 2500, CDD: 250 },
  "III": { label: "Zona III (continentală)",       HDD: 3000, CDD: 200 },
  "IV":  { label: "Zona IV (continental aspră)",  HDD: 3500, CDD: 150 },
};

// ── Statistici naționale CPE (2023) ────────────────────────────────────────

export const NATIONAL_CPE_STATS = {
  total_emise: 312000,
  distributie_clase: {
    "A+": 0.8,   // %
    "A":  3.2,
    "B":  8.5,
    "C":  18.4,
    "D":  34.2,
    "E":  24.1,
    "F":  8.6,
    "G":  2.2,
  },
  an_referinta: 2023,
  sursa: "MDLPA Raport Anual CPE 2023",
};

// ── Funcție utilitar: calculează poziția față de media națională ─────────────

/**
 * @param {number} ep_value — valoarea EP a clădirii (kWh/m²/an)
 * @param {string} building_type — cheia din NATIONAL_AVERAGES
 * @param {string} [county_code] — codul județului (ex: "B", "CJ")
 * @returns {{ vs_national: number, vs_county: number, percentile: string, label: string }}
 */
export function benchmarkBuilding(ep_value, building_type, county_code) {
  const nat = NATIONAL_AVERAGES[building_type];
  const nat_ep = nat?.ep_primary ?? 185;

  const vs_national = ((ep_value - nat_ep) / nat_ep) * 100; // % față de medie națională

  let vs_county = null;
  if (county_code && COUNTY_AVERAGES[county_code]) {
    const county_ep = COUNTY_AVERAGES[county_code].ep;
    vs_county = ((ep_value - county_ep) / county_ep) * 100;
  }

  let percentile, label;
  if (ep_value <= nat_ep * 0.5)        { percentile = "top 10%";  label = "Mult mai eficientă"; }
  else if (ep_value <= nat_ep * 0.75)  { percentile = "top 25%";  label = "Mai eficientă";      }
  else if (ep_value <= nat_ep * 0.90)  { percentile = "top 40%";  label = "Peste medie";        }
  else if (ep_value <= nat_ep * 1.10)  { percentile = "medie";    label = "La medie";           }
  else if (ep_value <= nat_ep * 1.25)  { percentile = "sub medie";label = "Sub medie";          }
  else if (ep_value <= nat_ep * 1.50)  { percentile = "bottom 25%";label = "Cu mult sub medie"; }
  else                                  { percentile = "bottom 10%";label = "Ineficientă";      }

  return { vs_national, vs_county, percentile, label, nat_ep };
}

// ── Mapare nume județ → cod (pentru integrare cu building.county din Step1) ──

export function countyNameToCode(name) {
  if (!name) return null;
  const norm = name.trim().toLowerCase()
    .replace(/ș/g, "s").replace(/ț/g, "t").replace(/ă/g, "a").replace(/â/g, "a").replace(/î/g, "i");
  for (const [code, data] of Object.entries(COUNTY_AVERAGES)) {
    const dataNorm = data.label.toLowerCase()
      .replace(/ș/g, "s").replace(/ț/g, "t").replace(/ă/g, "a").replace(/â/g, "a").replace(/î/g, "i");
    if (dataNorm === norm) return code;
  }
  // Fallback: caută parțial
  for (const [code, data] of Object.entries(COUNTY_AVERAGES)) {
    const dataNorm = data.label.toLowerCase()
      .replace(/ș/g, "s").replace(/ț/g, "t").replace(/ă/g, "a").replace(/â/g, "a").replace(/î/g, "i");
    if (dataNorm.startsWith(norm) || norm.startsWith(dataNorm)) return code;
  }
  return null;
}

// ── Mapare categorie clădire Mc 001 → tip benchmark ────────────────────────

export function categoryToBenchmarkType(category) {
  const map = {
    RI: "rezidential_bloc", RC: "rezidential_casa", RA: "rezidential_bloc",
    BI: "birouri", CO: "comercial", ED: "educational",
    SA: "spital", HC: "hotelier", SP: "industrial_usor",
    AL: "rezidential_bloc",
  };
  return map[category] || "rezidential_bloc";
}
