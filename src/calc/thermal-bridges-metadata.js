/**
 * thermal-bridges-metadata.js — Metadate citabile pentru catalogul punți termice
 *
 * Extinde catalogul existent (thermal-bridges.json, 165 tipologii) cu:
 *   - ID-uri deterministe (TB-WJ-001, TB-W-002, etc.)
 *   - Referințe normative citabile (SR EN ISO 14683:2017, Mc 001-2022, PHI, etc.)
 *   - Clasă ISO 14683 (A=Passivhaus, B=bună, C=acceptabilă, D=implicit)
 *   - Intervale ψ_min / ψ_typical / ψ_max validate cruce-surse
 *   - Nume englezești pentru export multilingv
 *
 * Referințe principale:
 *   - SR EN ISO 14683:2017 — Metode simplificate și valori implicite
 *   - SR EN ISO 10211:2017 — Calcule detaliate ψ2D și χ
 *   - Mc 001-2022 Anexa B — Evaluarea punților în auditul energetic
 *   - PHI Passipedia + PHPP Window Installation Thermal Bridges Catalogue v2.0
 *   - Schöck Isokorb / Halfen HIT / Leviat Ancon Isotec — date producător
 */

import BRIDGES_DB from "../data/thermal-bridges.json";
import META from "../data/thermal-bridges-metadata.json";

// ── Constante publice ────────────────────────────────────────────────────────

export const ISO_14683_CLASSES = META._meta.iso_14683_classes;
export const PRIMARY_REFERENCES = META._meta.primary_references;
export const CROSS_SOURCE_DATABASES = META._meta.cross_source_databases;

/**
 * Pragurile ISO 14683 folosite la clasificarea automată a unei valori ψ.
 * Scale: clasa A ≤ 0.01, B ≤ 0.05, C ≤ 0.15, D > 0.15
 */
export const ISO_CLASS_THRESHOLDS = Object.freeze({
  A: 0.01,
  B: 0.05,
  C: 0.15,
});

// ── Helpere ID-uri deterministe ─────────────────────────────────────────────

const CATEGORY_PREFIX = {
  "Joncțiuni pereți": "WJ",
  "Ferestre": "W",
  "Balcoane": "B",
  "Acoperiș": "R",
  "Stâlpi/grinzi": "CB",
  "Instalații": "SV",
  "Fundații și subsol": "F",
  "Structuri din lemn": "TM",
  "Structuri prefabricate": "PC",
  "Fațade și ferestre avansate": "FA",
  "Acoperiș avansat": "RA",
  "Balcoane avansate": "BA",
  "Sisteme ETICS": "ET",
  "Elemente punctuale (chi)": "CH",
  "Instalații avansate": "SA",
  "Joncțiuni pereți – tipuri speciale": "WS",
  "Ferestre și uși – tipuri speciale": "WSX",
  "Balcoane și logii – tipuri speciale": "BS",
  "Acoperiș – tipuri speciale": "RS",
  "Structuri speciale": "SS",
  "Instalații – tipuri speciale": "SVS",
  "Joncțiuni speciale": "SPX",
};

/**
 * Returnează ID-ul determinist pentru o punte termică din catalog.
 * Dacă există metadate explicite → folosește ID-ul definit;
 * altfel generează hash simplu pe baza numelui și categoriei (format: TB-<PREFIX>-HHHH).
 *
 * @param {string} name - numele punții (din thermal-bridges.json)
 * @returns {string} ID de forma "TB-WJ-001" sau "TB-WJ-a1f3"
 */
