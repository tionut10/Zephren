/**
 * Tarife energie România — surse ANRE, OPCOM, furnizori 2025
 * Actualizat: Q1 2025
 * Unitate: RON/kWh (pentru gaz și termoficare se convertesc din RON/MWh sau RON/Gcal)
 */

export const ENERGY_PRICE_PRESETS = [
  {
    id: "casnic_2025",
    label: "Casnic reglementat 2025",
    sublabel: "ANRE tarife casnice Q1 2025",
    icon: "🏠",
    color: "emerald",
    prices: {
      gaz: 0.31,           // ~0.31 RON/kWh (tarif reglementat casnic, inc. transport + distribuție)
      electricitate: 1.29,  // ~1.29 RON/kWh (tarif casnic reglementat ANRE plafon)
      gpl: 1.58,            // ~1.58 RON/kWh (GPL butelie/rezervor)
      motorina: 1.22,       // ~1.22 RON/kWh (echivalent termic gasoil)
      carbune: 0.24,        // ~0.24 RON/kWh (cărbune huilă, livrare)
      biomasa: 0.21,        // ~0.21 RON/kWh (peleți vrac, certificat)
      lemn_foc: 0.17,       // ~0.17 RON/kWh (lemn de foc uscat, m³ → kWh)
      termoficare: 0.44,    // ~0.44 RON/kWh (Gcal → kWh, tarif RADET/CET mediu)
    },
  },
  {
    id: "imm_2025",
    label: "IMM / Comercial 2025",
    sublabel: "Tarife negociate, consum mediu",
    icon: "🏢",
    color: "blue",
    prices: {
      gaz: 0.28,
      electricitate: 0.92,
      gpl: 1.52,
      motorina: 1.18,
      carbune: 0.22,
      biomasa: 0.20,
      lemn_foc: 0.16,
      termoficare: 0.41,
    },
  },
  {
    id: "industrial_2025",
    label: "Industrial 2025",
    sublabel: "Consum mare, tarif spot/indexat",
    icon: "🏭",
    color: "amber",
    prices: {
      gaz: 0.24,
      electricitate: 0.75,
      gpl: 1.45,
      motorina: 1.14,
      carbune: 0.20,
      biomasa: 0.18,
      lemn_foc: 0.15,
      termoficare: 0.38,
    },
  },
  {
    id: "maxim_2024",
    label: "Vârf criză 2022–2023",
    sublabel: "Prețuri de referință criză energetică",
    icon: "📈",
    color: "red",
    prices: {
      gaz: 0.58,
      electricitate: 2.10,
      gpl: 2.20,
      motorina: 1.65,
      carbune: 0.45,
      biomasa: 0.38,
      lemn_foc: 0.28,
      termoficare: 0.72,
    },
  },
];

// Mapare combustibil → cheie preț (din FUELS în constants.js)
export const FUEL_PRICE_KEY = {
  gaz:         "gaz",
  gpl:         "gpl",
  electricitate: "electricitate",
  motorina:    "motorina",
  carbune:     "carbune",
  biomasa:     "biomasa",
  lemn_foc:    "lemn_foc",
  termoficare: "termoficare",
  termoficare_sursa: "termoficare",
  // fallback-uri
  default:     "gaz",
};

// Prețuri implicite (RON/kWh) — folosite la init
export const DEFAULT_ENERGY_PRICES = {
  gaz: 0.31,
  electricitate: 1.29,
  gpl: 1.58,
  motorina: 1.22,
  carbune: 0.24,
  biomasa: 0.21,
  lemn_foc: 0.17,
  termoficare: 0.44,
};

// Etichete afișare
export const PRICE_LABELS = {
  gaz:           "Gaz natural",
  electricitate: "Electricitate",
  gpl:           "GPL (propan)",
  motorina:      "Motorină/Gasoil",
  carbune:       "Cărbune",
  biomasa:       "Biomasă/Peleți",
  lemn_foc:      "Lemn de foc",
  termoficare:   "Termoficare",
};

export const PRICE_ICONS = {
  gaz:           "🔵",
  electricitate: "⚡",
  gpl:           "🟡",
  motorina:      "🟤",
  carbune:       "⚫",
  biomasa:       "🟢",
  lemn_foc:      "🪵",
  termoficare:   "♨️",
};
