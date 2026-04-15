// Mapping categorii interne Zephren → nomenclator oficial Anexa 6, Ord. MDLPA 348/2026
// Sursa: Ordinul Ministerului Dezvoltării, Lucrărilor Publice și Administrației nr. 348/2026

export const CATEGORY_TO_ANEXA6 = {
  RI: { tip: "Rezidențial", subtip: "unifamilial" },
  RC: { tip: "Rezidențial", subtip: "multietajată" },
  RA: { tip: "Rezidențial", subtip: "apartament" },
  BI: { tip: "Nerezidențial", subtip: "administrativ" },
  ED: { tip: "Nerezidențial", subtip: "învățământ" },
  SA: { tip: "Nerezidențial", subtip: "sănătate" },
  HC: { tip: "Nerezidențial", subtip: "comercial" },
  CO: { tip: "Nerezidențial", subtip: "comercial" },
  SP: { tip: "Nerezidențial", subtip: "sport" },
  AL: { tip: "Rezidențial/Nerezidențial", subtip: "alta" },
};

/**
 * Funcție helper pentru prelucrare și export registru
 * @param {string} categoryCode - Codul categorie internă (RI, RC, RA, etc.)
 * @returns {object} Obiecul cu tip și subtip conform Anexa 6
 */
export function getCategoryLabel(categoryCode) {
  const mapping = CATEGORY_TO_ANEXA6[categoryCode];
  if (!mapping) return { tip: "Nerezidențial", subtip: "alta" };
  return mapping;
}

/**
 * Lista completă de categorii conform Anexa 6 pentru dropdown-uri
 * Utilizat în formularele de colectare și export date audit
 */
export const ANEXA6_CATEGORIES = {
  rezidential: ["unifamilial", "multietajată", "apartament", "alta"],
  nerezidential: [
    "administrativ",
    "învățământ",
    "sănătate",
    "cultură",
    "sport",
    "comercial",
    "alta",
  ],
};