export function getBridgeId(name) {
  if (!name || typeof name !== "string") return "TB-UNKNOWN";
  if (META.entries[name]?.id) return META.entries[name].id;

  const entry = BRIDGES_DB.find(b => b.name === name);
  const prefix = entry ? (CATEGORY_PREFIX[entry.cat] || "X") : "X";

  // Hash simplu FNV-1a pe nume (4 hex chars = 65k distinct values)
  let h = 0x811c9dc5;
  for (let i = 0; i < name.length; i++) {
    h ^= name.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  const hex = ((h >>> 0) & 0xffff).toString(16).padStart(4, "0");
  return `TB-${prefix}-${hex}`;
}

// ── Sursă & nume englezesc ──────────────────────────────────────────────────

/**
 * Returnează sursa normativă citabilă pentru o punte termică.
 * Cascadă: metadate per-intrare → metadate per-categorie → fallback ISO 14683 general.
 *
 * @param {string} name
 * @returns {string} referința sursă
 */
export function getBridgeSource(name) {
  const entryMeta = META.entries[name];
  if (entryMeta?.source) return entryMeta.source;

  const entry = BRIDGES_DB.find(b => b.name === name);
  if (entry) {
    const catMeta = META.categories[entry.cat];
    if (catMeta?.reference) return catMeta.reference;
  }
  return "SR EN ISO 14683:2017 (valoare implicită); Mc 001-2022 Anexa B";
}

/**
 * Returnează numele englezesc al unei punți (pentru export EN, UI multilingv).
 * Dacă nu există mapping explicit, întoarce null.
 *
 * @param {string} name
 * @returns {string|null}
 */
export function getBridgeEnglishName(name) {
  return META.entries[name]?.name_en || null;
}

// ── Clasificare ISO 14683 ───────────────────────────────────────────────────

/**
 * Clasifică o valoare ψ după ISO 14683 (A=Passivhaus, B=bună, C=acceptabilă, D=implicit).
 * Pentru ψ negativ → A (efect favorabil geometric).
 *
 * @param {number} psi - valoare ψ [W/(m·K)]
 * @returns {"A"|"B"|"C"|"D"}
 */
export function classifyIsoLevel(psi) {
  const n = Number(psi);
  if (!Number.isFinite(n)) return "D";
  const abs = Math.abs(n);
  if (n < 0) return "A";
  if (abs <= ISO_CLASS_THRESHOLDS.A) return "A";
  if (abs <= ISO_CLASS_THRESHOLDS.B) return "B";
  if (abs <= ISO_CLASS_THRESHOLDS.C) return "C";
  return "D";
}

// ── Validare interval ψ ─────────────────────────────────────────────────────

/**
 * Validează o valoare ψ contra intervalului [psi_min, psi_max] din metadate.
 * Dacă nu există metadate cu interval, returnează null (= nu se poate valida).
 *
 * @param {string} name
 * @param {number} psi
 * @returns {{ inRange: boolean, below: boolean, above: boolean,
 *             min: number, typical: number, max: number, class: string } | null}
 */
export function validatePsiRange(name, psi) {
  const m = META.entries[name];
  if (!m || typeof m.psi_min !== "number" || typeof m.psi_max !== "number") return null;
  const n = Number(psi);
  if (!Number.isFinite(n)) return null;
  return {
    inRange: n >= m.psi_min && n <= m.psi_max,
    below: n < m.psi_min,
    above: n > m.psi_max,
    min: m.psi_min,
    typical: m.psi_typical,
    max: m.psi_max,
    class: m.iso_class || classifyIsoLevel(n),
  };
}

// ── Validare cruce-surse ────────────────────────────────────────────────────

/**
 * Returnează lista surselor externe cu care valoarea a fost validată cruce.
 *
 * @param {string} name
 * @returns {string[]}
 */
export function getCrossSourceValidation(name) {
  return META.entries[name]?.validated_against || [];
}

// ── Agregator enriched bridge ───────────────────────────────────────────────

/**
 * Combină o intrare din catalog (thermal-bridges.json) cu metadatele
 * corespunzătoare (thermal-bridges-metadata.json) într-un obiect îmbogățit.
 *
 * @param {string} name
 * @returns {object|null} intrare cu câmpurile: id, name, cat, psi, psi_izolat,
 *   desc, detail + metadata: { source, iso_class, name_en, psi_min, psi_typical,
 *   psi_max, validated_against, iso_14683_type }
 */
export function getEnrichedBridge(name) {
  const base = BRIDGES_DB.find(b => b.name === name);
  if (!base) return null;

  const m = META.entries[name] || {};
  const catMeta = META.categories[base.cat] || {};

  return {
    ...base,
    id: getBridgeId(name),
    metadata: {
      source: m.source || catMeta.reference || "SR EN ISO 14683:2017",
      iso_class: m.iso_class || classifyIsoLevel(base.psi_izolat ?? base.psi),
      iso_14683_type: m.iso_14683_type || (catMeta.iso_14683_types?.[0] ?? null),
      name_en: m.name_en || null,
      psi_min: m.psi_min ?? null,
      psi_typical: m.psi_typical ?? null,
      psi_max: m.psi_max ?? null,
      validated_against: m.validated_against || [],
      notes: m.notes || null,
      category_en: catMeta.category_en || null,
    },
  };
}

/**
 * Aceeași operație pe întreaga listă de intrări din catalog.
 * @returns {Array} catalog îmbogățit complet
 */
export function getAllEnrichedBridges() {
  return BRIDGES_DB.map(b => getEnrichedBridge(b.name));
}

/**
 * Numărul de intrări din catalog care au metadate detaliate per-entry.
 * Utilizată pentru raportare acoperire.
 *
 * @returns {{ total: number, withFullMeta: number, coveragePct: number }}
 */
export function getMetadataCoverage() {
  const total = BRIDGES_DB.length;
  const withFullMeta = BRIDGES_DB.filter(b => META.entries[b.name]).length;
  return {
    total,
    withFullMeta,
    coveragePct: Math.round((withFullMeta / total) * 1000) / 10,
  };
}
