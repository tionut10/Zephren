/**
 * thermalColor.js — Mapare U-value → culoare pentru vizualizarea termică.
 *
 * Două moduri:
 *   1. "continuous" — gradient HSL albastru (240°, rece) → roșu (0°, cald)
 *      Stil termografie reală. Domeniul normalizat [U_MIN, U_MAX].
 *
 *   2. "discrete" — 5 trepte aliniate cu referința nZEB (Mc 001-2022, C107).
 *      emerald (excelent) · sky (bun) · amber (limită) · orange (slab) · red (necorespunzător).
 *
 * Funcții pure — fără dependențe React, importabile în teste Vitest.
 */

// ── Domeniu U pentru normalizare gradient continuu ───────────────────────────
export const U_MIN = 0.10;   // perete super-izolat (vată 40cm, panou SIP)
export const U_MAX = 2.50;   // zid masiv neizolat / vitraj simplu

// ── Praguri trepte nZEB pentru pereți exteriori (rezidențial Mc 001-2022) ────
// Scalabile per tip element (PE/PT/PP/PL/PB) prin tabelul U_REF din wizardOpaqueCalc.js
const NZEB_STEPS = [
  { max: 0.20, hex: "#10b981", label: "Excelent (nZEB)", tw: "emerald-500" },
  { max: 0.35, hex: "#0ea5e9", label: "Bun",              tw: "sky-500"     },
  { max: 0.60, hex: "#f59e0b", label: "Limită",           tw: "amber-500"   },
  { max: 1.00, hex: "#f97316", label: "Slab",             tw: "orange-500"  },
  { max: Infinity, hex: "#dc2626", label: "Necorespunzător", tw: "red-600" },
];

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/**
 * Interpolare liniară 240° (albastru) → 0° (roșu).
 * @param {number} u - U-value în W/(m²·K)
 * @returns {string} HSL color string
 */
function uToHslContinuous(u) {
  if (!Number.isFinite(u) || u <= 0) return "hsl(220, 15%, 40%)"; // gri pentru U invalid
  const t = clamp((u - U_MIN) / (U_MAX - U_MIN), 0, 1);
  const hue = 240 - 240 * t;
  return `hsl(${hue.toFixed(1)}, 78%, 55%)`;
}

/**
 * Selectează treapta nZEB corespunzătoare.
 * @param {number} u - U-value
 * @returns {Object} { hex, label, tw }
 */
function uToStepDiscrete(u) {
  if (!Number.isFinite(u) || u <= 0) {
    return { hex: "#64748b", label: "Necalculat", tw: "slate-500" };
  }
  return NZEB_STEPS.find(s => u <= s.max) ?? NZEB_STEPS[NZEB_STEPS.length - 1];
}

/**
 * Returnează o culoare CSS pentru o valoare U și modul curent.
 * @param {number} u                       - U-value în W/(m²·K)
 * @param {"continuous"|"discrete"} mode   - Paleta aleasă de utilizator
 * @returns {string} CSS color (hsl() sau hex)
 */
export function uToColor(u, mode = "continuous") {
  if (mode === "discrete") return uToStepDiscrete(u).hex;
  return uToHslContinuous(u);
}

/**
 * Returnează label descriptiv (pentru tooltip/legendă) în modul discrete.
 * @param {number} u
 * @returns {string}
 */
export function uToLabel(u) {
  return uToStepDiscrete(u).label;
}

/**
 * Returnează treptele nZEB pentru construirea legendei discrete.
 * @returns {Array<{max:number, hex:string, label:string, tw:string}>}
 */
export function getNZEBSteps() {
  return NZEB_STEPS.map(s => ({ ...s }));
}

/**
 * Construiește opriri de gradient pentru legenda continuă (SVG).
 * @param {number} nStops - Numărul de stopuri (default 7)
 * @returns {Array<{offset:string, color:string, u:number}>}
 */
export function getContinuousStops(nStops = 7) {
  const stops = [];
  for (let i = 0; i < nStops; i++) {
    const t = i / (nStops - 1);
    const u = U_MIN + t * (U_MAX - U_MIN);
    stops.push({
      offset: `${(t * 100).toFixed(0)}%`,
      color: uToHslContinuous(u),
      u,
    });
  }
  return stops;
}

/**
 * Intensitate (0..1) pentru punți termice — proporțională cu ψ·L relative la maxim din set.
 * @param {number} psiL       - Produs ψ × L pentru punte
 * @param {number} maxPsiL    - Maxim din setul curent (pentru normalizare)
 * @returns {number} 0..1
 */
export function psiLIntensity(psiL, maxPsiL) {
  if (!Number.isFinite(psiL) || psiL <= 0 || maxPsiL <= 0) return 0;
  return clamp(psiL / maxPsiL, 0, 1);
}

/**
 * Culoare pentru o punte termică (roșu cu opacitate ajustată de intensitate).
 * @param {number} intensity - 0..1
 * @returns {string} CSS color
 */
export function bridgeColor(intensity) {
  const alpha = 0.35 + 0.65 * clamp(intensity, 0, 1);
  return `rgba(239, 68, 68, ${alpha.toFixed(2)})`; // red-500 cu alpha
}

/**
 * Calculează fluxul termic al unui element: Q = U · A · ΔT (W).
 * @param {number} U     - Transmitanța W/(m²·K)
 * @param {number} area  - Aria în m²
 * @param {number} dT    - ΔT = T_int − T_ext în K
 * @returns {number} Q în W (≥0)
 */
export function heatFlow(U, area, dT) {
  if (!Number.isFinite(U) || !Number.isFinite(area) || !Number.isFinite(dT)) return 0;
  return Math.max(0, U * area * dT);
}

/**
 * Calculează fluxul unei punți termice: Q = ψ · L · ΔT (W).
 * @param {number} psi    - ψ în W/(m·K)
 * @param {number} length - Lungime în m
 * @param {number} dT     - ΔT în K
 * @returns {number} Q în W
 */
export function bridgeFlow(psi, length, dT) {
  if (!Number.isFinite(psi) || !Number.isFinite(length) || !Number.isFinite(dT)) return 0;
  return Math.max(0, psi * length * dT);
}
