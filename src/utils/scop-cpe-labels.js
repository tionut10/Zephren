/**
 * scop-cpe-labels.js — S30A·A15
 *
 * Mapare unificată scopCpe key → label uman pentru documente CPE.
 *
 * Cheile acceptate:
 *   - "vanzare"          → Tranzacție — vânzare
 *   - "inchiriere"       → Tranzacție — închiriere
 *   - "receptie"         → Recepție clădire nouă
 *   - "renovare"         → Renovare majoră (alias scurt)
 *   - "renovare_majora"  → Renovare majoră (alias explicit, folosit în demo)
 *   - "informare"        → Informare proprietar
 *   - "alt"              → Alt scop
 *
 * Bug pre-S30A: demoProjects.js folosea "renovare_majora" iar generatoarele
 * mapau doar "renovare" → "Renovare majoră". Documentele afișau fallback
 * incorect "Vânzare" pentru demo-urile M2/M3 cu renovări.
 */

export const SCOP_LABELS = {
  receptie:        "Recepție clădire nouă",
  renovare:        "Renovare majoră",
  renovare_majora: "Renovare majoră",
  vanzare:         "Tranzacție — vânzare",
  inchiriere:      "Tranzacție — închiriere",
  informare:       "Informare proprietar",
  alt:             "Alt scop",
};

/**
 * Returnează label uman pentru scopCpe. Fallback "Vânzare" pentru chei necunoscute.
 * @param {string} key - cheia scopCpe
 * @returns {string}
 */
export function getScopLabel(key) {
  return SCOP_LABELS[key] || SCOP_LABELS.vanzare;
}

/** Verdict: scopul implică o renovare majoră (orice variantă)? */
export function isRenovationScope(key) {
  return key === "renovare" || key === "renovare_majora";
}
